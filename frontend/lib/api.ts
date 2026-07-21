import type { CompanyProfile, TenderAnalysis } from "./types";

type Language = "es" | "en";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function analyzeTender(
  profile: CompanyProfile,
  file: File,
  language: Language,
): Promise<TenderAnalysis> {
  const form = new FormData();
  form.append("file", file);
  form.append("profile_json", JSON.stringify(profile));
  form.append("language", language);

  const response = await fetch(`${API_URL}/api/analyze`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    const fallback = language === "es" ? "No se pudo completar el análisis." : "Analysis failed.";
    let detail = fallback;
    try {
      const payload = (await response.json()) as { detail?: unknown };
      detail =
        typeof payload.detail === "string"
          ? payload.detail
          : JSON.stringify(payload.detail ?? payload);
    } catch {
      detail = (await response.text()) || fallback;
    }
    throw new Error(
      detail ||
        (language === "es"
          ? `El análisis falló con el estado ${response.status}.`
          : `Analysis failed with status ${response.status}.`),
    );
  }

  return (await response.json()) as TenderAnalysis;
}
