/**
 * Synapse - sample dataset seeder (DA3)
 *
 * Creates one demo user and ~30 days of realistic data across every
 * collection so the dashboard, charts, AI Twin and queries.js all have
 * something to show.
 *
 * SAFE TO RE-RUN: it only deletes data that belongs to the demo user,
 * never anyone else's.
 *
 * Usage (from the backend folder):
 *   node scripts/seed.js
 *
 * Demo login afterwards:
 *   email:    demo@synapse.dev
 *   password: demo1234
 */
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

const fs = require('fs');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const HealthMetric = require('../models/HealthMetrics');
const NutritionLog = require('../models/NutritionLog');
const AcademicGoal = require('../models/AcademicGoal');
const Document = require('../models/Document');
const ChatMessage = require('../models/ChatMessage');
const DigitalTwinProfile = require('../models/DigitalTwinProfile');
const AgentAction = require('../models/AgentAction');

const DEMO_EMAIL = 'demo@synapse.dev';
const DEMO_PASSWORD = 'demo1234';
const DAYS = 30;

// Small deterministic random generator so every run gives the same data
let seed = 42;
const rand = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};
const between = (min, max) => min + rand() * (max - min);
const round = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const daysAgo = (n, hour = 9) => {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
};
const daysAhead = (n) => daysAgo(-n, 23);

const MEALS = {
  breakfast: [
    { name: 'Oats with banana', calories: 320, protein: 11, carbs: 58, fat: 6 },
    { name: 'Poha', calories: 270, protein: 6, carbs: 50, fat: 5 },
    { name: 'Egg omelette (2 eggs)', calories: 190, protein: 13, carbs: 2, fat: 14 },
    { name: 'Idli sambar', calories: 280, protein: 9, carbs: 52, fat: 3 }
  ],
  lunch: [
    { name: 'Dal rice', calories: 480, protein: 17, carbs: 82, fat: 8 },
    { name: 'Paneer roti thali', calories: 620, protein: 26, carbs: 70, fat: 24 },
    { name: 'Chicken biryani', calories: 700, protein: 32, carbs: 85, fat: 24 },
    { name: 'Rajma chawal', calories: 520, protein: 19, carbs: 88, fat: 9 }
  ],
  dinner: [
    { name: 'Chapati with mixed veg', calories: 420, protein: 12, carbs: 62, fat: 13 },
    { name: 'Grilled chicken salad', calories: 380, protein: 38, carbs: 14, fat: 18 },
    { name: 'Masala dosa', calories: 450, protein: 9, carbs: 64, fat: 17 },
    { name: 'Khichdi', calories: 360, protein: 13, carbs: 60, fat: 7 }
  ],
  snack: [
    { name: 'Greek yogurt', calories: 120, protein: 12, carbs: 8, fat: 4 },
    { name: 'Apple', calories: 95, protein: 0.5, carbs: 25, fat: 0.3 },
    { name: 'Roasted chana', calories: 160, protein: 9, carbs: 22, fat: 3 },
    { name: 'Protein shake', calories: 180, protein: 25, carbs: 8, fat: 3 }
  ]
};

const buildHealth = (userId) => {
  const rows = [];
  let weight = 72.4;
  for (let i = DAYS - 1; i >= 0; i--) {
    const examWeek = i <= 9 && i >= 3; // a stressful exam week -> less sleep
    const sleepHours = round(examWeek ? between(4.6, 6.4) : between(6.3, 8.4));
    weight += between(-0.18, 0.12);
    rows.push({
      user: userId,
      date: daysAgo(i, 8),
      weight: round(weight),
      height: 175,
      sleepHours,
      sleepQuality: sleepHours < 5.5 ? 'poor' : sleepHours < 6.5 ? 'fair' : sleepHours < 7.8 ? 'good' : 'excellent',
      steps: Math.round(examWeek ? between(3200, 7000) : between(6500, 12500)),
      heartRate: Math.round(examWeek ? between(76, 92) : between(62, 78)),
      waterIntake: round(between(1.4, 3.4)),
      source: i % 4 === 0 ? 'fitbit' : i % 7 === 0 ? 'healthkit' : 'manual',
      notes: examWeek && i === 6 ? 'Late-night revision before DBMS exam' : undefined
    });
  }
  return rows;
};

