# Synapse - AI Digital Twin for Students

Synapse brings a student's **health, nutrition, academics and important documents** into one dashboard. A **Digital Twin** combines all four to spot patterns, such as sleep dropping in exam week or a deadline at risk. An optional **Gemini-powered AI agent** can read your data and propose changes, which you confirm before anything is saved.

**Stack:** MongoDB Atlas · Express 4 · React 19 · Node.js · Mongoose 8 · JWT · Multer · Google Gemini (optional)

| Team member | Role |
|---|---|
| Ishan Kumar (24BCE1563) | Backend & Database |
| Harsh Choudhary | Frontend - Academic & Dashboard |
| Mudit Jayesh | Frontend - Health & Nutrition |

---

## Features

- **Dashboard:** wellness score, alerts, 7-day charts, activity feed and quick actions.
- **Health:** sleep, steps, heart rate, water and weight logs. 7- and 30-day trends, alerts, and simulated Fitbit / HealthKit sync.
- **Nutrition:** meals with several food items each, macros, calories remaining against your goals, weekly history.
- **Academic goals:** exams, projects and assignments with milestones, progress, filters and overdue detection.
- **Document vault:** upload IDs, certificates and reports. Full-text search, expiry tracking, and private, owner-only file access.
- **AI Twin chat:** built-in answers, or Gemini function calling over 12 tools. Every write waits for your **Confirm**.
- **Profile:** nutrition goals, password change, JSON data export, account deletion. Light and dark themes.

---

## Requirements

- Node.js 18 or newer (`node -v`)
- A MongoDB Atlas cluster, or local MongoDB 6+
- Optional: a Gemini API key from https://aistudio.google.com/apikey

## Run it locally

```bash
# 1. Clone
git clone https://github.com/ishaaan0310/Synapse.git
cd Synapse

# 2. Backend
cd backend
npm install
copy .env.example .env        # macOS/Linux: cp .env.example .env
#    then edit .env: MONGO_URI, JWT_SECRET (and GEMINI_API_KEY if you want the AI agent)

# 3. Load the sample dataset (creates demo@synapse.dev / demo1234)
npm run seed

# 4. Start the API  ->  http://localhost:5000
npm run dev

# 5. Frontend (new terminal)
cd ../frontend
npm install
npm start                     # opens http://localhost:3000
```

Log in with **demo@synapse.dev / demo1234**, or register a new account.

### Environment variables (`backend/.env`)

| Variable | Example | Notes |
|---|---|---|
| `MONGO_URI` | `mongodb+srv://user:pass@cluster0.xxxx.mongodb.net/synapse` | required |
| `JWT_SECRET` | any long random string | required |
| `PORT` | `5000` | optional |
| `CLIENT_URL` | `http://localhost:3000` | allowed CORS origins |
| `GEMINI_API_KEY` | | optional - turns the AI agent on |
| `GEMINI_MODEL` | `gemini-3.8-flash` | optional |

Never commit `.env`. It is already in `.gitignore`.

---

## Database scripts (DA3)

| Command | What it does |
|---|---|
| `npm run seed` | Creates the demo user with 30 days of health logs, about 100 meal logs, 7 goals with milestones, 5 documents, chat history, a pending AI action and a twin profile. Re-runnable, and it only touches the demo user's data. |
| `npm run queries` | Runs the important queries below. It prints the query, the result and the `explain()` plan. |
| `node scripts/queries.js 4` | Runs a single query (0-7), which is handy for the viva. |
| `node scripts/queries.js indexes` | Lists every index. |

