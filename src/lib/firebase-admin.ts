import {
  initializeApp,
  getApps,
  cert,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function ensureInitialized() {
  if (!getApps().length) {
    const serviceAccount: ServiceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    };
    initializeApp({ credential: cert(serviceAccount) });
  }
}

export const adminAuth: Auth = new Proxy({} as Auth, {
  get(_, prop) {
    ensureInitialized();
    const auth = getAuth();
    return Reflect.get(auth, prop, auth);
  },
});

export const adminDb: Firestore = new Proxy({} as Firestore, {
  get(_, prop) {
    ensureInitialized();
    const db = getFirestore();
    return Reflect.get(db, prop, db);
  },
});
