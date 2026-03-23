import { initializeApp }                                                           from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut }
                                                                                   from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs,
         writeBatch, serverTimestamp, deleteDoc, getCountFromServer }               from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey:            "AIzaSyC4LVCOG7sWN3SJS4-ygFeAlfocyBissTY",
  authDomain:        "nish-logic.firebaseapp.com",
  projectId:         "nish-logic",
  storageBucket:     "nish-logic.firebasestorage.app",
  messagingSenderId: "673867776160",
  appId:             "1:673867776160:web:7d72b4e50c569fb55489c5"
};

const app            = initializeApp(firebaseConfig);
const auth           = getAuth(app);
const db             = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// ── Auth helpers ──────────────────────────────────────────────────────────────
// Components call window.Firebase.fbSignInWithPopup() etc — NOT auth.method()
const fbSignInWithPopup    = (provider) => signInWithPopup(auth, provider);
const fbOnAuthStateChanged = (cb)       => onAuthStateChanged(auth, cb);
const fbSignOut            = ()         => signOut(auth);

// ── Firestore helpers ─────────────────────────────────────────────────────────
const fsDoc        = (colName, docId) => doc(db, colName, docId);
const fsCollection = (colName)        => collection(db, colName);
const fsSetDoc     = (ref, data)      => setDoc(ref, data);
const fsGetDoc     = (ref)            => getDoc(ref);
const fsGetDocs    = (ref)            => getDocs(ref);
const fsGetCount   = (ref)            => getCountFromServer(ref);
const fsWriteBatch = ()               => writeBatch(db);
const fsDeleteDoc  = (ref)            => deleteDoc(ref);
const fsTimestamp  = ()               => serverTimestamp();

export {
  auth, db, googleProvider,
  fbSignInWithPopup, fbOnAuthStateChanged, fbSignOut,
  fsDoc, fsCollection, fsSetDoc, fsGetDoc, fsGetDocs,
  fsGetCount, fsWriteBatch, fsDeleteDoc, fsTimestamp,
  doc, setDoc, getDoc, collection, getDocs,
  writeBatch, serverTimestamp, deleteDoc, getCountFromServer
};
