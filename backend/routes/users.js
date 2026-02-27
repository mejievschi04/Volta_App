const express = require('express');
const usersController = require('../controllers/usersController');
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/adminAuth');

const router = express.Router();

router.get('/', requireAdmin, usersController.list);
router.get('/:id/cards', requireAdmin, usersController.listCards);
router.post('/:id/cards', requireAdmin, usersController.addCard);
router.delete('/:id/cards/:cardId', requireAdmin, usersController.removeCard);
router.put('/:id/selected-card', requireAuth, usersController.setSelectedCard);
router.put('/:id/push-token', requireAuth, usersController.setPushToken);
router.get('/:id', requireAuth, usersController.getById);
router.post('/', requireAdmin, usersController.create);
router.put('/:id', requireAuth, usersController.update);
router.patch('/:id/admin', requireAdmin, usersController.adminUpdate);
router.delete('/:id', requireAdmin, usersController.remove);

module.exports = router;
