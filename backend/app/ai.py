import json
import re
from collections.abc import Iterable

from openai import AsyncOpenAI

from .config import Settings
from .models import (
    ChecklistItem,
    ChunkExtraction,
    Citation,
    CompanyProfile,
    ExtractedRequirement,
    ExtractedRisk,
    Recommendation,
    RequirementAssessment,
    RequirementStatus,
    TenderAnalysis,
)
from .prompts import EXTRACTION_SYSTEM_PROMPT, FINAL_ANALYSIS_SYSTEM_PROMPT


class AnalysisError(RuntimeError):
    pass


def _normalized(value: str | None) -> str:
    return re.sub(r"\s+", " ", (value or "").strip()).casefold()


def _first_nonempty(values: Iterable[str | None], fallback: str) -> str:
    for value in values:
        if value and value.strip():
            return value.strip()
    return fallback


def _first_number(values: Iterable[float | None]) -> float | None:
    return next((value for value in values if value is not None), None)


def _merge_citations(existing: list[Citation], incoming: list[Citation]) -> list[Citation]:
    seen = {(citation.page, _normalized(citation.quote)) for citation in existing}
    merged = list(existing)
    for citation in incoming:
        key = (citation.page, _normalized(citation.quote))
        if key not in seen:
            merged.append(citation)
            seen.add(key)
    return merged[:5]


def _merge_requirements(items: Iterable[ExtractedRequirement]) -> list[ExtractedRequirement]:
    merged: dict[str, ExtractedRequirement] = {}
    for item in items:
        key = _normalized(item.name)
        if not key:
            continue
        if key in merged:
            merged[key].mandatory = merged[key].mandatory or item.mandatory
            merged[key].citations = _merge_citations(
                merged[key].citations, item.citations
            )
        else:
            merged[key] = item.model_copy(deep=True)
    return list(merged.values())


def _merge_risks(items: Iterable[ExtractedRisk]) -> list[ExtractedRisk]:
    severity_rank = {"low": 1, "medium": 2, "high": 3}
    merged: dict[str, ExtractedRisk] = {}
    for item in items:
        key = _normalized(item.risk)
        if not key:
            continue
        if key in merged:
            if severity_rank[item.severity] > severity_rank[merged[key].severity]:
                merged[key].severity = item.severity
            merged[key].citations = _merge_citations(
                merged[key].citations, item.citations
            )
        else:
            merged[key] = item.model_copy(deep=True)
    return list(merged.values())


def merge_chunk_extractions(chunks: list[ChunkExtraction]) -> ChunkExtraction:
    all_requirements = [item for chunk in chunks for item in chunk.requirements]
    all_documents = [item for chunk in chunks for item in chunk.required_documents]
    all_risks = [item for chunk in chunks for item in chunk.disqualification_risks]

    summary_points: list[str] = []
    seen_points: set[str] = set()
    for chunk in chunks:
        for point in chunk.summary_points:
            key = _normalized(point)
            if key and key not in seen_points:
                summary_points.append(point)
                seen_points.add(key)

    return ChunkExtraction(
        tender_name=_first_nonempty(
            (chunk.tender_name for chunk in chunks), "Untitled opportunity"
        ),
        entity=_first_nonempty(
            (chunk.entity for chunk in chunks), "Entity not identified"
        ),
        procedure_type=next(
            (chunk.procedure_type for chunk in chunks if chunk.procedure_type), None
        ),
        estimated_value=_first_number(chunk.estimated_value for chunk in chunks),
        currency=next((chunk.currency for chunk in chunks if chunk.currency), None),
        deadline=next((chunk.deadline for chunk in chunks if chunk.deadline), None),
        location=next((chunk.location for chunk in chunks if chunk.location), None),
        summary_points=summary_points[:12],
        requirements=_merge_requirements(all_requirements),
        required_documents=_merge_requirements(all_documents),
        disqualification_risks=_merge_risks(all_risks),
    )


class OpenAITenderAnalyzer:
    def __init__(self, settings: Settings):
        if not settings.openai_api_key:
            raise AnalysisError("OPENAI_API_KEY is required when mock mode is disabled.")
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_model

    async def extract_chunk(self, chunk: str) -> ChunkExtraction:
        try:
            response = await self.client.responses.parse(
                model=self.model,
                instructions=EXTRACTION_SYSTEM_PROMPT,
                input=[
                    {
                        "role": "user",
                        "content": (
                            "Extract tender facts, requirements, required documents, "
                            "and disqualification risks from these pages:\n\n" + chunk
                        ),
                    }
                ],
                text_format=ChunkExtraction,
            )
        except Exception as exc:
            raise AnalysisError(f"AI extraction failed: {exc}") from exc

        if response.output_parsed is None:
            raise AnalysisError("The model did not return a structured extraction.")
        return response.output_parsed

    async def finalize(
        self,
        extraction: ChunkExtraction,
        profile: CompanyProfile,
        pages_analyzed: int,
        warnings: list[str],
    ) -> TenderAnalysis:
        payload = {
            "company_profile": profile.model_dump(),
            "extracted_tender_evidence": extraction.model_dump(),
            "pages_analyzed": pages_analyzed,
            "document_warnings": warnings,
        }

        try:
            response = await self.client.responses.parse(
                model=self.model,
                instructions=FINAL_ANALYSIS_SYSTEM_PROMPT,
                input=[
                    {
                        "role": "user",
                        "content": (
                            "Produce the final TenderFit report from this JSON:\n\n"
                            + json.dumps(payload, ensure_ascii=False)
                        ),
                    }
                ],
                text_format=TenderAnalysis,
            )
        except Exception as exc:
            raise AnalysisError(f"AI comparison failed: {exc}") from exc

        if response.output_parsed is None:
            raise AnalysisError("The model did not return a structured final report.")

        analysis = response.output_parsed
        analysis.pages_analyzed = pages_analyzed
        analysis.document_warnings = warnings
        analysis.mock_mode = False
        return _enforce_recommendation_guardrails(analysis)


