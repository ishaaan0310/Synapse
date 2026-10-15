/**
 * Synapse - important MongoDB queries (DA3)
 *
 * Runs the queries the app depends on against the seeded demo user and
 * prints the query, its result and, where useful, the explain() plan so
 * you can show which index MongoDB used.
 *
 * Usage (from the backend folder, after `node scripts/seed.js`):
 *   node scripts/queries.js          run everything
 *   node scripts/queries.js 4        run only query 4 (handy in the viva)
 *   node scripts/queries.js indexes  list the indexes on every collection
 *
 * Queries:
 *   0  Indexes on every collection
 *   1  Range find + sort on the compound index  (IXSCAN vs COLLSCAN)
 *   2  Weekly health averages                   ($match/$group/$avg)
 *   3  Most eaten foods from embedded items     ($unwind on subdocuments)
 *   4  Sleep vs calories across modules         ($lookup with pipeline + $facet)
 *   5  Full-text document search                ($text + textScore, text index)
 *   6  Update one embedded milestone            (arrayFilters + pipeline update)
 *   7  Academic risk dashboard                  ($facet, $cond, date maths)
 */
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

const mongoose = require('mongoose');

const DEMO_EMAIL = process.env.DEMO_EMAIL || 'demo@synapse.dev';
const TZ = '+05:30'; // group by Indian calendar days, not UTC days

const DAY = 24 * 60 * 60 * 1000;
const ago = (days) => new Date(Date.now() - days * DAY);

// ------------------------------------------------------------------
// Printing helpers
// ------------------------------------------------------------------
const line = () => console.log('-'.repeat(78));
const title = (n, text) => {
  console.log('\n' + '='.repeat(78));
  console.log(`Q${n}. ${text}`);
  console.log('='.repeat(78));
};
const show = (label, value) => {
  console.log(`\n${label}`);
  console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
};
const table = (rows) => {
  if (!rows.length) return console.log('(no rows)');
  console.table(rows);
};

// Walk an explain() tree and pull out stage names + index names.
// Works for find and aggregate explains, classic and SBE engines.
function planSummary(explain) {
  const stages = [];
  const indexes = new Set();
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(visit);
    if (typeof node.stage === 'string') stages.push(node.stage);
    if (typeof node.indexName === 'string') indexes.add(node.indexName);
    for (const key of ['winningPlan', 'queryPlan', 'inputStage', 'inputStages', 'queryPlanner', 'stages', '$cursor', 'shards']) {
      if (node[key]) visit(node[key]);
    }
  };
  visit(explain);

  const findStats = (node) => {
    if (!node || typeof node !== 'object') return null;
    if (node.executionStats) return node.executionStats;
    if (Array.isArray(node.stages)) {
      for (const s of node.stages) {
        const r = findStats(s.$cursor || s);
        if (r) return r;
      }
    }
    return node.$cursor ? findStats(node.$cursor) : null;
  };
  const stats = findStats(explain) || {};

  return {
    plan: [...new Set(stages)].join(' <- ') || 'n/a',
    index: [...indexes].join(', ') || '(none - collection scan)',
    docsReturned: stats.nReturned,
    keysExamined: stats.totalKeysExamined,
    docsExamined: stats.totalDocsExamined,
    timeMs: stats.executionTimeMillis
  };
}

// ------------------------------------------------------------------
// Queries
// ------------------------------------------------------------------

async function q0Indexes(db) {
  title(0, 'Indexes defined on every collection');
  const names = ['users', 'healthmetrics', 'nutritionlogs', 'academicgoals', 'documents',
    'chatmessages', 'agentactions', 'digitaltwinprofiles'];
  const rows = [];
  for (const name of names) {
    const exists = await db.listCollections({ name }).hasNext();
    if (!exists) continue;
    const idx = await db.collection(name).indexes();
    idx.forEach((i) => rows.push({
      collection: name,
      index: i.name,
      keys: JSON.stringify(i.key),
      unique: i.unique ? 'yes' : ''
    }));
  }
  table(rows);
}

