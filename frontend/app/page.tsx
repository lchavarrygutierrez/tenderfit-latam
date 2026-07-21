"use client";

import { FormEvent, useMemo, useState } from "react";
import { analyzeTender } from "@/lib/api";
import type {
  Citation,
  CompanyProfile,
  Recommendation,
  RequirementStatus,
  TenderAnalysis,
} from "@/lib/types";

const initialProfile: CompanyProfile = {
  company_name: "",
  industry: "",
  products_services: "",
  location: "Peru",
  years_operating: 0,
  previous_contract_experience: "",
  certifications: "",
  typical_project_size: null,
  maximum_project_size: null,
  employees: null,
};

function recommendationLabel(value: Recommendation): string {
  if (value === "APPLY") return "Apply";
  if (value === "DO_NOT_APPLY") return "Do not apply";
  return "Review carefully";
}

function statusLabel(value: RequirementStatus): string {
  if (value === "MET") return "Met";
  if (value === "MISSING") return "Missing";
  return "Unclear";
}

function money(value: number | null, currency: string | null): string {
  if (value === null) return "Not identified";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency === "PEN" ? "PEN" : currency || "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function Citations({ citations }: { citations: Citation[] }) {
  if (!citations.length) return null;
  return (
    <details className="citations">
      <summary>{citations.length === 1 ? "View source" : "View sources"}</summary>
      <div className="citation-list">
        {citations.map((citation, index) => (
          <blockquote key={`${citation.page}-${index}`}>
            <strong>Page {citation.page}</strong>
            <span>“{citation.quote}”</span>
          </blockquote>
        ))}
      </div>
    </details>
  );
}

