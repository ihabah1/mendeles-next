# WhatsApp Integration — Phase 1 (Evolution API)

Phase 1 establishes WhatsApp infrastructure only. No AI, CRM, Lead Engine, or Automation.

## Overview

- **Provider:** Evolution API (`WHATSAPP_PROVIDER=evolution`)
- **Public widget:** Floating WhatsApp button on marketing pages opens a local chat modal
- **Dashboard:** `/dashboard/whatsapp` — connection status, QR, health, connect/disconnect
- **Future providers:** Meta Cloud API, Twilio (interfaces prepared, not implemented)

## Railway environment variables

Set these on the **Backend** service:

```env
WHATSAPP_PROVIDER=evolution
EVOLUTION_API_URL=https://your-evolution-api.example.com
EVOLUTION_API_KEY=your-global-api-key
EVOLUTION_INSTANCE=mendeles
```

| Variable | Required | Description |
|----------|----------|-------------|
| `WHATSAPP_PROVIDER` | No (default: `evolution`) | Active provider slug |
| `EVOLUTION_API_URL` | Yes for live connection | Evolution API base URL |
| `EVOLUTION_API_KEY` | Yes for live connection | Global API key from Evolution |
| `EVOLUTION_INSTANCE` | Yes for live connection | Instance name created in Evolution |

Until all three Evolution variables are set, APIs return mock data and the chat widget shows:

> WhatsApp is not connected yet.

## Evolution API setup

1. Deploy [Evolution API](https://github.com/EvolutionAPI/evolution-api) (Docker/Railway/VPS).
2. Create an instance named `mendeles` (or match `EVOLUTION_INSTANCE`).
3. Copy the global API key from Evolution settings.
4. Set Railway variables on the Mendeles backend service.
5. Run migrations:

```bash
python manage.py migrate
```

6. Open **Dashboard → WhatsApp** and click **Connect**.
7. Scan the QR code with WhatsApp mobile.

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/whatsapp/status/` | Public / Admin | Public summary or full status when authenticated |
| GET | `/api/v1/whatsapp/health/` | `integrations.view` | Provider health check |
| POST | `/api/v1/whatsapp/connect/` | `integrations.manage` | Start connection / QR flow |
| POST | `/api/v1/whatsapp/disconnect/` | `integrations.manage` | Logout instance |
| GET | `/api/v1/whatsapp/qr/` | `integrations.view` | Fetch QR code image |
| POST | `/api/v1/whatsapp/refresh/` | `integrations.view` | Refresh connection status |

Legacy Twilio webhook (unchanged):

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/whatsapp/webhook/` | Twilio inbound (optional) |
| POST | `/api/v1/whatsapp/simulate/` | Staff simulator (JWT) |

## Database models

| Model | Table | Purpose |
|-------|-------|---------|
| `ConnectionStatus` | `whatsapp_connection_status` | Platform connection singleton |
| `Conversation` | `whatsapp_conversations` | Visitor chat sessions |
| `Message` | `whatsapp_messages` | Widget messages (Phase 1 local only) |

## Provider architecture

```
whatsapp/providers/
  base.py          # WhatsAppProvider ABC
  evolution.py     # EvolutionProvider (Phase 1)
  __init__.py      # get_whatsapp_provider() factory
```

Future providers implement the same interface:

- `get_status()`
- `health_check()`
- `connect()`
- `disconnect()`
- `get_qr()`

Add `MetaCloudProvider` or `TwilioProvider` in `providers/` and register in `get_whatsapp_provider()`.

## Deployment steps

1. Push code to `main` (Railway auto-deploys backend + frontend).
2. Backend: `python manage.py migrate`
3. Set Evolution env vars on backend service.
4. Redeploy if env vars were added after last deploy.
5. Verify:
   - `GET https://<backend>/api/v1/whatsapp/status/` → `connected: false` (before setup)
   - Marketing page shows green WhatsApp FAB
   - Dashboard → WhatsApp shows provider and status

## Frontend

- `WhatsAppChatShell` — FAB on all marketing pages (not dashboard/auth)
- `WhatsAppChatWidget` — Intercom-style modal (reusable)
- RTL: FAB uses logical `end-4` (bottom-left in Hebrew, bottom-right in English)

## Remaining work (Phase 2+)

- [ ] Wire widget messages to `Conversation` / `Message` API
- [ ] Evolution webhook for inbound messages
- [ ] Outbound message send via Evolution
- [ ] AI replies (Gemini / custom agent)
- [ ] CRM / Lead Engine integration
- [ ] Automation job type `WHATSAPP_CAMPAIGN`
- [ ] Meta Cloud API provider
- [ ] Twilio provider (replace legacy webhook)

## Local development

```bash
# Backend
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# Frontend
cd frontend
npm install
npm run dev
```

Test APIs:

```bash
pytest tests/test_whatsapp_api.py tests/test_whatsapp_provider.py -q
```

Test frontend components:

```bash
cd frontend
npm run test:unit
```
