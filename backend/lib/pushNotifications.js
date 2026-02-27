/**
 * Trimitere notificări push către dispozitive Expo.
 * Doc: https://docs.expo.dev/push-notifications/sending-notifications/
 */
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK_SIZE = 100;

/**
 * Trimite o notificare push la toate token-urile Expo înregistrate.
 * @param {string[]} tokens - array de ExpoPushToken[...]
 * @param {string} title
 * @param {string} body
 * @param {object} [data] - date suplimentare (ex: { type: 'notification', id: 123 })
 */
async function sendPushToTokens(tokens, title, body, data = {}) {
  if (!tokens || tokens.length === 0) {
    console.log('[Push] Niciun token înregistrat – notificarea nu se trimite pe niciun dispozitiv.');
    return;
  }
  const valid = tokens.filter((t) => t && String(t).trim().length > 10);
  if (valid.length === 0) {
    console.log('[Push] Niciun token valid (format așteptat: ExpoPushToken[...]).');
    return;
  }
  const withPrefix = valid.filter((t) => String(t).startsWith('ExpoPushToken['));
  const toSend = withPrefix.length > 0 ? withPrefix : valid;
  if (withPrefix.length === 0 && valid.length > 0) {
    console.warn('[Push] Token-urile nu încep cu ExpoPushToken[ – se încearcă oricum.');
  }

  console.log('[Push] Trimitere notificare la', toSend.length, 'dispozitiv(e)...');

  const messages = toSend.map((to) => ({
    to,
    sound: 'default',
    title: title || 'Volta',
    body: body || '',
    data: { ...data },
  }));

  for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
    const chunk = messages.slice(i, i + CHUNK_SIZE);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(chunk),
      });
      const text = await res.text();
      if (!res.ok) {
        console.error('[Push] Expo API error:', res.status, text);
      } else if (text) {
        try {
          const json = JSON.parse(text);
          if (json.data && Array.isArray(json.data) && json.data.some((d) => d.status === 'error')) {
            console.warn('[Push] Expo a returnat erori pentru unii destinatari:', JSON.stringify(json.data));
          }
        } catch (_) {}
      }
    } catch (err) {
      console.error('[Push] Send error:', err.message);
    }
  }
}

module.exports = { sendPushToTokens };
