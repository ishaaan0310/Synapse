# Synapse - Project Evidence Log

**Course:** Database Management Systems, DA3
**Project:** Synapse - AI Digital Twin for students (MERN + MongoDB Atlas)
**Repository:** https://github.com/ishaaan0310/Synapse
**Log generated from:** `git log --all` on 10 Oct 2026

| Member | Reg. No. | Role (from DA2) | Git identity |
|---|---|---|---|
| Ishan Kumar | 24BCE1563 | Backend & Database Developer | `Ishan Kumar <ishan.kumar2024@vitstudent.ac.in>` |
| Harsh Choudhary | - | Frontend Developer (Academic & Dashboard) | `Harsh <harshchdhry16@gmail.com>` |
| Mudit Jayesh | - | Frontend Developer (Health & Nutrition) | `GalaxyPhoenix <galaxyphoenix716@gmail.com>` |

---

## 1. Summary

| | Ishan | Harsh | Mudit |
|---|---|---|---|
| Commits (all branches, excluding merges) | 16 | 6 | 8 |
| Merge commits | 2 | 0 | 0 |
| Main areas | DB schema, Express API, auth/JWT, aggregation & insights, Gemini agent, redesign, seed/queries | Academic goals UI, dashboard stats, responsive styling, DA2 evidence | Health & nutrition UI and aggregations, wearable sync, dashboard command center |

