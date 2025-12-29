// Utility to build user_data for Bolna API calls
// Always includes contactName if available

/**
 * Build user_data object for Bolna API calls
 * @param {Object} params
 * @param {string} [params.callId]
 * @param {string} [params.leadId]
 * @param {string} [params.contactName]
 * @param {string} [params.organizationId]
 * @param {Object} [params.extra] - Any extra fields to include
 * @returns {Object}
 */
function buildBolnaUserData({ callId, leadId, contactName, organizationId, extra = {} }) {
  const userData = { ...extra };
  if (callId) userData.callId = callId;
  if (leadId) userData.leadId = leadId;
  if (contactName) userData.contactName = contactName;
  if (organizationId) userData.organizationId = organizationId;
  return userData;
}

export { buildBolnaUserData };
