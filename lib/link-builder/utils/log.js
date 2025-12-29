export function logEvent(comercio_id, eventType, userAgent = '', referrer = '', extra = {}) {
  console.log(`[LOG] ${comercio_id} | ${eventType} | UA: ${userAgent} | Ref: ${referrer}`, extra);
}