const buildNutrition = (userId) => {
  const rows = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    ['breakfast', 'lunch', 'dinner', 'snack'].forEach((mealType, idx) => {
      if (mealType === 'snack' && rand() < 0.35) return; // skip some snacks
      const items = [pick(MEALS[mealType])];
      if (mealType !== 'snack' && rand() < 0.4) items.push(pick(MEALS.snack));
      const total = (k) => round(items.reduce((s, it) => s + (it[k] || 0), 0));
      rows.push({
        user: userId,
        mealType,
        foodName: items.map((it) => it.name).join(' + '),
        items,
        calories: total('calories'),
        protein: total('protein'),
        carbs: total('carbs'),
        fat: total('fat'),
        date: daysAgo(i, [8, 13, 20, 17][idx])
      });
    });
  }
  return rows;
};

const buildGoals = (userId) => [
  {
    user: userId,
    title: 'DBMS DA3 - Synapse final report',
    description: 'Report, seed data, queries, evidence log and viva',
    category: 'project',
    deadline: daysAhead(0),
    priority: 'high',
    progress: 80,
    status: 'in-progress',
    milestones: [
      { title: 'Seed script and sample dataset', completed: true, dueDate: daysAgo(1) },
      { title: 'Five demo queries with explain()', completed: true, dueDate: daysAgo(1) },
      { title: 'Project evidence log', completed: true, dueDate: daysAgo(0) },
      { title: 'Final report PDF', completed: false, dueDate: daysAhead(0) }
    ],
    createdAt: daysAgo(14)
  },
  {
    user: userId,
    title: 'Operating Systems CAT-2',
    category: 'exam',
    deadline: daysAhead(6),
    priority: 'high',
    progress: 35,
    status: 'in-progress',
    milestones: [
      { title: 'Process scheduling', completed: true },
      { title: 'Deadlocks', completed: false },
      { title: 'Memory management', completed: false }
    ],
    createdAt: daysAgo(10)
  },
  {
    user: userId,
    title: 'Computer Networks lab record',
    category: 'assignment',
    deadline: daysAhead(3),
    priority: 'medium',
    progress: 60,
    status: 'in-progress',
    milestones: [
      { title: 'Experiments 1-5', completed: true },
      { title: 'Experiments 6-8', completed: false }
    ],
    createdAt: daysAgo(12)
  },
  {
    user: userId,
    title: 'Coursera - MongoDB Basics',
    category: 'course',
    deadline: daysAhead(20),
    priority: 'low',
    progress: 20,
    status: 'in-progress',
    createdAt: daysAgo(8)
  },
  {
    user: userId,
    title: 'Java OOP assignment 2',
    category: 'assignment',
    deadline: daysAgo(4),
    priority: 'medium',
    progress: 45,
    status: 'overdue',
    createdAt: daysAgo(20)
  },
  {
    user: userId,
    title: 'DBMS DA2 - Review 2',
    category: 'project',
    deadline: daysAgo(20),
    priority: 'high',
    progress: 100,
    status: 'completed',
    milestones: [
      { title: 'ER model and schema', completed: true },
      { title: 'CRUD and queries', completed: true }
    ],
    createdAt: daysAgo(30)
  },
  {
    user: userId,
    title: 'Discrete Maths quiz',
    category: 'exam',
    deadline: daysAgo(9),
    priority: 'medium',
    progress: 100,
    status: 'completed',
    createdAt: daysAgo(18)
  }
];