async function q1RangeFind(db, uid) {
  title(1, 'Poor-sleep nights in the last 14 days (range find on compound index)');
  const coll = db.collection('healthmetrics');
  const filter = { user: uid, date: { $gte: ago(14) }, sleepHours: { $lt: 6 } };
  const projection = { _id: 0, date: 1, sleepHours: 1, sleepQuality: 1, steps: 1, heartRate: 1 };
  const sort = { date: -1 };

  show('Query (mongosh):',
    'db.healthmetrics.find(\n' +
    '  { user: ObjectId(uid), date: { $gte: <14 days ago> }, sleepHours: { $lt: 6 } },\n' +
    '  { _id: 0, date: 1, sleepHours: 1, sleepQuality: 1, steps: 1, heartRate: 1 }\n' +
    ').sort({ date: -1 })');

  const rows = await coll.find(filter, { projection }).sort(sort).toArray();
  console.log('\nResult:');
  table(rows.map((r) => ({ ...r, date: r.date.toISOString().slice(0, 10) })));

  const withIndex = planSummary(await coll.find(filter, { projection }).sort(sort).explain('executionStats'));
  const noIndex = planSummary(await coll.find(filter, { projection }).sort(sort).hint({ $natural: 1 }).explain('executionStats'));
  console.log('\nexplain("executionStats") - with index vs forced collection scan:');
  table([
    { run: 'uses { user: 1, date: -1 }', ...withIndex },
    { run: 'hint({ $natural: 1 })', ...noIndex }
  ]);
  console.log('The index lets MongoDB read only this user\'s last 14 days, already sorted by date.');
}

async function q2WeeklyHealth(db, uid) {
  title(2, 'Weekly health averages (aggregation pipeline)');
  const pipeline = [
    { $match: { user: uid, date: { $gte: ago(28) } } },
    {
      $group: {
        _id: { $dateToString: { format: '%G-W%V', date: '$date', timezone: TZ } },
        days: { $sum: 1 },
        avgSleep: { $avg: '$sleepHours' },
        avgSteps: { $avg: '$steps' },
        avgHeartRate: { $avg: '$heartRate' },
        avgWaterL: { $avg: '$waterIntake' },
        minWeight: { $min: '$weight' },
        maxWeight: { $max: '$weight' }
      }
    },
    {
      $project: {
        _id: 0,
        week: '$_id',
        days: 1,
        avgSleep: { $round: ['$avgSleep', 1] },
        avgSteps: { $round: ['$avgSteps', 0] },
        avgHeartRate: { $round: ['$avgHeartRate', 0] },
        avgWaterL: { $round: ['$avgWaterL', 1] },
        weightRange: { $concat: [{ $toString: '$minWeight' }, ' - ', { $toString: '$maxWeight' }] }
      }
    },
    { $sort: { week: 1 } }
  ];
  show('Pipeline:', pipeline.map((s) => (s.$match ? { $match: { user: 'ObjectId(uid)', date: { $gte: '<28 days ago>' } } } : s)));
  const coll = db.collection('healthmetrics');
  console.log('\nResult:');
  table(await coll.aggregate(pipeline).toArray());
  console.log('\nexplain():');
  table([planSummary(await coll.aggregate(pipeline).explain('executionStats'))]);
  console.log('Used by: GET /api/health/trends (7/30-day analytics view).');
}

async function q3TopFoods(db, uid) {
  title(3, 'Most eaten foods - $unwind on the embedded items[] array');
  const pipeline = [
    { $match: { user: uid, date: { $gte: ago(30) } } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.name',
        timesEaten: { $sum: 1 },
        totalCalories: { $sum: '$items.calories' },
        avgProtein: { $avg: '$items.protein' },
        meals: { $addToSet: '$mealType' }
      }
    },
    { $sort: { timesEaten: -1, totalCalories: -1 } },
    { $limit: 6 },
    {
      $project: {
        _id: 0,
        food: '$_id',
        timesEaten: 1,
        totalCalories: { $round: ['$totalCalories', 0] },
        avgProteinG: { $round: ['$avgProtein', 1] },
        meals: 1
      }
    }
  ];
  show('Pipeline:', pipeline.map((s) => (s.$match ? { $match: { user: 'ObjectId(uid)', date: { $gte: '<30 days ago>' } } } : s)));
  console.log('\nResult:');
  table((await db.collection('nutritionlogs').aggregate(pipeline).toArray())
    .map((r) => ({ ...r, meals: r.meals.sort().join(', ') })));
  console.log('Each meal log embeds its food items, so one document = one meal with all its items.');
}

