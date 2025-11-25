const axios = require('axios');
const logger = require('./logger');

/**
 * Obtenir la localisation à partir d'une adresse IP
 * Utilise l'API gratuite ip-api.com (limite: 45 req/min)
 */
async function getLocationFromIP(ip) {
  // Ignorer les IPs locales
  if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return {
      country: 'Local',
      countryCode: 'LOCAL',
      region: '',
      city: 'Localhost',
      timezone: ''
    };
  }

  try {
    // API gratuite ip-api.com
    const response = await axios.get(`http://ip-api.com/json/${ip}`, {
      params: {
        fields: 'status,country,countryCode,region,regionName,city,timezone'
      },
      timeout: 5000
    });

    if (response.data.status === 'success') {
      return {
        country: response.data.country || '',
        countryCode: response.data.countryCode || '',
        region: response.data.regionName || '',
        city: response.data.city || '',
        timezone: response.data.timezone || ''
      };
    }

    logger.warn('IP geolocation failed', { ip, status: response.data.status });
    return getDefaultLocation();
  } catch (error) {
    logger.error('IP geolocation error', { ip, error: error.message });
    return getDefaultLocation();
  }
}

function getDefaultLocation() {
  return {
    country: 'Unknown',
    countryCode: '',
    region: '',
    city: '',
    timezone: ''
  };
}

module.exports = {
  getLocationFromIP
};
