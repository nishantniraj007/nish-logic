// ── pack-bundles.js ──
// Packs question chunks into 500-question bundle docs in Firestore
// Run: node scripts/pack-bundles.js [level]
// Example: node scripts/pack-bundles.js easy
// Example: node scripts/pack-bundles.js all

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({ credential: cert('/home/nishant/nish-logic/serviceaccount.json') });
const db = getFirestore();

// ── Bundle compositions ──
const BUNDLE_CONFIG = {
  easy:   { cols: { qa_e:100, lr_e:100, sgk_e:150, ca_e:150 }, bundleCol: 'bundle_easy' },
  medium: { cols: { qa_m:100, lr_m:100, sgk_m:150, ca_m:150 }, bundleCol: 'bundle_medium' },
  ssc:    { cols: { qa_s:100, lr_s:100, sgk_s:100, ca_s:100, eng_s:50, comp_s:50 }, bundleCol: 'bundle_ssc' },
  upsc:   { cols: { qa_u:100, lr_u:100, sgk_u:100, ca_u:100, eng_u:50, comp_u:50 }, bundleCol: 'bundle_upsc' },
  neet:   { cols: { phy_n:150, chem_n:150, bio_n:200 }, bundleCol: 'bundle_neet' },
  iit:    { cols: { phy_i:150, chem_i:150, mat_i:200 }, bundleCol: 'bundle_iit' },
  clat:   { cols: { eng_clat:500 }, bundleCol: 'bundle_clat' }
};

// ── Fisher-Yates shuffle ──
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Pick N random docs from a collection (excluding templates) ──
async function pickRandom(colName, count) {
  const snap = await db.collection(colName).get();
  const docs = snap.docs.filter(d => {
    const data = d.data();
    return !data._template && !data.template && d.id !== '_template';
  });

  if (docs.length < count) {
    throw new Error(`❌ ${colName} has ${docs.length} real docs but needs ${count}`);
  }

  shuffle(docs);
  return docs.slice(0, count);
}

// ── Get next bundle number ──
async function getNextBundleId(bundleCol) {
  const snap = await db.collection(bundleCol).get();
  const existing = snap.docs.filter(d => d.id !== '_template').length;
  const num = String(existing + 1).padStart(2, '0');
  return `bundle_${num}`;
}

// ── Pack one level ──
async function packLevel(levelKey) {
  const config = BUNDLE_CONFIG[levelKey];
  if (!config) {
    console.log(`❌ Unknown level: ${levelKey}. Options: ${Object.keys(BUNDLE_CONFIG).join(', ')}`);
    return;
  }

  console.log(`\n📦 Packing: ${levelKey.toUpperCase()}...`);

  // Check all collections have enough docs
  for (const [col, needed] of Object.entries(config.cols)) {
    const snap = await db.collection(col).get();
    const real = snap.docs.filter(d => !d.data()._template && d.id !== '_template').length;
    if (real < needed) {
      console.log(`❌ ${col}: only ${real} real docs, needs ${needed}. Aborting ${levelKey}.`);
      return;
    }
    console.log(`✅ ${col}: ${real} available, picking ${needed}`);
  }

  // Pick questions from each collection
  const allQuestions = [];
  const docsTodelete = [];

  for (const [col, needed] of Object.entries(config.cols)) {
    const picked = await pickRandom(col, needed);
    for (const d of picked) {
      allQuestions.push({ ...d.data(), _sourceCol: col, _sourceId: d.id });
      docsTodelete.push({ col, id: d.id });
    }
  }

  // Shuffle the final 500
  shuffle(allQuestions);

  // Get bundle doc ID
  const bundleId = await getNextBundleId(config.bundleCol);

  // Write bundle doc
  await db.collection(config.bundleCol).doc(bundleId).set({
    bundleId,
    level: levelKey,
    totalQuestions: allQuestions.length,
    createdAt: new Date().toISOString(),
    questions: allQuestions
  });

  console.log(`✅ Bundle written: ${config.bundleCol}/${bundleId} (${allQuestions.length} questions)`);

  // Delete original docs in batches of 500
  console.log(`🗑️  Deleting ${docsTodelete.length} original docs...`);
  const batchSize = 400;
  for (let i = 0; i < docsTodelete.length; i += batchSize) {
    const batch = db.batch();
    const chunk = docsTodelete.slice(i, i + batchSize);
    for (const { col, id } of chunk) {
      batch.delete(db.collection(col).doc(id));
    }
    await batch.commit();
    console.log(`   Deleted batch ${Math.floor(i/batchSize)+1}`);
  }

  console.log(`🎯 ${levelKey.toUpperCase()} packed successfully!\n`);
}

// ── Main ──
async function main() {
  const arg = process.argv[2] || '';
  if (!arg) {
    console.log('Usage: node scripts/pack-bundles.js [level|all]');
    console.log('Levels:', Object.keys(BUNDLE_CONFIG).join(', '));
    process.exit(0);
  }

  if (arg === 'all') {
    for (const key of Object.keys(BUNDLE_CONFIG)) {
      await packLevel(key);
    }
  } else {
    await packLevel(arg.toLowerCase());
  }

  console.log('✅ Done.');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });