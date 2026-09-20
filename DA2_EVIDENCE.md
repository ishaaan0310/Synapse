# DA2 Evidence Report - Synapse (NoSQL Databases)

## TASK 1: Project and Source Analysis

### 1. Repository Tree (Excluding node_modules, .git, uploads)
*(Refer to `DA2_evidence/tree.txt` for the full raw tree output)*
```
backend\middleware\authMiddleware.js
backend\models\AcademicGoal.js
backend\models\ChatMessage.js
backend\models\DigitalTwinProfile.js
backend\models\Document.js
backend\models\HealthMetrics.js
backend\models\NutritionLog.js
backend\models\User.js
backend\package-lock.json
backend\package.json
backend\routes\academic.js
backend\routes\auth.js
backend\routes\chat.js
backend\routes\dashboard.js
backend\routes\digitalTwin.js
backend\routes\documents.js
backend\routes\goals.js
backend\routes\health.js
backend\routes\nutrition.js
backend\server.js
frontend\.gitignore
frontend\package-lock.json
frontend\package.json
frontend\public\favicon.ico
frontend\public\index.html
frontend\public\logo192.png
frontend\public\logo512.png
frontend\public\manifest.json
frontend\public\robots.txt
frontend\README.md
frontend\src\App.css
frontend\src\App.js
frontend\src\context\AuthContext.js
frontend\src\index.css
frontend\src\index.js
frontend\src\pages\Academic.js
frontend\src\pages\Chat.js
frontend\src\pages\DashBoard.js
frontend\src\pages\Document.js
frontend\src\pages\Health.js
frontend\src\pages\Login.js
frontend\src\pages\Nutrition.js
frontend\src\pages\Register.js
frontend\src\utils\api.js
```

### 2. Dependencies (`package.json`)
**Backend Dependencies (`backend/package.json`)**:
- `express`: ^4.18.2
- `mongoose`: ^8.0.0 (Installed)
- `cors`: ^2.8.5 (Installed)
- `dotenv`: ^16.3.1
- `bcryptjs`: ^2.4.3 (Installed)
- `jsonwebtoken`: ^9.0.2 (Installed)
- `multer`: ^1.4.5-lts.1 (Installed)
- `redis`: ^4.6.0

**Frontend Dependencies (`frontend/package.json`)**:
- `axios`: ^1.20.0 (Installed)
- `react`: ^19.2.8
- `react-dom`: ^19.2.8
- `react-router-dom`: ^7.18.2
- `react-scripts`: 5.0.1
- `web-vitals`: ^2.1.4

### 3. MongoDB Connection Code
Found in `backend/server.js`:
```javascript
const startServer = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000
    });
    console.log('✅ MongoDB Connected');
// ...
```

### 4. Mongoose Models
#### AcademicGoal (`backend/models/AcademicGoal.js`)
Collection Name: `academicgoals` (Pluralized by Mongoose)
| Field | Type | Constraints / Ref / Default |
|-------|------|---------------------------|
| user | ObjectId | Required, Ref: 'User' |
| title | String | Required |
| description | String | |
| category | String | Required, Enum: ['exam', 'project', 'assignment', 'course'] |
| deadline | Date | Required |
| priority | String | Default: 'medium', Enum: ['low', 'medium', 'high'] |
| progress | Number | Default: 0, Min: 0, Max: 100 |
| milestones | Array of Subdocuments | Schema: { title: String (Required), completed: Boolean (Default: false), dueDate: Date } |
| status | String | Default: 'not-started', Enum: ['not-started', 'in-progress', 'completed', 'overdue'] |
| createdAt | Date | Default: Date.now |

```javascript
const academicGoalSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: String,
  category: { type: String, enum: ['exam', 'project', 'assignment', 'course'], required: true },
  deadline: { type: Date, required: true },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  milestones: [milestoneSchema],
  status: { type: String, enum: ['not-started', 'in-progress', 'completed', 'overdue'], default: 'not-started' },
  createdAt: { type: Date, default: Date.now }
});
```

#### ChatMessage (`backend/models/ChatMessage.js`)
Collection Name: `chatmessages`
Indexes: `{ user: 1, timestamp: -1 }`
| Field | Type | Constraints / Ref / Default |
|-------|------|---------------------------|
| user | ObjectId | Required, Ref: 'User' |
| role | String | Required, Enum: ['user', 'assistant'] |
| content | String | Required |
| module | String | Default: 'general', Enum: ['health', 'nutrition', 'academic', 'document', 'general'] |
| timestamp | Date | Default: Date.now |

