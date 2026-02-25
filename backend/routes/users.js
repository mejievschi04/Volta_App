const express = require('express');
const usersController = require('../controllers/usersController');
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/adminAuth');

const router = express.Router();

router.get('/', requireAdmin, usersController.list);
router.get('/:id', requireAuth, usersController.getById);
router.post('/', requireAdmin, usersController.create);
router.put('/:id', requireAuth, usersController.update);
router.delete('/:id', requireAdmin, usersController.remove);

module.exports = router;
