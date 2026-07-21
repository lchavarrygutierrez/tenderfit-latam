import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TenderFit LATAM",
  description:
    "Bilingual AI procurement analysis for small and medium-sized businesses in Latin America. Análisis bilingüe con IA para PyMEs de Latinoamérica.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