```javascript
const chatMessageSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  module: { type: String, enum: ['health', 'nutrition', 'academic', 'document', 'general'], default: 'general' },
  timestamp: { type: Date, default: Date.now }
});
chatMessageSchema.index({ user: 1, timestamp: -1 });
```

#### DigitalTwinProfile (`backend/models/DigitalTwinProfile.js`)
Collection Name: `digitaltwinprofiles`
| Field | Type | Constraints / Ref / Default |
|-------|------|---------------------------|
| user | ObjectId | Required, Unique, Ref: 'User' |
| healthSummary | Subdocument | Fields: avgSleep, avgSteps, weightTrend, lastUpdated |
| nutritionSummary | Subdocument | Fields: avgDailyCalories, preferredMeals (Array of Strings), dietaryPattern |
| academicSummary | Subdocument | Fields: completedGoals, pendingGoals, avgProgress, riskGoals (Array of ObjectIds) |
| recommendations | Array of Subdocs | Fields: module, message, priority (Enum), dismissed (Boolean, Default: false), createdAt (Date, Default: Date.now) |
| lastSynced | Date | Default: Date.now |

```javascript
const digitalTwinProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  healthSummary: { avgSleep: Number, avgSteps: Number, weightTrend: String, lastUpdated: Date },
  nutritionSummary: { avgDailyCalories: Number, preferredMeals: [String], dietaryPattern: String },
  academicSummary: { completedGoals: Number, pendingGoals: Number, avgProgress: Number, riskGoals: [mongoose.Schema.Types.ObjectId] },
  recommendations: [{ module: String, message: String, priority: { type: String, enum: ['low', 'medium', 'high'] }, dismissed: { type: Boolean, default: false }, createdAt: { type: Date, default: Date.now } }],
  lastSynced: { type: Date, default: Date.now }
});
```

#### Document (`backend/models/Document.js`)
Collection Name: `documents`
Indexes: `{ title: 'text', ocrText: 'text', tags: 'text' }` (Text Index)
| Field | Type | Constraints / Ref / Default |
|-------|------|---------------------------|
| user | ObjectId | Required, Ref: 'User' |
| title | String | Required |
| fileName | String | |
| fileUrl | String | Required |
| fileType | String | Enum: ['pdf', 'docx', 'jpg', 'png', 'other'] |
| category | String | Enum: ['id', 'certificate', 'medical', 'academic', 'insurance', 'other'] |
| tags | Array of Strings | |
| expiryDate | Date | |
| ocrText | String | |
| metadata.extractedFields | Mixed | Flexible schema |
| uploadedAt | Date | Default: Date.now |

```javascript
const documentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  fileName: String,
  fileUrl: { type: String, required: true },
  fileType: { type: String, enum: ['pdf', 'docx', 'jpg', 'png', 'other'] },
  category: { type: String, enum: ['id', 'certificate', 'medical', 'academic', 'insurance', 'other'] },
  tags: [String],
  expiryDate: Date,
  ocrText: String,
  metadata: { extractedFields: mongoose.Schema.Types.Mixed },
  uploadedAt: { type: Date, default: Date.now }
});
documentSchema.index({ title: 'text', ocrText: 'text', tags: 'text' });
```

#### HealthMetric (`backend/models/HealthMetrics.js`)
Collection Name: `healthmetrics`
Indexes: `{ user: 1, date: -1 }`
| Field | Type | Constraints / Ref / Default |
|-------|------|---------------------------|
| user | ObjectId | Required, Ref: 'User' |
| date | Date | Default: Date.now |
| weight | Number | |
| height | Number | |
| sleepHours | Number | |
| sleepQuality | String | Enum: ['poor', 'fair', 'good', 'excellent'] |
| steps | Number | |
| heartRate | Number | |
| waterIntake | Number | |
| source | String | Default: 'manual', Enum: ['manual', 'fitbit', 'healthkit'] |
| notes | String | |

```javascript
const healthMetricSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  weight: Number,
  height: Number,
  sleepHours: Number,
  sleepQuality: { type: String, enum: ['poor', 'fair', 'good', 'excellent'] },
  steps: Number,
  heartRate: Number,
  waterIntake: Number,
  source: { type: String, enum: ['manual', 'fitbit', 'healthkit'], default: 'manual' },
  notes: String
});
healthMetricSchema.index({ user: 1, date: -1 });
```

