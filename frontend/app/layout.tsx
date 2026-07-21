import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TenderFit LATAM",
  description: "AI-assisted go/no-go analysis for public procurement opportunities.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
