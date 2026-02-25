const express = require('express');
const { upload } = require('../config/multer');
const uploadController = require('../controllers/uploadController');
const { requireAdmin } = require('../middleware/adminAuth');

const router = express.Router();

router.post('/', requireAdmin, upload.single('image'), uploadController.uploadImage);

module.exports = router;
