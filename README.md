# TenderFit LATAM

TenderFit LATAM is an AI-assisted go/no-go evaluator for Peruvian public procurement opportunities. A user uploads a tender PDF, enters a company profile, and receives:

- a tender summary;
- key dates and estimated value;
- mandatory requirements with page citations;
- matched, missing, and unclear requirements;
- disqualification risks;
- a fit score and recommendation;
- an application checklist.

> This MVP is a decision-support tool, not legal advice. Users should verify all requirements against the official procurement documents.

## What is included

```text
tenderfit-latam/
├── backend/              FastAPI + PyMuPDF + OpenAI
├── frontend/             Next.js App Router
├── docs/                 Product, validation, architecture, and evaluation guides
├── manual-labels/        Ground-truth labeling template
├── sample-tenders/       Put test PDFs here
├── sample-company-profile.json
└── README.md
```


## Fastest local start (macOS/Linux)

```bash
unzip tenderfit-latam-starter.zip
cd tenderfit-latam
./start-local.sh
```

Then open `http://localhost:3000`. The first run installs dependencies and starts in mock mode.

## 1. Run the backend

Requirements: Python 3.11+.

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

The backend starts in mock mode by default. Open `http://localhost:8000/docs` to inspect the API.

### Turn on real AI analysis

Edit `backend/.env`:

```env
USE_MOCK_AI=false
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5-mini
```

Restart the backend after changing environment variables.

## 2. Run the frontend

Requirements: Node.js 20.9+.

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## 3. Test the complete flow

1. Fill in the company profile.
2. Upload a text-based PDF.
3. Click **Analyze opportunity**.
4. Review the recommendation and every cited page.

The current parser detects pages with little or no extractable text and warns that OCR may be required. OCR is intentionally not part of this first MVP.

## 4. Build the evaluation dataset

Duplicate `manual-labels/tender-label-template.csv` once per tender or keep one combined dataset. Label at least 10 real tenders before trusting the score.

Track these first metrics:

- mandatory-requirement precision;
- mandatory-requirement recall;
- citation correctness;
- date and value extraction accuracy;
- user agreement with apply / review / do-not-apply;
- minutes saved per tender.

## API

### `GET /health`

Returns service status and whether mock mode is enabled.

### `POST /api/analyze`

Multipart form fields:

- `file`: PDF
- `profile_json`: JSON matching the company profile schema

The backend extracts page-preserving text, analyzes chunks, merges evidence, compares it with the company profile, and returns a structured report.

## Recommended next iterations

1. Add OCR for scanned procurement documents.
2. Save companies and analyses in Supabase.
3. Add a correction button for every extracted requirement.
4. Build an evaluation dashboard.
5. Add SEACE opportunity discovery only after users repeatedly use the upload workflow.

## Privacy

In the real AI mode, extracted tender text and the entered company profile are sent to the configured model provider. Do not upload sensitive documents until you have reviewed the provider's data controls and added an explicit user disclosure.
