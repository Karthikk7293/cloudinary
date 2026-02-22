/**
 * Seed script: creates the Firestore SUPER_ADMIN user document.
 * Run:  npx tsx scripts/seed-admin.ts
 */

import { initializeApp, cert, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { config } from "dotenv";

config({ path: ".env.local" });

const serviceAccount: ServiceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
};

const app = initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_EMAIL = "pms@spacez.co";
const ADMIN_PASSWORD = "SpacezPMS2026!";

async function seed() {
  console.log("Seeding super admin...\n");

  let uid: string | null = null;

  // Try to get or create Auth user — if Auth isn't configured, skip it
  try {
    const existing = await auth.getUserByEmail(ADMIN_EMAIL);
    uid = existing.uid;
    console.log(`Auth user found: ${uid}`);
  } catch {
    console.log("Auth lookup failed. Trying to create user...");
    try {
      const created = await auth.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        emailVerified: true,
      });
      uid = created.uid;
      console.log(`Auth user created: ${uid}`);
    } catch (e: unknown) {
      console.log("Auth create failed:", e instanceof Error ? e.message : e);
      console.log("\n!! Email/Password sign-in is NOT enabled in your Firebase project.");
      console.log("   Go to: Firebase Console > Authentication > Sign-in method");
      console.log("   Enable 'Email/Password', then re-run this script.\n");
      console.log("Writing Firestore doc with placeholder UID for now...\n");
      uid = "super-admin-placeholder";
    }
  }

  // Write Firestore document
  const userDoc = {
    uid,
    email: ADMIN_EMAIL,
    role: "SUPER_ADMIN",
    status: "ACTIVE",
    access: {
      canUpload: true,
      canDelete: true,
      canCreateFolder: true,
      canManageAdmins: true,
    },
    createdAt: Date.now(),
  };

  await db.collection("cloudinary_admins").doc(uid).set(userDoc, { merge: true });
  console.log(`Firestore cloudinary_admins/${uid} written with SUPER_ADMIN role.`);
  console.log(`\nCredentials:`);
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
