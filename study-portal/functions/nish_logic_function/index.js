const express = require('express');
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert(require('./serviceaccount.json'))
});

const db = admin.firestore();
const app = express();

// Level param → bundle collection map
const LEVEL_MAP = {
  's':      'bundle_ssc',
  'u':      'bundle_upsc',
  'e':      'bundle_easy',
  'm':      'bundle_medium',
  'n':      'bundle_neet',
  'i':      'bundle_iit',
  'clat_e': 'bundle_clat'
};

app.get('/', async (req, res) => {
  try {
    const level = req.query.level || 's';
    const col = LEVEL_MAP[level];
    if (!col) {
      return res.status(400).json({ status: 'error', message: `Unknown level: ${level}` });
    }

    // List all bundle docs, pick one at random
    const snap = await db.collection(col).get();
    const docs = snap.docs.filter(d => d.id !== '_template');
    if (docs.length === 0) {
      return res.status(404).json({ status: 'error', message: `No bundles found in ${col}` });
    }

    const randomDoc = docs[Math.floor(Math.random() * docs.length)];
    const data = randomDoc.data();
    console.log(`✅ Serving ${col}/${randomDoc.id} — ${(data.questions||[]).length} questions`);

    return res.status(200).json(data);
  } catch (e) {
    console.error('Function error:', e);
    return res.status(500).json({ status: 'error', message: e.toString() });
  }
});

module.exports = app;
