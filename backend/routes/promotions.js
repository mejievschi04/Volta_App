const express = require('express');
const promotionsController = require('../controllers/promotionsController');
const { uploadFieldsPromo } = require('../config/multer');
const { requireAdmin } = require('../middleware/adminAuth');

const router = express.Router();

router.get('/', promotionsController.list);
router.get('/:id', promotionsController.getById);
router.post('/', requireAdmin, uploadFieldsPromo, promotionsController.create);
router.put('/:id', requireAdmin, uploadFieldsPromo, promotionsController.update);
router.delete('/:id', requireAdmin, promotionsController.remove);

module.exports = router;