Branches: `main` (default), `backend-integration` (Ishan, merged via PR #1), `frontend-h` and `academic-dashboard` (Harsh).

---

## 2. Timeline (all branches, oldest first)

| # | Date (IST) | Commit | Author | Branch | Message | Files touched |
|---|---|---|---|---|---|---|
| 1 | 17 Sep 11:45 | `b9d29ed` | Ishan | main | Initial Synapse project | Full MERN scaffold: 8 models, routes, React pages |
| 2 | 17 Sep 12:12 | `b8aa7aa` | Ishan | backend-integration | Improved backend server handling and error handling | `server.js` |
| 3 | 17 Sep 12:30 | `22a29ec` | Ishan | backend-integration | Improve authentication and JWT security | `routes/auth.js`, `middleware/authMiddleware.js` |
| 4 | 20 Sep 17:00 | `46a0f75` | Mudit | main | feat(health) schema alignment and expanded form fields | `models/HealthMetrics.js` |
| 5 | 20 Sep 17:01 | `9bc31c9` | Mudit | main | feat(health) Health alerts engine & wearable sync (Fitbit / HealthKit) | `pages/Health.js` |
| 6 | 20 Sep 17:01 | `8375644` | Mudit | main | feat(health) 7-day & 30-day trend aggregation pipeline | `routes/health.js` |
| 7 | 20 Sep 17:01 | `6142b85` | Mudit | main | feat(nutrition) Multi-item subdocument array & image preview | `models/NutritionLog.js` |
| 8 | 20 Sep 17:02 | `860e1ba` | Mudit | main | feat(nutrition) Calories remaining & macro split ratio | `pages/Nutrition.js` |
| 9 | 20 Sep 17:02 | `26b1e37` | Mudit | main | feat(nutrition) Historical 7-day nutrition aggregation | `routes/nutrition.js` |
| 10 | 20 Sep 17:02 | `f18afd1` | Mudit | main | feat(dashboard) Command center, alerts banner, quick actions | `routes/dashboard.js`, `pages/DashBoard.js` |
| 11 | 20 Sep 17:21 | `b82dbc4` | Ishan | backend-integration | Strengthen user model validation | `models/User.js` |
| 12 | 20 Sep 17:28 | `8f8f7ac` | Ishan | backend-integration | Improve dashboard summary API | `routes/dashboard.js` |
| 13 | 20 Sep 17:31 | `1e79989` | Mudit | main | fix(dashboard) Clean up unused variables | `server.js`, `pages/DashBoard.js` |
| 14 | 20 Sep 17:35 | `54776ec` | Ishan | backend-integration | Resolve dashboard API integration | `routes/dashboard.js` |
| 15 | 20 Sep 17:44 | `2c70c17` | Ishan | backend-integration | Improve nutrition goals API | `routes/nutrition.js`, `models/User.js` |
| 16 | 20 Sep 17:46 | `8812b7e` | Ishan | backend-integration | Improve health tracking API | `routes/health.js` |
| 17 | 20 Sep 19:35 | `3a296b8` | Harsh | frontend-h | UI: modernize Academic goals page | `pages/Academic.js` |
| 18 | 20 Sep 19:49 | `9fb17df` | Harsh | academic-dashboard | Improve academic goals module | `pages/Academic.js` |
| 19 | 20 Sep 19:49 | `96948fb` | Harsh | academic-dashboard | Enhance dashboard statistics | `pages/DashBoard.js` |
| 20 | 20 Sep 19:49 | `fb66857` | Harsh | academic-dashboard | Improve responsive dashboard styling | `App.css`, `index.css` |
| 21 | 20 Sep 19:51 | `5c0ba7d` | Ishan | backend-integration | Resolve dashboard merge conflict | `routes/dashboard.js` |
| 22 | 20 Sep 19:53 | `bd9d791` | Ishan | backend-integration | Resolved health conflict | `routes/health.js` |
| 23 | 20 Sep 19:57 | `f158c8a` | Ishan | backend-integration | Resolve dashboard merge conflict | `routes/dashboard.js` |
| 24 | 20 Sep 20:12 | `4a2ce06` | Harsh | academic-dashboard | Goal deletion, goal filtering, quick water-log button | `routes/academic.js`, `pages/Academic.js`, `pages/DashBoard.js` |
| 25 | 20 Sep 21:39 | `29af6a1` | Harsh | academic-dashboard | Add DA2 evidence report and raw evidence files | `DA2_EVIDENCE.md`, `DA2_evidence/*` |
| 26 | 08 Oct 21:54 | `5ac989e` | Ishan | backend-integration | Dashboard insights, charts, milestones, profile, dark mode; fix health crash; secure documents | `utils/insights.js`, `routes/profile.js`, `routes/documents.js`, models, pages |
| 27 | 08 Oct 22:24 | `e796f72` | Ishan | backend-integration | Gemini-powered agentic AI Twin with confirmable actions | `agent/*`, `models/AgentAction.js`, `routes/agent.js` |
| 28 | 08 Oct 22:39 | `ede8f2e` | Ishan | backend-integration | Gemini retries and fallback | `agent/gemini.js` |
| 29 | 08 Oct 23:03 | `c79991c` | Ishan | backend-integration | Redesign + AI agent ("Living signal" UI) | `App.css`, components, all pages |
| 30 | 08 Oct 23:20 | `09a03ff` | Ishan | backend-integration | Merge `origin/main` into backend-integration (7 conflicts resolved) | merge |
| 31 | 08 Oct 23:20 | `4653b49` | Ishan | main | **Merge pull request #1** from backend-integration | merge |
| 32 | 08 Oct 23:29 | `3e8ca46` | Ishan | main | Blurred background | `App.css`, `App.js` |
| 33 | 10 Oct | *(this submission)* | Ishan | main | DA3: seed dataset, query scripts, evidence log, README, UML diagrams | `backend/scripts/*`, `docs/*`, `README.md` |

---

## 3. Contribution by member

### Ishan Kumar - Backend & Database
- **Database design:** the 8 Mongoose collections (`users`, `healthmetrics`, `nutritionlogs`, `academicgoals`, `documents`, `chatmessages`, `digitaltwinprofiles`, `agentactions`). Compound indexes `{user:1, date:-1}`, the text index on documents, the unique email index, embedded `milestones` and `nutritionGoals`.
- **API and security:** Express server, error handling, JWT auth and bcrypt hashing, ownership checks, and secure document streaming in place of public `/uploads`.
- **Aggregations:** dashboard summary, the insights engine and wellness score (`utils/insights.js`), and overdue-goal refresh.
- **Agentic AI:** Gemini function calling over 12 tools. Write actions are stored in `agentactions` and run only after the user confirms. Retries and a fallback model.
- **Integration:** resolved the merge conflicts with teammates' work, opened and merged PR #1, and did the full UI redesign.
- **DA3:** `scripts/seed.js`, `scripts/queries.js`, the UML diagrams (StarUML), this log and the README.

### Harsh Choudhary - Frontend (Academic & Dashboard)
- Modernised the Academic goals page and improved the goals module.
- Dashboard statistics and responsive styling.
- Goal deletion endpoint and goal filtering, plus a quick water-log button.
- Compiled the DA2 evidence report (`DA2_EVIDENCE.md`).

### Mudit Jayesh - Frontend (Health & Nutrition)
- Health page: expanded form fields, an alerts engine, and wearable-sync UI (Fitbit / Apple HealthKit).
- `GET /api/health/trends`: the 7- and 30-day aggregation pipeline.
- Nutrition: multi-item `items[]` subdocuments, calories remaining, macro split, and the 7-day history aggregation.
- Dashboard "command center": alerts banner, quick actions and activity feed.

---

## 4. Integration evidence

- **PR #1** (`backend-integration` → `main`, merged 08 Oct 2026, `4653b49`). It brought the backend hardening, the insights engine, the AI agent and the redesign onto `main`. Seven conflicting files were resolved by keeping both sides: Mudit's health and nutrition aggregations were ported into the redesigned pages.
- **Still open:** `frontend-h` (PR #2) and `academic-dashboard` hold Harsh's Academic and Dashboard UI work and the DA2 evidence. They are not yet merged into `main`.

---

## 5. Commands to reproduce this log

```bash
git log --all --date=format:'%Y-%m-%d %H:%M' --pretty='%h | %ad | %an | %s'
git shortlog -sne --all
git log --all --author="<name>" --stat
git branch -a
```
