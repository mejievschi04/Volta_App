const express = require('express');
const blogController = require('../controllers/blogController');
const { upload } = require('../config/multer');
const { requireAdmin } = require('../middleware/adminAuth');

const router = express.Router();

router.get('/', blogController.list);
router.get('/:id', blogController.getById);
router.post('/', requireAdmin, upload.single('image'), blogController.create);
router.put('/:id', requireAdmin, upload.single('image'), blogController.update);
router.delete('/:id', requireAdmin, blogController.remove);

module.exports = router;
