import admin from "firebase-admin";
import { readFile } from "fs/promises";

let serviceAccount;

// Prefer environment variables (for Vercel / production)
if (
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY
) {
  serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // Replace escaped newlines so the key works from env vars
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  };
} else {
  // Fallback for local development: read serviceAccountKey.json from disk
  serviceAccount = JSON.parse(
    await readFile(new URL("../serviceAccountKey.json", import.meta.url))
  );
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;