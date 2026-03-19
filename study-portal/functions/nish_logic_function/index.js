const admin = require("firebase-admin");
admin.initializeApp({
  credential: admin.credential.cert(require("./serviceaccount.json"))
});
const db = admin.firestore();

module.exports = async (req, res) => {
  try {
    const level = req.query.level || "s";
    const col = level === "s" ? "bundle_ssc" : "bundle_upsc";

    // Fetch bundle_01 directly — no collection scan
    const doc = await db.collection(col).doc("bundle_01").get();
    if (!doc.exists) {
      res.send({ status: "error", message: "Bundle not found" });
      return;
    }

    res.send(doc.data());
  } catch (e) {
    res.send({ status: "error", message: e.toString() });
  }
};