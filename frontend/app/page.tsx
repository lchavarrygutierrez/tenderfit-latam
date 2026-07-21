"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { analyzeTender } from "@/lib/api";
import type {
  Citation,
  CompanyProfile,
  Recommendation,
  RequirementStatus,
  TenderAnalysis,
} from "@/lib/types";

type Language = "es" | "en";

const initialProfile: CompanyProfile = {
  company_name: "",
  industry: "",
  products_services: "",
  location: "Lima, Perú",
  years_operating: 0,
  previous_contract_experience: "",
  certifications: "",
  typical_project_size: null,
  maximum_project_size: null,
  employees: null,
};

const copy = {
  es: {
    languageName: "Español",
    switchLabel: "Idioma",
    eyebrow: "NEW YORK CITY · DISEÑADO PARA LATINOAMÉRICA",
    title: "Descubre si una oportunidad pública vale la pena para tu empresa.",
    subtitle:
      "Sube las bases, describe tu empresa y recibe un análisis claro de requisitos, riesgos y compatibilidad, con citas del documento.",
    companyProfile: "Perfil de la empresa",
    companyHelp: "Cuéntanos lo esencial para comparar tu PyME con la oportunidad.",
    companyName: "Nombre de la empresa",
    companyNamePlaceholder: "Mi Pyme Digital",
    industry: "Sector",
    industryPlaceholder: "Tecnología y servicios digitales",
    productsServices: "Productos y servicios",
    productsPlaceholder: "Describe qué vende, implementa o entrega tu empresa.",
    location: "Ubicación",
    years: "Años de operación",
    employees: "Número de colaboradores",
    optional: "Opcional",
    experience: "Experiencia previa en contratos",
    experiencePlaceholder:
      "Incluye proyectos similares, clientes, montos, fechas y resultados.",
    certifications: "Certificaciones y registros",
    certificationsPlaceholder:
      "ISO, registros profesionales, acreditaciones de proveedores o ninguna.",
    typicalSize: "Monto habitual por proyecto",
    maximumSize: "Monto máximo que puede asumir",
    localCurrency: "Moneda local",
    uploadTitle: "Sube la oportunidad",
    uploadHelp: "Usa un PDF con texto de hasta 20 MB.",
    selectPdf: "Selecciona las bases en PDF",
    browse: "Haz clic para buscar el archivo",
    analyzing: "Analizando documento…",
    analyze: "Analizar oportunidad",
    disclaimer:
      "Herramienta de apoyo para la toma de decisiones. Verifica siempre las bases oficiales antes de postular.",
    unexpectedError: "Ocurrió un error inesperado.",
    emptyTitle: "Tu análisis aparecerá aquí",
    emptyCopy:
      "Puntaje de compatibilidad, requisitos, riesgos, lista de tareas y citas por página.",
    loadingTitle: "Estamos leyendo las bases",
    loadingCopy:
      "Extraemos los requisitos y los comparamos con el perfil de tu empresa.",
    mockBanner:
      "Modo de prueba: agrega una API key para realizar un análisis real",
    fit: "COMPATIBILIDAD",
    estimatedValue: "Valor estimado",
    deadline: "Fecha límite",
    pagesAnalyzed: "Páginas analizadas",
    notIdentified: "No identificado",
    notIdentifiedFeminine: "No identificada",
    executiveSummary: "Resumen ejecutivo",
    warnings: "Alertas del documento",
    requirements: "Requisitos",
    mandatory: "Obligatorio",
    risks: "Riesgos y posibles descalificadores",
    noRisks: "No se identificaron riesgos explícitos de descalificación.",
    checklist: "Lista de tareas para postular",
    source: "Ver fuente",
    sources: "Ver fuentes",
    page: "Página",
    apply: "Postular",
    review: "Revisar con atención",
    doNotApply: "No postular",
    met: "Cumplido",
    missing: "No cumplido",
    unclear: "Por confirmar",
    highRisk: "Riesgo alto",
    mediumRisk: "Riesgo medio",
    lowRisk: "Riesgo bajo",
    highPriority: "Prioridad alta",
    mediumPriority: "Prioridad media",
    lowPriority: "Prioridad baja",
  },
  en: {
    languageName: "English",
    switchLabel: "Language",
    eyebrow: "NEW YORK CITY · BUILT FOR LATIN AMERICA",
    title: "Find out whether a public contract is worth pursuing for your business.",
    subtitle:
      "Upload the tender documents, describe your company, and receive a clear analysis of requirements, risks, and fit with citations from the source.",
    companyProfile: "Company profile",
    companyHelp: "Tell us the essentials so we can compare your SME with the opportunity.",
    companyName: "Company name",
    companyNamePlaceholder: "Mi Pyme Digital",
    industry: "Industry",
    industryPlaceholder: "Technology and digital services",
    productsServices: "Products and services",
    productsPlaceholder: "Describe what your company sells, implements, or delivers.",
    location: "Location",
    years: "Years in operation",
    employees: "Number of employees",
    optional: "Optional",
    experience: "Previous contract experience",
    experiencePlaceholder:
      "Include similar projects, clients, contract values, dates, and results.",
    certifications: "Certifications and registrations",
    certificationsPlaceholder:
      "ISO certifications, professional registrations, supplier credentials, or none.",
    typicalSize: "Typical project size",
    maximumSize: "Maximum project size",
    localCurrency: "Local currency",
    uploadTitle: "Upload the opportunity",
    uploadHelp: "Use a text-based PDF of up to 20 MB.",
    selectPdf: "Select the tender PDF",
    browse: "Click to browse for the file",
    analyzing: "Analyzing document…",
    analyze: "Analyze opportunity",
    disclaimer:
      "Decision-support tool only. Always verify the official tender documents before applying.",
    unexpectedError: "An unexpected error occurred.",
    emptyTitle: "Your analysis will appear here",
    emptyCopy:
      "Fit score, requirements, risks, application checklist, and page-level citations.",
    loadingTitle: "We are reading the tender",
    loadingCopy:
      "We are extracting the requirements and comparing them with your company profile.",
    mockBanner: "Mock mode: add an API key to run a real analysis",
    fit: "FIT SCORE",
    estimatedValue: "Estimated value",
    deadline: "Deadline",
    pagesAnalyzed: "Pages analyzed",
    notIdentified: "Not identified",
    notIdentifiedFeminine: "Not identified",
    executiveSummary: "Executive summary",
    warnings: "Document warnings",
    requirements: "Requirements",
    mandatory: "Mandatory",
    risks: "Risks and potential disqualifiers",
    noRisks: "No explicit disqualification risks were identified.",
    checklist: "Application checklist",
    source: "View source",
    sources: "View sources",
    page: "Page",
    apply: "Apply",
    review: "Review carefully",
    doNotApply: "Do not apply",
    met: "Met",
    missing: "Missing",
    unclear: "Needs confirmation",
    highRisk: "High risk",
    mediumRisk: "Medium risk",
    lowRisk: "Low risk",
    highPriority: "High priority",
    mediumPriority: "Medium priority",
    lowPriority: "Low priority",
  },
} as const;

