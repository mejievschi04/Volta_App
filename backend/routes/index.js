/**
 * Agregare rute API – toate sub /api
 */
const express = require('express');
const auth = require('./auth');
const users = require('./users');
const notifications = require('./notifications');
const promotions = require('./promotions');
const blog = require('./blog');
const messages = require('./messages');
const upload = require('./upload');
const health = require('./health');
const admin = require('./admin');

const router = express.Router();

router.use('/auth', auth);
router.use('/users', users);
router.use('/notifications', notifications);
router.use('/promotions', promotions);
router.use('/blog', blog);
router.use('/messages', messages);
router.use('/upload', upload);
router.use('/health', health);
router.use('/admin', admin);

const notFound = require('../middleware/notFound');
router.use(notFound);

module.exports = router;
