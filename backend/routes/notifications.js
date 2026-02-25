const express = require('express');
const notificationsController = require('../controllers/notificationsController');
const { requireAdmin } = require('../middleware/adminAuth');

const router = express.Router();

router.get('/', notificationsController.list);
router.get('/ids', notificationsController.listIds);
router.post('/', requireAdmin, notificationsController.create);
router.put('/:id', requireAdmin, notificationsController.update);
router.delete('/:id', requireAdmin, notificationsController.remove);

module.exports = router;
