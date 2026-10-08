# Synapse – Enhancements

No new npm packages were added: `npm install` is not needed. Restart the backend and frontend to pick up the changes.

## Bug fixes & security

| Area | Problem | Fix |
|---|---|---|
| Health page | Crashed (`logs.map is not a function`). The API returns `{ metrics }`, not an array | Reads `response.data.metrics` |
| Digital twin | `GET /api/digital-twin/:userId` had **no login check**, so anyone could read anyone's profile. The profile was also cached forever | Now `GET /api/digital-twin` (logged-in user only), recalculated on every request |
| Documents | Files in `/uploads` were **public** to anyone with the link, and any file type was accepted | Files are served only to their owner via `GET /api/documents/:id/file`. Only PDF/Word/JPG/PNG up to 10 MB are accepted |
| Academic | Progress slider sent an API call on every pixel dragged | Saves once when you release the slider |
| Auth | Expired tokens left pages broken | Auto-logout and redirect to login with a "session expired" message |
| Academic | Status `overdue` was never set | Goals past their deadline are marked overdue automatically |
| Chat | `"hi"` matched words like "this"/"think" | Whole-word intent matching |
| Health | Water intake units were mixed (ml vs L) | Litres everywhere |
| Uploads | Upload folder path depended on where `node` was started | Absolute path, created automatically |

## New features

- **Dashboard**: greeting, wellness score (0–100) with breakdown, logging streak, alerts, today's nutrition rings, latest health, twin suggestions (dismissible), upcoming deadlines and expiring documents. New users get a welcome card.
- **Health**: water, sleep quality, height, notes and back-dated entries; 7/30-day averages; BMI; line charts (sleep, steps, weight, heart rate, water) over 7, 30 or 90 days; wearable sync buttons; delete logs.
- **Nutrition**: carbs and fat goals; browse previous days; 7-day calorie chart; meals grouped by type; delete meals; one-click "log again".
- **Academic**: milestones (progress updates automatically), edit and delete goals, mark complete, filters (active/overdue/completed), search, category filter, sorting, days-left and at-risk badges.
- **Documents**: drag-and-drop upload, secure open and download, edit details, delete (also removes the file), category filters, partial-word search, expiring/expired banner.
- **AI Twin**: answers about overall summary, sleep, steps, water, weight trend and BMI, heart rate, nutrition, deadlines, documents and streaks; can answer two topics at once; typing indicator; one-click suggestions; clear history.
- **Profile page** (click your name): edit name, change password, dark mode switch, export all data as JSON, delete account.
- **Dark mode**, toast notifications, active-tab highlight, mobile menu, password show/hide and strength meter.

## New / changed API endpoints

```
GET    /api/digital-twin                         (was /:userId; now requires login)
PATCH  /api/digital-twin/recommendations/:id/dismiss
GET    /api/health?days=30
PUT    /api/health/:id
DELETE /api/health/:id
GET    /api/nutrition/daily?date=YYYY-MM-DD
GET    /api/nutrition/weekly
PUT    /api/nutrition/:id
DELETE /api/nutrition/:id
PUT    /api/goals                                (now also accepts carbs, fat)
PUT    /api/academic/:id
DELETE /api/academic/:id
POST   /api/academic/:id/milestones
PATCH  /api/academic/:id/milestones/:milestoneId
DELETE /api/academic/:id/milestones/:milestoneId
GET    /api/documents?q=&category=
GET    /api/documents/expiry                     (now { expiringSoon, expired })
GET    /api/documents/:id/file?download=1
PUT    /api/documents/:id
DELETE /api/documents/:id
DELETE /api/chat
GET    /api/profile
PUT    /api/profile
PUT    /api/profile/password
GET    /api/profile/export
DELETE /api/profile
```

## Configuration

See `backend/.env.example` and `frontend/.env.example`. New optional settings:
- `CLIENT_URL` (backend): allowed frontend origins. Any `http://localhost` port is always allowed.
- `REACT_APP_API_URL` (frontend): API base URL. Defaults to `http://localhost:5000/api`.

Shared logic for the dashboard, digital twin and chat lives in `backend/utils/insights.js`.

---

# Agentic AI Twin (Google Gemini)

The AI Twin chat can now run as an **AI agent**. Gemini decides which of the app's tools to use, reads your real data, and can propose changes (log a meal, create a study plan, tick off milestones and more). **Nothing is saved until you click Confirm** on the card in the chat.

## Turn it on
1. Get a free API key at https://aistudio.google.com/apikey
2. Add to `backend/.env`:
   ```
   GEMINI_API_KEY=your-key-here
   GEMINI_MODEL=gemini-3.8-flash
   ```
3. Restart the backend. The terminal shows `AI agent: ON`, and the chat shows the ✨ AI agent badge.

Without a key, the chat keeps using the built-in keyword answers. If Gemini fails (rate limit, network), that message automatically falls back to the built-in answer.

Requires Node.js 18+ (uses the built-in `fetch`). No new npm packages.

## What it can do
| Tool | Type | What it does |
|---|---|---|
| get_overview | read | Wellness score, averages, today's nutrition, deadlines, recommendations |
| get_health_logs | read | Health entries for the last N days |
| get_meals | read | A day's meals, or daily totals for N days |
| get_academic_goals | read | Goals with milestones and ids |
| search_documents | read | Document metadata search |
| log_meal | write ✋ | Logs a meal (estimates calories/macros if you don't give them) |
| log_health_metric | write ✋ | Logs sleep, steps, water, weight, heart rate |
| create_goal | write ✋ | Creates a goal with milestones (study plans) |
| add_milestones | write ✋ | Adds milestones to a goal |
| set_milestone_status | write ✋ | Ticks or unticks a milestone |
| update_goal | write ✋ | Changes deadline, priority, title or progress |
| set_nutrition_goals | write ✋ | Changes daily targets |

✋ = shown as a confirmation card and only applied after you click Confirm.

## Safety
- Tools always use the logged-in user's id from the server, so the model can't access other users' data.
- Every write is validated (ranges, enums, dates, ownership) before it's proposed, and again when applied.
- Confirm is atomic, so double-clicks can't apply a change twice. Proposals expire after 24 hours.
- No delete tools. At most 5 proposed changes and 6 model steps per message. Each user is limited to 12 messages a minute.

## Files
- `backend/agent/gemini.js`: Gemini REST client
- `backend/agent/tools.js`: tool definitions (read and write)
- `backend/agent/agent.js`: agent loop and confirm/cancel
- `backend/routes/agent.js`: `GET /api/agent/status`, `POST /api/agent/actions/:id/confirm`, `POST /api/agent/actions/:id/cancel`
- `backend/models/AgentAction.js`: stored proposals
- `backend/utils/goalHelpers.js`: goal progress rules shared with the Academic page
