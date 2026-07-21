from enum import Enum

from pydantic import BaseModel, Field, field_validator


class Recommendation(str, Enum):
    APPLY = "APPLY"
    REVIEW = "REVIEW"
    DO_NOT_APPLY = "DO_NOT_APPLY"


class RequirementStatus(str, Enum):
    MET = "MET"
    MISSING = "MISSING"
    UNCLEAR = "UNCLEAR"


class CompanyProfile(BaseModel):
    company_name: str = Field(min_length=1, max_length=150)
    industry: str = Field(min_length=1, max_length=150)
    products_services: str = Field(min_length=1, max_length=2_000)
    location: str = Field(min_length=1, max_length=250)
    years_operating: float = Field(ge=0, le=200)
    previous_contract_experience: str = Field(default="", max_length=2_000)
    certifications: str = Field(default="", max_length=2_000)
    typical_project_size: float | None = Field(default=None, ge=0)
    maximum_project_size: float | None = Field(default=None, ge=0)
    employees: int | None = Field(default=None, ge=1, le=1_000_000)

    @field_validator("maximum_project_size")
    @classmethod
    def validate_maximum_project_size(cls, value: float | None, info):
        typical = info.data.get("typical_project_size")
        if value is not None and typical is not None and value < typical:
            raise ValueError("maximum_project_size must be at least typical_project_size")
        return value


class Citation(BaseModel):
    page: int = Field(ge=1)
    quote: str = Field(min_length=1, max_length=700)


class ExtractedRequirement(BaseModel):
    name: str = Field(min_length=1, max_length=500)
    category: str = Field(min_length=1, max_length=100)
    mandatory: bool
    citations: list[Citation] = Field(default_factory=list)


class ExtractedRisk(BaseModel):
    risk: str = Field(min_length=1, max_length=500)
    severity: str = Field(pattern="^(high|medium|low)$")
    citations: list[Citation] = Field(default_factory=list)


class ChunkExtraction(BaseModel):
    tender_name: str | None = None
    entity: str | None = None
    procedure_type: str | None = None
    estimated_value: float | None = Field(default=None, ge=0)
    currency: str | None = None
    deadline: str | None = None
    location: str | None = None
    summary_points: list[str] = Field(default_factory=list)
    requirements: list[ExtractedRequirement] = Field(default_factory=list)
    required_documents: list[ExtractedRequirement] = Field(default_factory=list)
    disqualification_risks: list[ExtractedRisk] = Field(default_factory=list)


class RequirementAssessment(BaseModel):
    requirement: str = Field(min_length=1, max_length=500)
    category: str = Field(min_length=1, max_length=100)
    mandatory: bool
    status: RequirementStatus
    reason: str = Field(min_length=1, max_length=1_000)
    citations: list[Citation] = Field(default_factory=list)


class ChecklistItem(BaseModel):
    item: str = Field(min_length=1, max_length=500)
    priority: str = Field(pattern="^(high|medium|low)$")
    citations: list[Citation] = Field(default_factory=list)


class TenderAnalysis(BaseModel):
    tender_name: str
    entity: str
    procedure_type: str | None = None
    summary: str
    estimated_value: float | None = Field(default=None, ge=0)
    currency: str | None = None
    deadline: str | None = None
    location: str | None = None
    fit_score: int = Field(ge=0, le=100)
    recommendation: Recommendation
    recommendation_reason: str
    requirements: list[RequirementAssessment] = Field(default_factory=list)
    risks: list[ExtractedRisk] = Field(default_factory=list)
    checklist: list[ChecklistItem] = Field(default_factory=list)
    document_warnings: list[str] = Field(default_factory=list)
    pages_analyzed: int = Field(ge=1)
    mock_mode: bool = False


class HealthResponse(BaseModel):
    status: str
    mock_mode: bool
    model: str