const buildDocuments = (userId) => [
  {
    user: userId,
    title: 'VIT Student ID Card',
    fileName: 'student-id.png',
    fileUrl: '/uploads/demo-student-id.png',
    fileType: 'png',
    category: 'id',
    tags: ['vit', 'identity', 'college'],
    expiryDate: daysAhead(600),
    ocrText: 'Vellore Institute of Technology student identity card Chennai campus',
    uploadedAt: daysAgo(25)
  },
  {
    user: userId,
    title: 'Health insurance policy',
    fileName: 'insurance.pdf',
    fileUrl: '/uploads/demo-insurance.pdf',
    fileType: 'pdf',
    category: 'insurance',
    tags: ['insurance', 'health', 'policy'],
    expiryDate: daysAhead(21), // expires soon -> shows in alerts / Q5
    ocrText: 'Family floater health insurance policy cashless hospitalisation',
    metadata: { extractedFields: { policyNo: 'DEMO-0001', insurer: 'Sample Insurance Co.' } },
    uploadedAt: daysAgo(22)
  },
  {
    user: userId,
    title: 'Blood test report',
    fileName: 'blood-report.pdf',
    fileUrl: '/uploads/demo-blood-report.pdf',
    fileType: 'pdf',
    category: 'medical',
    tags: ['medical', 'blood', 'vitamin'],
    ocrText: 'Complete blood count haemoglobin vitamin D vitamin B12 levels normal',
    uploadedAt: daysAgo(15)
  },
  {
    user: userId,
    title: 'MongoDB course certificate',
    fileName: 'mongo-cert.pdf',
    fileUrl: '/uploads/demo-mongo-cert.pdf',
    fileType: 'pdf',
    category: 'certificate',
    tags: ['mongodb', 'database', 'certificate'],
    ocrText: 'Certificate of completion MongoDB aggregation framework and indexing',
    uploadedAt: daysAgo(5)
  },
  {
    user: userId,
    title: 'Semester 3 grade sheet',
    fileName: 'grades.pdf',
    fileUrl: '/uploads/demo-grades.pdf',
    fileType: 'pdf',
    category: 'academic',
    tags: ['grades', 'semester', 'academic'],
    ocrText: 'Grade sheet database management systems operating systems GPA',
    uploadedAt: daysAgo(3)
  }
];


