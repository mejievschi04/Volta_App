/**
 * Configurare Multer pentru upload imagini
 */
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const config = require('./index');

const uploadsDir = path.isAbsolute(config.uploads.dir)
  ? config.uploads.dir
  : path.join(__dirname, '..', config.uploads.dir);

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${name}-${unique}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const okExt = allowed.test(path.extname(file.originalname).toLowerCase());
  const okMime = allowed.test(file.mimetype);
  if (okExt && okMime) return cb(null, true);
  cb(new Error('Doar fișiere imagine sunt permise (jpeg, png, gif, webp).'));
};

const upload = multer({
  storage,
  limits: { fileSize: config.uploads.maxFileSize },
  fileFilter,
});

const uploadFieldsPromo = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'image_home', maxCount: 1 },
]);

module.exports = { upload, uploadFieldsPromo, uploadsDir };
