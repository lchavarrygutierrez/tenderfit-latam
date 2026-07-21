import type { CompanyProfile, TenderAnalysis } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function analyzeTender(
  profile: CompanyProfile,
  file: File,
): Promise<TenderAnalysis> {
  const form = new FormData();
  form.append("file", file);
  form.append("profile_json", JSON.stringify(profile));

  const response = await fetch(`${API_URL}/api/analyze`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    let detail = "Analysis failed.";
    try {
      const payload = (await response.json()) as { detail?: unknown };
      detail =
        typeof payload.detail === "string"
          ? payload.detail
          : JSON.stringify(payload.detail ?? payload);
    } catch {
      detail = await response.text();
    }
    throw new Error(detail || `Analysis failed with status ${response.status}.`);
  }

  return (await response.json()) as TenderAnalysis;
}