async function q4SleepVsCalories(db, uid) {
  title(4, 'Cross-module: does poor sleep change how much you eat? ($lookup + $facet)');
  const pipeline = [
    { $match: { user: uid, date: { $gte: ago(30) } } },
    { $addFields: { day: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: TZ } } } },
    {
      $lookup: {
        from: 'nutritionlogs',
        let: { u: '$user', d: '$day' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$user', '$$u'] },
                  { $eq: [{ $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: TZ } }, '$$d'] }
                ]
              }
            }
          },
          { $group: { _id: null, calories: { $sum: '$calories' }, protein: { $sum: '$protein' }, meals: { $sum: 1 } } }
        ],
        as: 'food'
      }
    },
    { $unwind: { path: '$food', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0, day: 1, sleepHours: 1, steps: 1,
        calories: { $ifNull: ['$food.calories', 0] },
        protein: { $ifNull: ['$food.protein', 0] }
      }
    },
    {
      $facet: {
        lastSevenDays: [{ $sort: { day: -1 } }, { $limit: 7 }, { $sort: { day: 1 } }],
        bySleep: [
          {
            $group: {
              _id: { $cond: [{ $lt: ['$sleepHours', 6] }, 'under 6h sleep', '6h+ sleep'] },
              days: { $sum: 1 },
              avgCalories: { $avg: '$calories' },
              avgProtein: { $avg: '$protein' },
              avgSteps: { $avg: '$steps' }
            }
          },
          {
            $project: {
              _id: 0, group: '$_id', days: 1,
              avgCalories: { $round: ['$avgCalories', 0] },
              avgProteinG: { $round: ['$avgProtein', 1] },
              avgSteps: { $round: ['$avgSteps', 0] }
            }
          },
          { $sort: { group: 1 } }
        ]
      }
    }
  ];
  show('Pipeline (healthmetrics -> nutritionlogs):',
    'healthmetrics: $match user + last 30 days\n' +
    '  -> $addFields day = $dateToString(date, IST)\n' +
    '  -> $lookup nutritionlogs WHERE same user AND same day, $group calories/protein\n' +
    '  -> $unwind -> $project\n' +
    '  -> $facet { lastSevenDays, bySleep: $group on $cond(sleepHours < 6) }');
  const [res] = await db.collection('healthmetrics').aggregate(pipeline).toArray();
  console.log('\nResult - last 7 days:');
  table(res.lastSevenDays);
  console.log('\nResult - grouped by sleep:');
  table(res.bySleep);
  console.log('Same idea powers GET /api/health/cross-module-correlation (health <-> academic goals).');
}

async function q5TextSearch(db, uid) {
  title(5, 'Full-text search in the document vault ($text + relevance score)');
  const coll = db.collection('documents');
  const term = 'health insurance';
  const filter = { user: uid, $text: { $search: term } };
  const projection = { _id: 0, title: 1, category: 1, tags: 1, expiryDate: 1, score: { $meta: 'textScore' } };

  show('Query (mongosh):',
    `db.documents.find(\n  { user: ObjectId(uid), $text: { $search: "${term}" } },\n` +
    '  { title: 1, category: 1, tags: 1, score: { $meta: "textScore" } }\n' +
    ').sort({ score: { $meta: "textScore" } })');
  const rows = await coll.find(filter, { projection }).sort({ score: { $meta: 'textScore' } }).toArray();
  console.log('\nResult:');
  table(rows.map((r) => ({
    title: r.title, category: r.category, tags: r.tags.join(', '),
    score: Math.round(r.score * 100) / 100,
    expires: r.expiryDate ? r.expiryDate.toISOString().slice(0, 10) : ''
  })));
  console.log('\nexplain():');
  table([planSummary(await coll.find(filter, { projection }).explain('executionStats'))]);

  const soon = await coll.find(
    { user: uid, expiryDate: { $gte: new Date(), $lte: new Date(Date.now() + 30 * DAY) } },
    { projection: { _id: 0, title: 1, expiryDate: 1 } }
  ).sort({ expiryDate: 1 }).toArray();
  console.log('\nBonus - documents expiring in the next 30 days:');
  table(soon.map((d) => ({ title: d.title, expires: d.expiryDate.toISOString().slice(0, 10) })));
}

async function q6MilestoneUpdate(db, uid, keep) {
  title(6, 'Update one embedded milestone (arrayFilters) and recompute progress');
  const coll = db.collection('academicgoals');
  const goalFilter = { user: uid, title: 'Operating Systems CAT-2' };
  const snapshot = async () => {
    const g = await coll.findOne(goalFilter, { projection: { _id: 0, title: 1, progress: 1, milestones: 1 } });
    return g && {
      progress: g.progress,
      milestones: g.milestones.map((m) => `${m.completed ? '[x]' : '[ ]'} ${m.title}`).join('  ')
    };
  };

  const recomputeProgress = [{
    $set: {
      progress: {
        $round: [{
          $multiply: [100, {
            $divide: [
              { $size: { $filter: { input: '$milestones', cond: '$$this.completed' } } },
              { $max: [1, { $size: '$milestones' }] }
            ]
          }]
        }, 0]
      }
    }
  }];

  const setDeadlocks = (completed) => coll.updateOne(
    goalFilter,
    { $set: { 'milestones.$[m].completed': completed } },
    { arrayFilters: [{ 'm.title': 'Deadlocks' }] }
  );

  show('Step 1 - positional update with arrayFilters:',
    'db.academicgoals.updateOne(\n' +
    '  { user: ObjectId(uid), title: "Operating Systems CAT-2" },\n' +
    '  { $set: { "milestones.$[m].completed": true } },\n' +
    '  { arrayFilters: [ { "m.title": "Deadlocks" } ] }\n)');
  show('Step 2 - pipeline update recomputes progress from the array:',
    'db.academicgoals.updateOne({ ... }, [ { $set: { progress:\n' +
    '  round(100 * size(filter(milestones, completed)) / size(milestones)) } } ])');

  const before = await snapshot();
  if (!before) return console.log('Goal not found - run `node scripts/seed.js` first.');

  const r1 = await setDeadlocks(true);
  await coll.updateOne(goalFilter, recomputeProgress);
  const after = await snapshot();
  console.log('\nResult:');
  table([{ state: 'before', ...before }, { state: 'after', ...after }]);
  console.log(`matched=${r1.matchedCount} modified=${r1.modifiedCount} - only one array element changed, no read-modify-write in Node.`);

  if (!keep) {
    await setDeadlocks(false);
    await coll.updateOne(goalFilter, recomputeProgress);
    console.log('(reverted so the demo can be repeated - pass --keep to keep the change)');
  }
}

