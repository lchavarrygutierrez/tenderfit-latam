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
app = FastAPI(title=settings.app_name, version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def _message(language: str, english: str, spanish: str) -> str:
    return spanish if language == "es" else english


def _localize_pdf_error(message: str, language: str) -> str:
    if language != "es":
        return message

    translations = {
        "The uploaded file is not a readable PDF.": "El archivo subido no es un PDF legible.",
        "The PDF contains no pages.": "El PDF no contiene páginas.",
        "Almost no text could be extracted. This appears to be a scanned PDF; OCR is required.": (
            "No se pudo extraer casi ningún texto. El documento parece ser un PDF escaneado y requiere OCR."
        ),
    }
    if message in translations:
        return translations[message]
    if message.startswith("The PDF has "):
        return message.replace("The PDF has", "El PDF tiene").replace(
            "pages; the current limit is", "páginas; el límite actual es"
        )
    return message


def _localize_warnings(warnings: list[str], language: str) -> list[str]:
    if language != "es":
        return warnings

    localized: list[str] = []
    for warning in warnings:
        if warning.startswith(
            "Some pages contain little or no extractable text and may require OCR:"
        ):
            pages = warning.split(":", 1)[1].strip()
            localized.append(
                "Algunas páginas contienen poco o ningún texto extraíble y podrían requerir OCR: "
                + pages
            )
        else:
            localized.append(warning)
    return localized


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "name": settings.app_name,
        "status": "running",
        "frontend": settings.frontend_origin,
        "docs": "/docs",
        "health": "/health",
    }


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
    language: str = Form("es"),
) -> TenderAnalysis:
    if language not in {"es", "en"}:
        raise HTTPException(status_code=422, detail="language must be 'es' or 'en'.")

    if file.content_type not in {"application/pdf", "application/x-pdf"}:
        raise HTTPException(
            status_code=415,
            detail=_message(
                language,
                "Only PDF files are supported.",
                "Solo se admiten archivos PDF.",
            ),
        )

    try:
        profile = CompanyProfile.model_validate(json.loads(profile_json))
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=422,
            detail=_message(
                language,
                "profile_json is not valid JSON.",
                "profile_json no contiene un JSON válido.",
            ),
        ) from exc
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors()) from exc

    data = await file.read()
    if not data:
        raise HTTPException(
            status_code=400,
            detail=_message(
                language,
                "The uploaded PDF is empty.",
                "El PDF subido está vacío.",
            ),
        )
    if len(data) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail=_message(
                language,
                f"The file exceeds the {settings.max_upload_mb} MB limit.",
                f"El archivo supera el límite de {settings.max_upload_mb} MB.",
            ),
        )

    try:
        parsed = extract_pdf_pages(data, settings.max_pages)
        chunks, truncated, processed_pages = chunk_pages(
            parsed.pages,
            settings.chunk_character_limit,
            settings.max_chunks,
        )
    except PdfValidationError as exc:
        raise HTTPException(
            status_code=422,
            detail=_localize_pdf_error(str(exc), language),
        ) from exc

    warnings = _localize_warnings(list(parsed.warnings), language)
    if truncated:
        warnings.append(
            _message(
                language,
                "The document exceeded the MVP processing limit, so later pages were not analyzed.",
                "El documento superó el límite de procesamiento del MVP, por lo que no se analizaron las páginas finales.",
            )
        )

    analyzer = (
        MockTenderAnalyzer()
        if settings.effective_mock_mode
        else OpenAITenderAnalyzer(settings)
    )

    try:
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
            language=language,
        )
    except AnalysisError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