#### NutritionLog (`backend/models/NutritionLog.js`)
Collection Name: `nutritionlogs`
Indexes: `{ user: 1, date: -1 }`
| Field | Type | Constraints / Ref / Default |
|-------|------|---------------------------|
| user | ObjectId | Required, Ref: 'User' |
| mealType | String | Required, Enum: ['breakfast', 'lunch', 'dinner', 'snack'] |
| foodName | String | Required |
| items | Array of Subdocs| Schema: { name: String (Req), calories: Number, protein: Number, carbs: Number, fat: Number } |
| calories | Number | |
| protein | Number | |
| carbs | Number | |
| fat | Number | |
| imageUrl | String | |
| date | Date | Default: Date.now |

```javascript
const nutritionLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mealType: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snack'], required: true },
  foodName: { type: String, required: true },
  items: [foodItemSchema],
  calories: Number,
  protein: Number,
  carbs: Number,
  fat: Number,
  imageUrl: String,
  date: { type: Date, default: Date.now }
});
nutritionLogSchema.index({ user: 1, date: -1 });
```

#### User (`backend/models/User.js`)
Collection Name: `users`
| Field | Type | Constraints / Ref / Default |
|-------|------|---------------------------|
| name | String | Required |
| email | String | Required, Unique |
| password | String | Required |
| profilePicture| String | Default: '' |
| nutritionGoals| Subdocument | Fields: calories (Number, Default: 2000), protein (Number, Default: 100) |
| createdAt | Date | Default: Date.now |
| updatedAt | Date | Default: Date.now |

```javascript
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profilePicture: { type: String, default: '' },
  nutritionGoals: { calories: { type: Number, default: 2000 }, protein: { type: Number, default: 100 } },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
```

### 5. API Endpoints Analysis
| Endpoint | Method | JWT Protected? | Models Used | Mongoose Operations | CRUD |
|----------|--------|----------------|-------------|---------------------|------|
| `/api/auth/register` | POST | No | User | `findOne`, `save` (create) | Create, Read |
| `/api/auth/login` | POST | No | User | `findOne` | Read |
| `/api/academic/` | POST | Yes | AcademicGoal | `save` (create) | Create |
| `/api/academic/` | GET | Yes | AcademicGoal | `find`, `sort` | Read |
| `/api/academic/:id/progress` | PATCH | Yes | AcademicGoal | `findOneAndUpdate` | Update |
| `/api/academic/:id` | DELETE | Yes | AcademicGoal | `findOneAndDelete` | Delete |
| `/api/chat/` | GET | Yes | ChatMessage | `find`, `sort`, `limit` | Read |
| `/api/chat/` | POST | Yes | ChatMessage, HealthMetric, NutritionLog, AcademicGoal | `save` (create), `findOne`, `sort`, `find` | Create, Read |
| `/api/dashboard/` | GET | Yes | AcademicGoal, HealthMetric, NutritionLog, Document, User | `countDocuments`, `findOne`, `sort`, `find`, `findById`, `select`, `limit` | Read |
| `/api/digital-twin/:userId` | GET | No (No authMW) | DigitalTwinProfile, HealthMetric, AcademicGoal, NutritionLog | `findOne`, `find`, `sort`, `limit`, `save` (create/update) | Read, Create |
| `/api/documents/upload` | POST | Yes | Document | `save` (create) | Create |
| `/api/documents/` | GET | Yes | Document | `find`, `sort` | Read |
| `/api/documents/search` | GET | Yes | Document | `find` (with text search), `sort` | Read |
| `/api/documents/expiry` | GET | Yes | Document | `find`, `sort` | Read |
| `/api/goals/` | GET | Yes | User | `findById`, `select` | Read |
| `/api/goals/` | PUT | Yes | User | `findByIdAndUpdate`, `select` | Update |
| `/api/health/` | POST | Yes | HealthMetric | `save` (create) | Create |
| `/api/health/` | GET | Yes | HealthMetric | `find`, `sort` | Read |
| `/api/health/trends` | GET | Yes | HealthMetric | `aggregate` ($match, $group, $avg, $sum) | Read |
| `/api/health/alerts` | GET | Yes | HealthMetric | `findOne`, `sort` | Read |
| `/api/health/sync-wearable` | POST | Yes | HealthMetric | `save` (create) | Create |
| `/api/health/cross-module-correlation`| GET | Yes | HealthMetric | `aggregate` ($match, $group, $avg, $lookup) | Read |
| `/api/nutrition/` | POST | Yes | NutritionLog | `save` (create) | Create |
| `/api/nutrition/daily` | GET | Yes | NutritionLog, User | `find`, `sort`, `findById`, `select` | Read |
| `/api/nutrition/` | GET | Yes | NutritionLog | `find`, `sort` | Read |
| `/api/nutrition/history-trends` | GET | Yes | NutritionLog | `aggregate` ($match, $group, $sum, $sort) | Read |