export default function Home() {
  const [profile, setProfile] = useState<CompanyProfile>(initialProfile);
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<TenderAnalysis | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(
    () =>
      Boolean(
        profile.company_name.trim() &&
          profile.industry.trim() &&
          profile.products_services.trim() &&
          profile.location.trim() &&
          file,
      ),
    [profile, file],
  );

  function setText(field: keyof CompanyProfile, value: string) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  function setNumber(field: keyof CompanyProfile, value: string) {
    setProfile((current) => ({
      ...current,
      [field]: value === "" ? null : Number(value),
    }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !canSubmit) return;

    setLoading(true);
    setError("");
    setAnalysis(null);
    try {
      setAnalysis(await analyzeTender(profile, file));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <header className="hero">
        <div className="brand">TenderFit <span>LATAM</span></div>
        <p className="eyebrow">PERU MVP</p>
        <h1>Know whether a public contract is worth pursuing.</h1>
        <p className="hero-copy">
          Upload the tender, describe your company, and receive a cited go/no-go report.
        </p>
      </header>

      <section className="workspace">
        <form className="panel form-panel" onSubmit={onSubmit}>
          <div className="section-heading">
            <span>1</span>
            <div>
              <h2>Company profile</h2>
              <p>Enough context to compare your business with the tender.</p>
            </div>
          </div>

          <div className="field-grid">
            <label>
              Company name
              <input
                required
                value={profile.company_name}
                onChange={(event) => setText("company_name", event.target.value)}
                placeholder="Mi Pyme Digital"
              />
            </label>
            <label>
              Industry
              <input
                required
                value={profile.industry}
                onChange={(event) => setText("industry", event.target.value)}
                placeholder="Software and digital services"
              />
            </label>
          </div>

          <label>
            Products and services
            <textarea
              required
              value={profile.products_services}
              onChange={(event) => setText("products_services", event.target.value)}
              placeholder="Describe what the company sells and delivers."
            />
          </label>

          <div className="field-grid three">
            <label>
              Location
              <input
                required
                value={profile.location}
                onChange={(event) => setText("location", event.target.value)}
              />
            </label>
            <label>
              Years operating
              <input
                required
                type="number"
                min="0"
                step="0.5"
                value={profile.years_operating}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    years_operating: Number(event.target.value),
                  }))
                }
              />
            </label>
            <label>
              Employees
              <input
                type="number"
                min="1"
                value={profile.employees ?? ""}
                onChange={(event) => setNumber("employees", event.target.value)}
                placeholder="Optional"
              />
            </label>
          </div>

          <label>
            Previous contract experience
            <textarea
              value={profile.previous_contract_experience}
              onChange={(event) =>
                setText("previous_contract_experience", event.target.value)
              }
              placeholder="Include similar work, clients, values, dates, and outcomes."
            />
          </label>

          <label>
            Certifications
            <textarea
              value={profile.certifications}
              onChange={(event) => setText("certifications", event.target.value)}
              placeholder="ISO, professional registrations, vendor credentials, or none."
            />
          </label>

          <div className="field-grid">
            <label>
              Typical project size
              <input
                type="number"
                min="0"
                value={profile.typical_project_size ?? ""}
                onChange={(event) => setNumber("typical_project_size", event.target.value)}
                placeholder="PEN"
              />
            </label>
            <label>
              Maximum project size
              <input
                type="number"
                min="0"
                value={profile.maximum_project_size ?? ""}
                onChange={(event) => setNumber("maximum_project_size", event.target.value)}
                placeholder="PEN"
              />
            </label>
          </div>

          <div className="section-heading upload-heading">
            <span>2</span>
            <div>
              <h2>Upload tender</h2>
              <p>Use a text-based PDF, up to 20 MB.</p>
            </div>
          </div>

          <label className="dropzone">
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <strong>{file ? file.name : "Choose a tender PDF"}</strong>
            <span>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "Click to browse"}</span>
          </label>

          <button type="submit" disabled={!canSubmit || loading}>
            {loading ? "Analyzing document…" : "Analyze opportunity"}
          </button>

          <p className="disclaimer">
            Decision support only. Always verify the official tender documents.
          </p>
          {error && <div className="error">{error}</div>}
        </form>

        <aside className="panel report-panel">
          {!analysis && !loading && (
            <div className="empty-state">
              <div className="score-placeholder">—</div>
              <h2>Your report will appear here</h2>
              <p>Fit score, requirements, risks, checklist, and page citations.</p>
            </div>
          )}

          {loading && (
            <div className="loading-state">
              <div className="spinner" />
              <h2>Reading the tender</h2>
              <p>Extracting requirements and comparing them with the company profile.</p>
            </div>
          )}

          {analysis && (
            <div className="report">
              {analysis.mock_mode && (
                <div className="mock-banner">Mock mode — add an API key for real analysis</div>
              )}

              <div className="report-top">
                <div className={`score recommendation-${analysis.recommendation.toLowerCase()}`}>
                  <strong>{analysis.fit_score}</strong>
                  <span>FIT SCORE</span>
                </div>
                <div>
                  <p className="eyebrow">{recommendationLabel(analysis.recommendation)}</p>
                  <h2>{analysis.tender_name}</h2>
                  <p>{analysis.entity}</p>
                </div>
              </div>

              <p className="recommendation-reason">{analysis.recommendation_reason}</p>

              <div className="facts">
                <div><span>Value</span><strong>{money(analysis.estimated_value, analysis.currency)}</strong></div>
                <div><span>Deadline</span><strong>{analysis.deadline || "Not identified"}</strong></div>
                <div><span>Location</span><strong>{analysis.location || "Not identified"}</strong></div>
                <div><span>Pages analyzed</span><strong>{analysis.pages_analyzed}</strong></div>
              </div>

              <section className="report-section">
                <h3>Summary</h3>
                <p>{analysis.summary}</p>
              </section>

              {analysis.document_warnings.length > 0 && (
                <section className="report-section warnings">
                  <h3>Document warnings</h3>
                  {analysis.document_warnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                </section>
              )}

              <section className="report-section">
                <h3>Requirements</h3>
                <div className="stack">
                  {analysis.requirements.map((item, index) => (
                    <article className="result-card" key={`${item.requirement}-${index}`}>
                      <div className="result-card-header">
                        <span className={`status status-${item.status.toLowerCase()}`}>
                          {statusLabel(item.status)}
                        </span>
                        {item.mandatory && <span className="mandatory">Mandatory</span>}
                      </div>
                      <h4>{item.requirement}</h4>
                      <p>{item.reason}</p>
                      <Citations citations={item.citations} />
                    </article>
                  ))}
                </div>
              </section>

              <section className="report-section">
                <h3>Risks</h3>
                <div className="stack">
                  {analysis.risks.length ? (
                    analysis.risks.map((risk, index) => (
                      <article className="result-card" key={`${risk.risk}-${index}`}>
                        <span className={`severity severity-${risk.severity}`}>
                          {risk.severity} risk
                        </span>
                        <h4>{risk.risk}</h4>
                        <Citations citations={risk.citations} />
                      </article>
                    ))
                  ) : (
                    <p>No explicit disqualification risks were extracted.</p>
                  )}
                </div>
              </section>

              <section className="report-section">
                <h3>Application checklist</h3>
                <div className="stack">
                  {analysis.checklist.map((item, index) => (
                    <article className="check-item" key={`${item.item}-${index}`}>
                      <span className="checkbox" />
                      <div>
                        <strong>{item.item}</strong>
                        <small>{item.priority} priority</small>
                        <Citations citations={item.citations} />
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