async function q7AcademicRisk(db, uid) {
  title(7, 'Academic risk dashboard in one round trip ($facet)');
  const now = new Date();
  const inAWeek = new Date(Date.now() + 7 * DAY);
  const pipeline = [
    { $match: { user: uid } },
    {
      $facet: {
        byStatus: [
          { $group: { _id: '$status', goals: { $sum: 1 }, avgProgress: { $avg: '$progress' } } },
          { $project: { _id: 0, status: '$_id', goals: 1, avgProgress: { $round: ['$avgProgress', 0] } } },
          { $sort: { goals: -1 } }
        ],
        atRisk: [
          {
            $match: {
              status: { $ne: 'completed' },
              $or: [
                { deadline: { $lt: now } },
                { deadline: { $lte: inAWeek }, progress: { $lt: 50 } }
              ]
            }
          },
          {
            $project: {
              _id: 0, title: 1, progress: 1, priority: 1,
              daysLeft: { $round: [{ $divide: [{ $subtract: ['$deadline', now] }, DAY] }, 0] },
              milestonesDone: {
                $concat: [
                  { $toString: { $size: { $filter: { input: { $ifNull: ['$milestones', []] }, cond: '$$this.completed' } } } },
                  '/',
                  { $toString: { $size: { $ifNull: ['$milestones', []] } } }
                ]
              }
            }
          },
          { $sort: { daysLeft: 1 } }
        ]
      }
    }
  ];
  show('Pipeline:',
    '$match user -> $facet {\n' +
    '  byStatus: $group status, count, $avg progress\n' +
    '  atRisk:   not completed AND (deadline passed OR due in 7 days with progress < 50)\n}');
  const [res] = await db.collection('academicgoals').aggregate(pipeline).toArray();
  console.log('\nResult - goals by status:');
  table(res.byStatus);
  console.log('\nResult - goals at risk:');
  table(res.atRisk);
  console.log('Feeds the dashboard alerts and the wellness score in utils/insights.js.');
}

// ------------------------------------------------------------------
async function main() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not defined. Add it to backend/.env first.');

  const arg = (process.argv[2] || 'all').toLowerCase();
  const keep = process.argv.includes('--keep');

  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  const info = await db.admin().command({ buildInfo: 1 }).catch(() => ({}));
  console.log(`Connected to "${db.databaseName}"${info.version ? ` (MongoDB ${info.version})` : ''}`);

  const user = await db.collection('users').findOne({ email: DEMO_EMAIL }, { projection: { name: 1 } });
  if (!user && arg !== 'indexes' && arg !== '0') {
    throw new Error(`No user ${DEMO_EMAIL}. Run "node scripts/seed.js" first.`);
  }
  const uid = user && user._id;
  if (user) console.log(`Running as ${user.name} <${DEMO_EMAIL}>  _id=${uid}`);
  line();

  const all = {
    0: () => q0Indexes(db),
    1: () => q1RangeFind(db, uid),
    2: () => q2WeeklyHealth(db, uid),
    3: () => q3TopFoods(db, uid),
    4: () => q4SleepVsCalories(db, uid),
    5: () => q5TextSearch(db, uid),
    6: () => q6MilestoneUpdate(db, uid, keep),
    7: () => q7AcademicRisk(db, uid)
  };
  const key = arg === 'indexes' ? '0' : arg;

  if (key === 'all') {
    for (const k of Object.keys(all)) await all[k]();
  } else if (all[key]) {
    await all[key]();
  } else {
    throw new Error(`Unknown query "${arg}". Use 0-7, "indexes" or nothing for all.`);
  }
  console.log('\nDone.');
}

main()
  .catch((err) => {
    console.error('\nQuery run failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
