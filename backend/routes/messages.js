const express = require('express');
const messagesController = require('../controllers/messagesController');
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/adminAuth');

const router = express.Router();

router.get('/', requireAdmin, messagesController.list);
router.get('/thread/:userId', requireAuth, messagesController.getByUserId);
router.get('/:userId', requireAuth, messagesController.getByUserId);
router.post('/', requireAuth, messagesController.create);
router.post('/reply', requireAdmin, messagesController.reply);
router.put('/mark-read', requireAuth, messagesController.markRead);
router.delete('/thread/:userId', requireAuth, messagesController.removeThread);
router.delete('/:id', requireAuth, messagesController.remove);

module.exports = router;
