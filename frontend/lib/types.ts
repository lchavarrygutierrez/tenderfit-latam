export type Recommendation = "APPLY" | "REVIEW" | "DO_NOT_APPLY";
export type RequirementStatus = "MET" | "MISSING" | "UNCLEAR";

export interface CompanyProfile {
  company_name: string;
  industry: string;
  products_services: string;
  location: string;
  years_operating: number;
  previous_contract_experience: string;
  certifications: string;
  typical_project_size: number | null;
  maximum_project_size: number | null;
  employees: number | null;
}

export interface Citation {
  page: number;
  quote: string;
}

export interface RequirementAssessment {
  requirement: string;
  category: string;
  mandatory: boolean;
  status: RequirementStatus;
  reason: string;
  citations: Citation[];
}

export interface Risk {
  risk: string;
  severity: "high" | "medium" | "low";
  citations: Citation[];
}

export interface ChecklistItem {
  item: string;
  priority: "high" | "medium" | "low";
  citations: Citation[];
}

export interface TenderAnalysis {
  tender_name: string;
  entity: string;
  procedure_type: string | null;
  summary: string;
  estimated_value: number | null;
  currency: string | null;
  deadline: string | null;
  location: string | null;
  fit_score: number;
  recommendation: Recommendation;
  recommendation_reason: string;
  requirements: RequirementAssessment[];
  risks: Risk[];
  checklist: ChecklistItem[];
  document_warnings: string[];
  pages_analyzed: number;
  mock_mode: boolean;
}
