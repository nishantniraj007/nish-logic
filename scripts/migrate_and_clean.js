const admin = require('firebase-admin');
const sa = require('/home/nishant/nish-logic/serviceaccount.json');
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function migrate() {
  console.log('📦 Fetching all vault docs...');
  const snap = await db.collection('vault').get();
  console.log(`Total docs found: ${snap.size}`);

  const batches = {};
  snap.forEach(doc => {
    const chunk_id = doc.data().chunk_id;
    if (!chunk_id) { console.log(`⚠️  Skipped doc ${doc.id} — no chunk_id`); return; }
    if (!batches[chunk_id]) batches[chunk_id] = [];
    batches[chunk_id].push({ id: doc.id, data: doc.data() });
  });

  for (const [chunk, docs] of Object.entries(batches)) {
    console.log(`➡️  Migrating ${docs.length} docs → ${chunk}`);
    let batch = db.batch();
    let count = 0;
    for (const doc of docs) {
      batch.set(db.collection(chunk).doc(doc.id), doc.data);
      count++;
      if (count % 499 === 0) { await batch.commit(); batch = db.batch(); }
    }
    await batch.commit();
    console.log(`✅ ${chunk} done`);
  }

  console.log('\n🗑️  Deleting vault collection...');
  const vaultSnap = await db.collection('vault').get();
  let delBatch = db.batch();
  let delCount = 0;
  for (const doc of vaultSnap.docs) {
    delBatch.delete(doc.ref);
    delCount++;
    if (delCount % 499 === 0) { await delBatch.commit(); delBatch = db.batch(); }
  }
  await delBatch.commit();
  console.log(`🗑️  Deleted ${delCount} docs from vault`);
  console.log('\n🎉 All done! vault is gone. 16 collections are live.');
  process.exit();
}

migrate().catch(e => { console.error('❌ Error:', e); process.exit(1); });
