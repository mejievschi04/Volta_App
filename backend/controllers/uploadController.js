const { buildImageUrl } = require('../utils/buildImageUrl');
const config = require('../config');

function uploadImage(req, res, next) {
  if (!req.file) {
    return res.status(400).json({ error: 'Nu s-a încărcat niciun fișier' });
  }
  const url = buildImageUrl(req.file.filename, config.port);
  res.json({ success: true, filename: req.file.filename, url });
}

module.exports = { uploadImage };