| # | Query | MongoDB feature |
|---|---|---|
| 1 | Poor-sleep nights in the last 14 days | range `find` + `sort` on the compound index `{user:1, date:-1}`; IXSCAN compared with a forced COLLSCAN |
| 2 | Weekly health averages | `$match` → `$group` (`$avg`, `$min`, `$max`) → `$project` |
| 3 | Most eaten foods | `$unwind` on the embedded `items[]` array |
| 4 | Sleep vs calories | cross-collection `$lookup` with a sub-pipeline, plus `$facet` |
| 5 | Document search | `$text` on the text index, ranked by `textScore`; expiring documents |
| 6 | Mark one milestone done | `arrayFilters` positional update, then a pipeline update that recomputes progress |
| 7 | Academic risk dashboard | `$facet`, `$cond` and date arithmetic |

---

## Data model

8 collections in the `synapse` database:

| Collection | Key fields | Indexes |
|---|---|---|
| `users` | name, email, password (bcrypt), embedded `nutritionGoals` | unique `email` |
| `healthmetrics` | user, date, sleepHours, steps, heartRate, waterIntake, weight, source | `{user:1, date:-1}` |
| `nutritionlogs` | user, mealType, embedded `items[]`, calories/protein/carbs/fat, date | `{user:1, date:-1}` |
| `academicgoals` | user, title, category, deadline, priority, progress, status, embedded `milestones[]` | - |
| `documents` | user, title, category, tags, expiryDate, ocrText, flexible `metadata` | text `{title, ocrText, tags}` |
| `chatmessages` | user, role, content, module, source, `actions[]` refs | `{user:1, timestamp:-1}` |
| `agentactions` | user, tool, args, summary, status (pending → confirmed / cancelled / expired) | `{user:1, status:1, createdAt:-1}` |
| `digitaltwinprofiles` | user (unique), health/nutrition/academic summaries, recommendations[] | unique `user` |

Every document references its owner by `user: ObjectId`. Data that is always read together with its parent is **embedded**: meal items, milestones and nutrition goals. Data that grows without limit is kept in **separate collections**: daily logs, chat, documents.

UML package, component and deployment diagrams are in `docs/diagrams/`. Open `Synapse.mdj` in StarUML.

---

## API overview

All routes except `/api/auth/*` need `Authorization: Bearer <token>`.

| Base | Endpoints |
|---|---|
| `/api/auth` | `POST /register`, `POST /login` |
| `/api/dashboard` | `GET /` (summary, insights, wellness score) |
| `/api/health` | CRUD, `GET /trends`, `GET /alerts`, `POST /sync-wearable`, `GET /cross-module-correlation` |
| `/api/nutrition` | CRUD, `GET /daily`, `GET /weekly`, `GET /history-trends` |
| `/api/academic` | CRUD, milestones add/toggle/delete |
| `/api/documents` | upload, list, `GET /search`, `GET /expiry`, `GET /:id/file` (owner only), update, delete |
| `/api/chat` | history, send, clear |
| `/api/agent` | `GET /status`, `POST /actions/:id/confirm`, `POST /actions/:id/cancel` |
| `/api/digital-twin` | profile, dismiss recommendation |
| `/api/profile` | get/update, password, export, delete account |

---

## Project structure

```
synapse/
├── backend/
│   ├── agent/          Gemini client, tool definitions, agent loop
│   ├── middleware/     JWT auth
│   ├── models/         8 Mongoose schemas
│   ├── routes/         REST endpoints
│   ├── scripts/        seed.js, queries.js  (DA3)
│   ├── utils/          insights engine, goal helpers
│   └── server.js
├── frontend/src/
│   ├── components/     Navbar, Charts, Icons, Toast
│   ├── pages/          Dashboard, Health, Nutrition, Academic, Documents, Chat, Profile, Login, Register
│   └── utils/api.js    axios client
└── docs/               evidence log, UML diagrams
```

## Troubleshooting

- **`MongoDB Connection Failed`:** check `MONGO_URI`, and add your IP under Atlas → Network Access.
- **"AI agent: OFF"** in the console means `GEMINI_API_KEY` is empty. The built-in answers still work.
- **Port 5000 in use:** set `PORT=5001` in `.env` and `REACT_APP_API_URL=http://localhost:5001/api` in `frontend/.env`.
