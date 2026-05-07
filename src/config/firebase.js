const admin = require('firebase-admin');

/**
 * Initialize Firebase Admin SDK once.
 *
 * On Render (or any non-Google-Cloud host), set the environment variable:
 *   FIREBASE_SERVICE_ACCOUNT_BASE64
 *
 * Generate it locally with:
 *   base64 -i serviceAccountKey.json | tr -d '\n'
 *
 * On Google Cloud (Cloud Run, App Engine, etc.) applicationDefault() is used
 * automatically — no extra env var needed.
 */
if (!admin.apps.length) {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (b64) {
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    } catch {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT_BASE64 is set but could not be parsed as JSON. ' +
        'Make sure it is valid base64-encoded JSON.'
      );
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    // Falls back to GOOGLE_APPLICATION_CREDENTIALS env var or ADC on GCP
    admin.initializeApp();
  }
}

module.exports = admin;
