// Firebase Admin SDK (optional, for persistence)
// Configure with service account key for production use
let db: any = null;

try {
  const admin = require("firebase-admin");
  
  if (!admin.apps.length) {
    // Initialize only if we have proper credentials
    // For now, just keep it commented to avoid errors
    // admin.initializeApp({
    //   credential: admin.credential.applicationDefault(),
    // });
  }
  
  // Only initialize Firestore if admin is properly set up
  // db = admin.firestore();
} catch (e) {
  console.warn("Firebase Admin not configured, skipping initialization");
}

export { db };
