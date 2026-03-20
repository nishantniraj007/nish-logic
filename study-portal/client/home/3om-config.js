/**
 * 3om-config.js
 * Constants only — URLs, cache, level mapping.
 */
window.OM_CONFIG = {
  ZOHO_API: '/server/nish_logic_function',
  CACHE_EXPIRY_MS: 4 * 24 * 60 * 60 * 1000, // 4 days
  LEVEL_MAP: {
    easy:   'e',
    medium: 'm',
    ssc:    's',
    upsc:   'u'
  }
};