**Exact line quotes for Academic Goals and Dashboard Statistics Handlers**:
Academic Create:
```javascript
router.post('/', authMiddleware, async (req, res) => {
// ...
    const goal = new AcademicGoal({ user: req.userId, title, description, category, deadline, priority });
    await goal.save();
    res.status(201).json(goal);
```
Academic Read:
```javascript
router.get('/', authMiddleware, async (req, res) => {
// ...
    const goals = await AcademicGoal.find({ user: req.userId }).sort({ deadline: 1 });
```
Academic Update:
```javascript
router.patch('/:id/progress', authMiddleware, async (req, res) => {
// ...
    const goal = await AcademicGoal.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { progress, status: progress === 100 ? 'completed' : progress > 0 ? 'in-progress' : 'not-started' },
      { new: true }
    );
```
Academic Delete:
```javascript
router.delete('/:id', authMiddleware, async (req, res) => {
// ...
    const goal = await AcademicGoal.findOneAndDelete({ _id: req.params.id, user: req.userId });
```
Dashboard Statistics:
```javascript
router.get('/', authMiddleware, async (req, res) => {
// ...
    const [goals, healthLogsCount, mealsCount, documentsCount, latestHealth, todayMeals, user, recentHealthLogs, recentMealsList] = await Promise.all([
      AcademicGoal.countDocuments({ user: userId }),
      HealthMetric.countDocuments({ user: userId }),
      NutritionLog.countDocuments({ user: userId }),
      Document.countDocuments({ user: userId }),
      HealthMetric.findOne({ user: userId }).sort({ date: -1 }),
      NutritionLog.find({ user: userId, date: { $gte: startOfDay, $lte: endOfDay } }),
      User.findById(userId).select('nutritionGoals'),
      HealthMetric.find({ user: userId }).sort({ date: -1 }).limit(3),
      NutritionLog.find({ user: userId }).sort({ date: -1 }).limit(3)
    ]);
```

### 6. Aggregation and Index Searching
- `backend/routes/nutrition.js` (Line 176): `const trends = await NutritionLog.aggregate([`
- `backend/routes/nutrition.js` (Line 178): `{ $match: { user: userId, date: { $gte: sevenDaysAgo } } }`
- `backend/routes/nutrition.js` (Line 184): `$group: { _id: { $dateToString: ... }, totalCalories: { $sum: "$calories" } ...`
- `backend/routes/health.js` (Line 88): `HealthMetric.aggregate([`
- `backend/routes/health.js` (Line 91): `$group: { avgSleep: { $avg: '$sleepHours' }, totalLogs: { $sum: 1 } ...`
- `backend/routes/health.js` (Line 232): `const correlation = await HealthMetric.aggregate([`
- `backend/routes/health.js` (Line 242): `$lookup: { from: "academicgoals", localField: "_id", foreignField: "week", as: "goals" }`
- `backend/models/NutritionLog.js` (Line 24): `nutritionLogSchema.index({ user: 1, date: -1 });`
- `backend/models/HealthMetrics.js` (Line 18): `healthMetricSchema.index({ user: 1, date: -1 });`
- `backend/models/Document.js` (Line 20): `documentSchema.index({ title: 'text', ocrText: 'text', tags: 'text' });`
- `backend/models/ChatMessage.js` (Line 11): `chatMessageSchema.index({ user: 1, timestamp: -1 });`

### 7. Frontend Axios Code
Axios Client Setup (`frontend/src/utils/api.js`):
```javascript
import axios from 'axios';
const api = axios.create({ baseURL: 'http://localhost:5000/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('synapse_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (error) => Promise.reject(error));
export default api;
```
Calls to Backend:
- **Academic**: `await api.get('/academic');`, `await api.post('/academic', form);`, `await api.patch('/academic/${id}/progress', ...);`, `await api.delete('/academic/${id}');` (in `Academic.js`)
- **Dashboard**: `const response = await api.get('/dashboard');` (in `DashBoard.js`)
- **Login**: `const response = await api.post('/auth/login', { email, password });` (in `AuthContext.js` used by `Login.js`)
- **Register**: `const response = await api.post('/auth/register', { name, email, password });` (in `AuthContext.js` used by `Register.js`)

### 8. Database Scripts / Environment
- Seed files, `.sql`, data exports, `docker-compose.yml`, `Dockerfile`: **NOT FOUND**

---

## TASK 2: Git History