// Tiny placeholder files so the demo documents open in the vault
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkaPhfDwAEhgGAWj0B5QAAAABJRU5ErkJggg==', 'base64'
);
const placeholderPdf = (text) => {
  const safe = text.replace(/[()\\]/g, '');
  const stream = `BT /F1 20 Tf 72 720 Td (${safe}) Tj 0 -30 Td /F1 12 Tf (Synapse demo document - sample data) Tj ET`;
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  ];
  let out = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => { out += `${String(o).padStart(10, '0')} 00000 n \n`; });
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
};
const writePlaceholders = (docs) => {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  docs.forEach((d) => {
    const file = path.join(UPLOAD_DIR, path.basename(d.fileUrl));
    if (!fs.existsSync(file)) fs.writeFileSync(file, d.fileType === 'png' ? PNG_1PX : placeholderPdf(d.title));
  });
};

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not defined. Add it to backend/.env first.');
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  console.log(`Connected to database "${mongoose.connection.name}"`);

  // 1. Demo user (create or reset)
  let user = await User.findOne({ email: DEMO_EMAIL });
  if (user) {
    const id = user._id;
    await Promise.all([
      HealthMetric.deleteMany({ user: id }),
      NutritionLog.deleteMany({ user: id }),
      AcademicGoal.deleteMany({ user: id }),
      Document.deleteMany({ user: id }),
      ChatMessage.deleteMany({ user: id }),
      DigitalTwinProfile.deleteMany({ user: id }),
      AgentAction.deleteMany({ user: id })
    ]);
    console.log('Cleared previous demo data');
  } else {
    user = await User.create({
      name: 'Demo Student',
      email: DEMO_EMAIL,
      password: await bcrypt.hash(DEMO_PASSWORD, 10),
      nutritionGoals: { calories: 1900, protein: 80, carbs: 240, fat: 65 }
    });
    console.log('Created demo user');
  }

  const uid = user._id;

  // 2. Bulk inserts (insertMany = one round trip per collection)
  const health = await HealthMetric.insertMany(buildHealth(uid));
  const meals = await NutritionLog.insertMany(buildNutrition(uid));
  const goals = await AcademicGoal.insertMany(buildGoals(uid));
  const docs = await Document.insertMany(buildDocuments(uid));
  writePlaceholders(docs);

  // 3. Chat history + one AI-agent action waiting for confirmation
  const userMsg = await ChatMessage.create({
    user: uid, role: 'user', module: 'academic',
    content: 'Mark the "Deadlocks" milestone of my OS exam as done', timestamp: new Date(Date.now() - 60000)
  });
  const reply = await ChatMessage.create({
    user: uid, role: 'assistant', module: 'academic', source: 'agent',
    content: 'I can mark "Deadlocks" as completed for Operating Systems CAT-2. Please confirm.',
    timestamp: new Date(Date.now() - 30000)
  });
  const osGoal = goals.find((g) => g.title.startsWith('Operating Systems'));
  const deadlocks = osGoal.milestones.find((m) => m.title === 'Deadlocks');
  const action = await AgentAction.create({
    user: uid,
    message: reply._id,
    tool: 'set_milestone_status',
    args: { goalId: String(osGoal._id), milestoneId: String(deadlocks._id), completed: true },
    summary: 'Complete milestone "Deadlocks"',
    details: ['Goal: Operating Systems CAT-2'],
    status: 'pending',
    createdAt: new Date() // pending actions expire after 24h
  });
  reply.actions = [action._id];
  await reply.save();
  await ChatMessage.create({
    user: uid, role: 'user', module: 'health',
    content: 'How has my sleep been this week?', timestamp: daysAgo(1, 22)
  });
  await ChatMessage.create({
    user: uid, role: 'assistant', module: 'health', source: 'rules',
    content: 'Your average sleep over the last 7 days is below 6 hours. Try to protect at least 7 hours before your OS exam.',
    timestamp: daysAgo(1, 22)
  });

  // 4. Digital twin snapshot
  const last7 = health.slice(-7);
  const avg = (arr, k) => round(arr.reduce((s, r) => s + (r[k] || 0), 0) / arr.length);
  await DigitalTwinProfile.create({
    user: uid,
    healthSummary: {
      avgSleep: avg(last7, 'sleepHours'),
      avgSteps: Math.round(avg(last7, 'steps')),
      weightTrend: health[health.length - 1].weight < health[0].weight ? 'decreasing' : 'stable',
      lastUpdated: new Date()
    },
    nutritionSummary: {
      avgDailyCalories: Math.round(meals.reduce((s, m) => s + m.calories, 0) / DAYS),
      preferredMeals: ['Dal rice', 'Oats with banana'],
      dietaryPattern: 'balanced'
    },
    academicSummary: {
      completedGoals: goals.filter((g) => g.status === 'completed').length,
      pendingGoals: goals.filter((g) => g.status !== 'completed').length,
      avgProgress: Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length),
      riskGoals: goals.filter((g) => g.status === 'overdue').map((g) => g._id)
    },
    recommendations: [
      { module: 'health', message: 'Sleep dropped during exam week - aim for 7h tonight.', priority: 'high' },
      { module: 'academic', message: 'Java OOP assignment 2 is overdue.', priority: 'high' },
      { module: 'nutrition', message: 'Protein is below goal on 4 of the last 7 days.', priority: 'medium' }
    ]
  });

  // 5. Make sure every schema index exists before queries.js runs explain()
  await Promise.all(
    [User, HealthMetric, NutritionLog, AcademicGoal, Document, ChatMessage, DigitalTwinProfile, AgentAction]
      .map((m) => m.syncIndexes())
  );

  console.log('\nSeed complete:');
  console.table({
    healthmetrics: health.length,
    nutritionlogs: meals.length,
    academicgoals: goals.length,
    documents: docs.length,
    chatmessages: 4,
    agentactions: 1,
    digitaltwinprofiles: 1
  });
  console.log(`\nLogin with ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`Demo user _id: ${uid}`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
