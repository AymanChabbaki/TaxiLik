const https = require('https');
const User = require('../models/User');

async function _sendToToken(pushToken, title, body, data) {
  const message = JSON.stringify({ to: pushToken, title, body, data, sound: 'default' });
  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'exp.host',
        path: '/--/api/v2/push/send',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(message),
          Accept: 'application/json',
        },
      },
      (res) => {
        res.resume();
        res.on('end', resolve);
      }
    );
    req.on('error', () => resolve());
    req.write(message);
    req.end();
  });
}

/**
 * Send a push notification to a user by their MongoDB _id.
 * Fire-and-forget — never throws, never blocks the request.
 */
async function sendPushToUser(userId, title, body, data = {}) {
  try {
    const user = await User.findById(userId).select('pushToken').lean();
    const token = user?.pushToken;
    if (!token || !token.startsWith('ExponentPushToken[')) return;
    await _sendToToken(token, title, body, data);
  } catch {
    // push is always best-effort
  }
}

module.exports = { sendPushToUser };