class MockTenderAnalyzer:
    async def extract_chunk(self, chunk: str) -> ChunkExtraction:
        pages = [int(value) for value in re.findall(r"--- PAGE (\d+) ---", chunk)]
        page = pages[0] if pages else 1
        amount_match = re.search(
            r"(?:S/\.?|USD|US\$|\$)\s*([\d.,]+)", chunk, flags=re.IGNORECASE
        )
        amount: float | None = None
        if amount_match:
            raw = amount_match.group(1).replace(" ", "")
            if raw.count(",") == 1 and raw.count(".") == 0:
                raw = raw.replace(",", ".")
            else:
                raw = raw.replace(",", "")
            try:
                amount = float(raw)
            except ValueError:
                amount = None

        quote = re.sub(r"\s+", " ", chunk)[:260]
        return ChunkExtraction(
            tender_name="Mock tender analysis",
            entity="Entity to be verified",
            estimated_value=amount,
            currency="PEN" if "S/" in chunk else None,
            summary_points=[
                "Mock mode is active; add an API key for evidence-based AI extraction."
            ],
            requirements=[
                ExtractedRequirement(
                    name="Verify documented relevant experience",
                    category="experience",
                    mandatory=True,
                    citations=[Citation(page=page, quote=quote or "Document text")],
                ),
                ExtractedRequirement(
                    name="Verify all required declarations and forms",
                    category="documents",
                    mandatory=True,
                    citations=[Citation(page=page, quote=quote or "Document text")],
                ),
            ],
            disqualification_risks=[
                ExtractedRisk(
                    risk="A mandatory document may be missing or incomplete.",
                    severity="high",
                    citations=[Citation(page=page, quote=quote or "Document text")],
                )
            ],
        )

    async def finalize(
        self,
        extraction: ChunkExtraction,
        profile: CompanyProfile,
        pages_analyzed: int,
        warnings: list[str],
    ) -> TenderAnalysis:
        experience_text = _normalized(profile.previous_contract_experience)
        certification_text = _normalized(profile.certifications)
        has_experience = len(experience_text) > 20
        has_certifications = len(certification_text) > 5

        statuses = [
            RequirementAssessment(
                requirement=extraction.requirements[0].name,
                category="experience",
                mandatory=True,
                status=(RequirementStatus.MET if has_experience else RequirementStatus.UNCLEAR),
                reason=(
                    "The profile describes prior contract experience. Verify that it meets the tender's exact similarity and value thresholds."
                    if has_experience
                    else "The company profile does not contain enough prior-contract detail."
                ),
                citations=extraction.requirements[0].citations,
            ),
            RequirementAssessment(
                requirement=extraction.requirements[1].name,
                category="documents",
                mandatory=True,
                status=RequirementStatus.UNCLEAR,
                reason="The uploaded company profile does not include a document inventory.",
                citations=extraction.requirements[1].citations,
            ),
        ]

        score = 64 + (8 if has_experience else 0) + (4 if has_certifications else 0)
        warning_list = list(warnings)
        warning_list.insert(
            0,
            "Mock mode is active. The displayed requirements are placeholders, not a real tender interpretation.",
        )

        return TenderAnalysis(
            tender_name=extraction.tender_name or "Mock tender analysis",
            entity=extraction.entity or "Entity to be verified",
            summary=(
                "This report proves the upload and scoring workflow. Enable real AI mode "
                "before using it for an actual procurement decision."
            ),
            estimated_value=extraction.estimated_value,
            currency=extraction.currency,
            fit_score=min(score, 79),
            recommendation=Recommendation.REVIEW,
            recommendation_reason=(
                "The company may be a plausible fit, but the application must remain under review until real evidence extraction is enabled."
            ),
            requirements=statuses,
            risks=extraction.disqualification_risks,
            checklist=[
                ChecklistItem(
                    item="Enable real AI mode and rerun the analysis.",
                    priority="high",
                    citations=[],
                ),
                ChecklistItem(
                    item="Confirm similar-contract thresholds and prepare supporting evidence.",
                    priority="high",
                    citations=extraction.requirements[0].citations,
                ),
                ChecklistItem(
                    item="Create an inventory of all declarations, forms, and certificates.",
                    priority="medium",
                    citations=extraction.requirements[1].citations,
                ),
            ],
            document_warnings=warning_list,
            pages_analyzed=pages_analyzed,
            mock_mode=True,
        )


def _enforce_recommendation_guardrails(analysis: TenderAnalysis) -> TenderAnalysis:
    missing_mandatory = any(
        requirement.mandatory and requirement.status == RequirementStatus.MISSING
        for requirement in analysis.requirements
    )
    high_risk = any(risk.severity == "high" for risk in analysis.risks)

    if missing_mandatory and analysis.fit_score > 49:
        analysis.fit_score = 49
    if missing_mandatory and analysis.recommendation == Recommendation.APPLY:
        analysis.recommendation = Recommendation.DO_NOT_APPLY
    elif high_risk and analysis.recommendation == Recommendation.APPLY:
        analysis.recommendation = Recommendation.REVIEW
        analysis.fit_score = min(analysis.fit_score, 79)

    if analysis.fit_score >= 80 and analysis.recommendation != Recommendation.APPLY:
        analysis.fit_score = 79
    if analysis.fit_score < 50 and analysis.recommendation == Recommendation.APPLY:
        analysis.recommendation = Recommendation.REVIEW

    return analysis
