import asyncio
import json

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from .ai import (
    AnalysisError,
    MockTenderAnalyzer,
    OpenAITenderAnalyzer,
    merge_chunk_extractions,
)
from .config import get_settings
from .models import CompanyProfile, HealthResponse, TenderAnalysis
from .pdf import PdfValidationError, chunk_pages, extract_pdf_pages

settings = get_settings()
app = FastAPI(title=settings.app_name, version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        mock_mode=settings.effective_mock_mode,
        model=settings.openai_model,
    )


@app.post("/api/analyze", response_model=TenderAnalysis)
async def analyze_tender(
    file: UploadFile = File(...),
    profile_json: str = Form(...),
) -> TenderAnalysis:
    if file.content_type not in {"application/pdf", "application/x-pdf"}:
        raise HTTPException(status_code=415, detail="Only PDF files are supported.")

    try:
        profile = CompanyProfile.model_validate(json.loads(profile_json))
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=422, detail="profile_json is not valid JSON.") from exc
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors()) from exc

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="The uploaded PDF is empty.")
    if len(data) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail=f"The file exceeds the {settings.max_upload_mb} MB limit.",
        )

    try:
        parsed = extract_pdf_pages(data, settings.max_pages)
        chunks, truncated, processed_pages = chunk_pages(
            parsed.pages,
            settings.chunk_character_limit,
            settings.max_chunks,
        )
    except PdfValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    warnings = list(parsed.warnings)
    if truncated:
        warnings.append(
            "The document exceeded the MVP processing limit, so later pages were not analyzed."
        )

    analyzer = (
        MockTenderAnalyzer()
        if settings.effective_mock_mode
        else OpenAITenderAnalyzer(settings)
    )

    try:
        # A small concurrency limit avoids flooding the model API on long documents.
        semaphore = asyncio.Semaphore(3)

        async def extract_with_limit(chunk: str):
            async with semaphore:
                return await analyzer.extract_chunk(chunk)

        extracted_chunks = await asyncio.gather(
            *(extract_with_limit(chunk) for chunk in chunks)
        )
        merged = merge_chunk_extractions(extracted_chunks)
        return await analyzer.finalize(
            merged,
            profile,
            pages_analyzed=processed_pages,
            warnings=warnings,
        )
    except AnalysisError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
