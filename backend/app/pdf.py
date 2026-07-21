from dataclasses import dataclass
from io import BytesIO

import pymupdf


@dataclass(frozen=True)
class PageText:
    page: int
    text: str


@dataclass(frozen=True)
class ParsedPdf:
    pages: list[PageText]
    warnings: list[str]


class PdfValidationError(ValueError):
    pass


def extract_pdf_pages(data: bytes, max_pages: int) -> ParsedPdf:
    try:
        document = pymupdf.open(stream=BytesIO(data), filetype="pdf")
    except Exception as exc:  # PyMuPDF exposes several format-specific exceptions.
        raise PdfValidationError("The uploaded file is not a readable PDF.") from exc

    if document.page_count == 0:
        raise PdfValidationError("The PDF contains no pages.")
    if document.page_count > max_pages:
        raise PdfValidationError(
            f"The PDF has {document.page_count} pages; the current limit is {max_pages}."
        )

    pages: list[PageText] = []
    low_text_pages: list[int] = []

    for index, page in enumerate(document):
        text = page.get_text("text", sort=True).strip()
        page_number = index + 1
        if len(text) < 40:
            low_text_pages.append(page_number)
        pages.append(PageText(page=page_number, text=text))

    warnings: list[str] = []
    if low_text_pages:
        preview = ", ".join(str(page) for page in low_text_pages[:12])
        suffix = "…" if len(low_text_pages) > 12 else ""
        warnings.append(
            "Some pages contain little or no extractable text and may require OCR: "
            f"{preview}{suffix}."
        )

    if sum(len(page.text) for page in pages) < 100:
        raise PdfValidationError(
            "Almost no text could be extracted. This appears to be a scanned PDF; OCR is required."
        )

    return ParsedPdf(pages=pages, warnings=warnings)


def chunk_pages(
    pages: list[PageText],
    character_limit: int,
    max_chunks: int,
) -> tuple[list[str], bool, int]:
    chunks: list[str] = []
    current_parts: list[str] = []
    current_length = 0
    truncated = False
    processed_pages = 0

    for page in pages:
        page_block = f"\n--- PAGE {page.page} ---\n{page.text}\n"

        if current_parts and current_length + len(page_block) > character_limit:
            chunks.append("".join(current_parts))
            current_parts = []
            current_length = 0

            if len(chunks) >= max_chunks:
                truncated = True
                break

        # A single very large page is clipped but keeps its page marker.
        if len(page_block) > character_limit:
            page_block = page_block[:character_limit]

        current_parts.append(page_block)
        current_length += len(page_block)
        processed_pages += 1

    if current_parts and len(chunks) < max_chunks:
        chunks.append("".join(current_parts))

    return chunks, truncated, processed_pages