function recommendationLabel(
  value: Recommendation,
  language: Language,
): string {
  const t = copy[language];
  if (value === "APPLY") return t.apply;
  if (value === "DO_NOT_APPLY") return t.doNotApply;
  return t.review;
}

function statusLabel(value: RequirementStatus, language: Language): string {
  const t = copy[language];
  if (value === "MET") return t.met;
  if (value === "MISSING") return t.missing;
  return t.unclear;
}

function money(
  value: number | null,
  currency: string | null,
  language: Language,
): string {
  if (value === null) return copy[language].notIdentified;

  try {
    return new Intl.NumberFormat(language === "es" ? "es-419" : "en-US", {
      style: "currency",
      currency: currency === "PEN" ? "PEN" : currency || "USD",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency ?? ""} ${value.toLocaleString(
      language === "es" ? "es-419" : "en-US",
    )}`.trim();
  }
}

function Citations({
  citations,
  language,
}: {
  citations: Citation[];
  language: Language;
}) {
  if (!citations.length) return null;
  const t = copy[language];

  return (
    <details className="citations">
      <summary>{citations.length === 1 ? t.source : t.sources}</summary>
      <div className="citation-list">
        {citations.map((citation, index) => (
          <blockquote key={`${citation.page}-${index}`}>
            <strong>
              {t.page} {citation.page}
            </strong>
            <span>“{citation.quote}”</span>
          </blockquote>
        ))}
      </div>
    </details>
  );
}

export default function Home() {
  const [language, setLanguage] = useState<Language>("es");
  const [profile, setProfile] = useState<CompanyProfile>(initialProfile);
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<TenderAnalysis | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const t = copy[language];

  useEffect(() => {
    const saved = window.localStorage.getItem("tenderfit-language");
    const detected: Language = navigator.language.toLowerCase().startsWith("es")
      ? "es"
      : "en";
    const nextLanguage: Language = saved === "es" || saved === "en" ? saved : detected;
    setLanguage(nextLanguage);
    document.documentElement.lang = nextLanguage;
  }, []);

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

  function changeLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);
    setError("");
    setAnalysis(null);
    window.localStorage.setItem("tenderfit-language", nextLanguage);
    document.documentElement.lang = nextLanguage;
  }

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
      setAnalysis(await analyzeTender(profile, file, language));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t.unexpectedError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <header className="hero">
        <div className="hero-top">
          <div className="brand">
            TenderFit <span>LATAM</span>
          </div>
          <div className="language-switch" aria-label={t.switchLabel}>
            <button
              type="button"
              className={language === "es" ? "active" : ""}
              aria-pressed={language === "es"}
              onClick={() => changeLanguage("es")}
            >
              ES
            </button>
            <button
              type="button"
              className={language === "en" ? "active" : ""}
              aria-pressed={language === "en"}
              onClick={() => changeLanguage("en")}
            >
              EN
            </button>
          </div>
        </div>
        <p className="eyebrow">{t.eyebrow}</p>
        <h1>{t.title}</h1>
        <p className="hero-copy">{t.subtitle}</p>
      </header>

      <section className="workspace">
        <form className="panel form-panel" onSubmit={onSubmit}>
          <div className="section-heading">
            <span>1</span>
            <div>
              <h2>{t.companyProfile}</h2>
              <p>{t.companyHelp}</p>
            </div>
          </div>

          <div className="field-grid">
            <label>
              {t.companyName}
              <input
                required
                value={profile.company_name}
                onChange={(event) => setText("company_name", event.target.value)}
                placeholder={t.companyNamePlaceholder}
              />
            </label>
            <label>
              {t.industry}
              <input
                required
                value={profile.industry}
                onChange={(event) => setText("industry", event.target.value)}
                placeholder={t.industryPlaceholder}
              />
            </label>
          </div>

          <label>
            {t.productsServices}
            <textarea
              required
              value={profile.products_services}
              onChange={(event) => setText("products_services", event.target.value)}
              placeholder={t.productsPlaceholder}
            />
          </label>

          <div className="field-grid three">
            <label>
              {t.location}
              <input
                required
                value={profile.location}
                onChange={(event) => setText("location", event.target.value)}
              />
            </label>
            <label>
              {t.years}
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
              {t.employees}
              <input
                type="number"
                min="1"
                value={profile.employees ?? ""}
                onChange={(event) => setNumber("employees", event.target.value)}
                placeholder={t.optional}
              />
            </label>
          </div>

          <label>
            {t.experience}
            <textarea
              value={profile.previous_contract_experience}
              onChange={(event) =>
                setText("previous_contract_experience", event.target.value)
              }
              placeholder={t.experiencePlaceholder}
            />
          </label>

          <label>
            {t.certifications}
            <textarea
              value={profile.certifications}
              onChange={(event) => setText("certifications", event.target.value)}
              placeholder={t.certificationsPlaceholder}
            />
          </label>

          <div className="field-grid">
            <label>
              {t.typicalSize}
              <input
                type="number"
                min="0"
                value={profile.typical_project_size ?? ""}
                onChange={(event) => setNumber("typical_project_size", event.target.value)}
                placeholder={t.localCurrency}
              />
            </label>
            <label>
              {t.maximumSize}
              <input
                type="number"
                min="0"
                value={profile.maximum_project_size ?? ""}
                onChange={(event) => setNumber("maximum_project_size", event.target.value)}
                placeholder={t.localCurrency}
              />
            </label>
          </div>

          <div className="section-heading upload-heading">
            <span>2</span>
            <div>
              <h2>{t.uploadTitle}</h2>
              <p>{t.uploadHelp}</p>
            </div>
          </div>

          <label className="dropzone">
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <strong>{file ? file.name : t.selectPdf}</strong>
            <span>
              {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : t.browse}
            </span>
          </label>

          <button type="submit" disabled={!canSubmit || loading}>
            {loading ? t.analyzing : t.analyze}
          </button>

          <p className="disclaimer">{t.disclaimer}</p>
          {error && <div className="error">{error}</div>}
        </form>

        <aside className="panel report-panel">
          {!analysis && !loading && (
            <div className="empty-state">
              <div className="score-placeholder">—</div>
              <h2>{t.emptyTitle}</h2>
              <p>{t.emptyCopy}</p>
            </div>
          )}

          {loading && (
            <div className="loading-state">
              <div className="spinner" />
              <h2>{t.loadingTitle}</h2>
              <p>{t.loadingCopy}</p>
            </div>
          )}

          {analysis && (
            <div className="report">
              {analysis.mock_mode && <div className="mock-banner">{t.mockBanner}</div>}

              <div className="report-top">
                <div
                  className={`score recommendation-${analysis.recommendation.toLowerCase()}`}
                >
                  <strong>{analysis.fit_score}</strong>
                  <span>{t.fit}</span>
                </div>
                <div>
                  <p className="eyebrow">
                    {recommendationLabel(analysis.recommendation, language)}
                  </p>
                  <h2>{analysis.tender_name}</h2>
                  <p>{analysis.entity}</p>
                </div>
              </div>

              <p className="recommendation-reason">{analysis.recommendation_reason}</p>

              <div className="facts">
                <div>
                  <span>{t.estimatedValue}</span>
                  <strong>
                    {money(analysis.estimated_value, analysis.currency, language)}
                  </strong>
                </div>
                <div>
                  <span>{t.deadline}</span>
                  <strong>{analysis.deadline || t.notIdentifiedFeminine}</strong>
                </div>
                <div>
                  <span>{t.location}</span>
                  <strong>{analysis.location || t.notIdentifiedFeminine}</strong>
                </div>
                <div>
                  <span>{t.pagesAnalyzed}</span>
                  <strong>{analysis.pages_analyzed}</strong>
                </div>
              </div>

              <section className="report-section">
                <h3>{t.executiveSummary}</h3>
                <p>{analysis.summary}</p>
              </section>

              {analysis.document_warnings.length > 0 && (
                <section className="report-section warnings">
                  <h3>{t.warnings}</h3>
                  {analysis.document_warnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                </section>
              )}

              <section className="report-section">
                <h3>{t.requirements}</h3>
                <div className="stack">
                  {analysis.requirements.map((item, index) => (
                    <article className="result-card" key={`${item.requirement}-${index}`}>
                      <div className="result-card-header">
                        <span className={`status status-${item.status.toLowerCase()}`}>
                          {statusLabel(item.status, language)}
                        </span>
                        {item.mandatory && <span className="mandatory">{t.mandatory}</span>}
                      </div>
                      <h4>{item.requirement}</h4>
                      <p>{item.reason}</p>
                      <Citations citations={item.citations} language={language} />
                    </article>
                  ))}
                </div>
              </section>

              <section className="report-section">
                <h3>{t.risks}</h3>
                <div className="stack">
                  {analysis.risks.length ? (
                    analysis.risks.map((risk, index) => (
                      <article className="result-card" key={`${risk.risk}-${index}`}>
                        <span className={`severity severity-${risk.severity}`}>
                          {risk.severity === "high"
                            ? t.highRisk
                            : risk.severity === "medium"
                              ? t.mediumRisk
                              : t.lowRisk}
                        </span>
                        <h4>{risk.risk}</h4>
                        <Citations citations={risk.citations} language={language} />
                      </article>
                    ))
                  ) : (
                    <p>{t.noRisks}</p>
                  )}
                </div>
              </section>

              <section className="report-section">
                <h3>{t.checklist}</h3>
                <div className="stack">
                  {analysis.checklist.map((item, index) => (
                    <article className="check-item" key={`${item.item}-${index}`}>
                      <span className="checkbox" />
                      <div>
                        <strong>{item.item}</strong>
                        <small>
                          {item.priority === "high"
                            ? t.highPriority
                            : item.priority === "medium"
                              ? t.mediumPriority
                              : t.lowPriority}
                        </small>
                        <Citations citations={item.citations} language={language} />
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
