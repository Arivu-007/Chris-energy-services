# Chris Energy Services

Static marketing site plus a lightweight Node/Express backend used to process enquiry form submissions.

## Prerequisites

- Node.js 18+
- npm

## Setup

1. Install dependencies:
   ```
   npm install
   ```
2. Copy `env.example` to `.env` and populate your SMTP credentials plus notification addresses.
3. Run the backend:
   ```
   npm run dev
   ```
   The server starts on `http://localhost:4000` by default.

## Testing the API

Use `curl` or an API client to hit the endpoint once the server is running:

```
curl -X POST http://localhost:4000/api/enquiry ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Jane Doe\",\"email\":\"jane@example.com\",\"message\":\"Need pipeline support.\"}"
```

Expected response:
```
{
  "status": "success",
  "message": "Enquiry received. We will be in touch soon."
}
```

Invalid payloads return `400` with validation details. SMTP failures return `500` with a generic error.

## Frontend Integration

The enquiry form (see `js/script.js`) posts to `/api/enquiry`. When deploying, serve the static site and proxy `/api/*` to the Node server (or deploy them together) so the browser request reaches the backend without CORS issues.

