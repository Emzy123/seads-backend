const admin = require('../config/firebase');

/**
 * Sends a Firebase Cloud Messaging push notification to a single device.
 * @param {string} fcmToken - The recipient device's FCM token
 * @param {string} title - Notification title
 * @param {string} body - Notification body text
 * @param {Object} data - Extra key/value data payload sent to the app
 */
async function sendPushNotification(fcmToken, title, body, data = {}) {
  if (!fcmToken) {
    console.warn('[FCM] No FCM token provided — skipping notification.');
    return null;
  }

  const message = {
    token: fcmToken,
    notification: { title, body },
    // Data payload is always stringified key/value pairs
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)])
    ),
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        channelId: 'seads_emergency',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
        },
      },
    },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log(`[FCM] Notification sent successfully: ${response}`);
    return response;
  } catch (error) {
    console.error(`[FCM] Failed to send notification: ${error.message}`);
    return null;
  }
}

/**
 * Notifies a paramedic that they have been dispatched to an emergency.
 */
async function notifyParamedicDispatched({ paramedicFcmToken, incidentId, emergencyType, patientName }) {
  return sendPushNotification(
    paramedicFcmToken,
    '🚨 EMERGENCY DISPATCH',
    `${emergencyType} — Patient: ${patientName || 'Unknown'}. Respond immediately.`,
    { type: 'dispatch', incident_id: String(incidentId) }
  );
}

/**
 * Notifies a patient that an ambulance is en route.
 */
async function notifyPatientEnRoute({ patientFcmToken, incidentId, estimatedMinutes }) {
  return sendPushNotification(
    patientFcmToken,
    '🚑 Ambulance On The Way',
    estimatedMinutes
      ? `Help is ${estimatedMinutes} minutes away. Stay calm.`
      : 'An ambulance has been dispatched to your location. Stay calm.',
    { type: 'en_route', incident_id: String(incidentId) }
  );
}

/**
 * Notifies a patient that the paramedic has arrived.
 */
async function notifyPatientOnScene({ patientFcmToken, incidentId }) {
  return sendPushNotification(
    patientFcmToken,
    '✅ Paramedic Arrived',
    'The paramedic has arrived at your location.',
    { type: 'on_scene', incident_id: String(incidentId) }
  );
}

module.exports = {
  sendPushNotification,
  notifyParamedicDispatched,
  notifyPatientEnRoute,
  notifyPatientOnScene,
};