| Commit | Author | Date | Message | Files changed | Category |
|--------|--------|------|---------|---------------|----------|
| 4a2ce06 | Harsh | 2026-09-20 | Add goal deletion, goal filtering, and quick water log button | 3 | Backend / Frontend |
| fb66857 | Harsh | 2026-09-20 | Improve responsive dashboard styling | 2 | Frontend |
| 96948fb | Harsh | 2026-09-20 | Enhance dashboard statistics | 1 | Frontend |
| 9fb17df | Harsh | 2026-09-20 | Improve academic goals module | 1 | Frontend |
| 3a296b8 | Harsh | 2026-09-20 | UI: modernize Academic goals page | 1 | Frontend |
| 8812b7e | Ishan Kumar | 2026-09-20 | Improve health tracking API | 1 | Backend |
| 2c70c17 | Ishan Kumar | 2026-09-20 | Improve nutrition goals API | 1 | Backend |
| 54776ec | Ishan Kumar | 2026-09-20 | Resolve dashboard API integration | 1 | Backend |
| 1e79989 | GalaxyPhoenix | 2026-09-20 | fix(dashboard) Clean up unused variables... | 2 | Frontend / Backend |
| 8f8f7ac | Ishan Kumar | 2026-09-20 | Improve dashboard summary API | 1 | Backend |
| b82dbc4 | Ishan Kumar | 2026-09-20 | Strengthen user model validation | 1 | Database / Backend |
| f18afd1 | GalaxyPhoenix | 2026-09-20 | feat(dashboard) Digital Twin command center... | 2 | Frontend / Backend |
| 26b1e37 | GalaxyPhoenix | 2026-09-20 | feat(nutrition) Historical 7 day Nutrition... | 1 | Backend |
| 860e1ba | GalaxyPhoenix | 2026-09-20 | feat(nutrition) Calories Remaining calculation... | 1 | Frontend |
| 6142b85 | GalaxyPhoenix | 2026-09-20 | feat(nutrition) Multi item subdocuments array... | 1 | Database / Backend |
| 8375644 | GalaxyPhoenix | 2026-09-20 | feat(health) 7 day & 30 day Health trend... | 1 | Backend |
| 9bc31c9 | GalaxyPhoenix | 2026-09-20 | feat(health) Health alerts engine & Wearable Sync... | 1 | Frontend |
| 46a0f75 | GalaxyPhoenix | 2026-09-20 | feat(health) Complete schema alignment... | 1 | Database / Backend |
| 22a29ec | Ishan Kumar | 2026-09-17 | Improve authentication and JWT security | 3 | Backend |
| b8aa7aa | Ishan Kumar | 2026-09-17 | improved backend server handling and... | 1 | Backend |
| b9d29ed | Ishan Kumar | 2026-09-17 | Initial Synapse project | 45 | All Categories |

**Author Summaries:**
- **Harsh**: Changed 8 files overall. Added backend DELETE route for academic goals. On frontend, added goal filtering, goal deletion UI, dashboard water log button, modernized Academic goals layout, enhanced dashboard styling and layout structure.
- **Ishan Kumar**: Changed 55 files overall. Initialized the whole project. Improved backend authentication, error handling, dashboard API integration, health API, and nutrition goals API logic. Removed some validation in `User.js`.
- **GalaxyPhoenix**: Changed 10 files overall. Added advanced aggregation pipelines for health and nutrition, added alerts and wearable mock sync to frontend health page, upgraded the dashboard frontend overview UI, and expanded database schemas (`HealthMetrics.js`, `NutritionLog.js`).

---

## TASK 3: Live Database Evidence
*(All raw outputs have been saved to `DA2_evidence/`)*

### 1. MongoDB Container Check
**Command Run:** `docker ps`
**Result:** MongoDB is verified running.
**Container Name:** `synapse-mongo` (Up 5 hours, running on port 27017).

### 2. Live Database Queries
**Command Run:** `show dbs`
```
admin    40.00 KiB
config  108.00 KiB
local    72.00 KiB
synapse  40.00 KiB
```

**Command Run:** `show collections` (in `synapse` database)
```
academicgoals
chatmessages
digitaltwinprofiles
documents
healthmetrics
nutritionlogs
users
```

**Command Run:** Collection Counts using `db.getCollection(c).countDocuments()`
```
academicgoals: 1
chatmessages: 0
digitaltwinprofiles: 0
documents: 0
healthmetrics: 0
nutritionlogs: 0
users: 1
```
*(Verified: The database is created, schemas are successfully translating into MongoDB collections, and 1 user + 1 academic goal have been inserted into the live database.)*
