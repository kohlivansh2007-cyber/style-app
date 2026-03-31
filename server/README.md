## Server (AI Report Generator)

### Setup

1. Copy env template:
   - Duplicate `.env.example` → `.env`
   - Fill in:
     - `OPENAI_API_KEY`
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY`

2. Install dependencies:

```bash
cd server
npm install
```

3. Run the API:

```bash
npm run dev
```

Server starts on `PORT` (default `3001`).

### Endpoint

- `POST /api/generate-report`
  - Body: `{ "consultationId": "..." }`
  - Returns: `application/pdf` bytes (attachment)

