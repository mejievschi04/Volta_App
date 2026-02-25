/**
 * Construiește URL complet pentru imagini din uploads
 */
const path = require('path');
const config = require('../config');

function buildImageUrl(imagePath, port = config.port) {
  if (!imagePath) return null;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  let cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
  if (cleanPath.startsWith('uploads/')) {
    cleanPath = cleanPath.replace('uploads/', '');
  }
  const baseUrl = config.imageBaseUrl || `http://localhost:${port}`;
  return `${baseUrl}/uploads/${cleanPath}`;
}

module.exports = { buildImageUrl };
