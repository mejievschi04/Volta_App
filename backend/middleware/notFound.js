/**
 * 404 pentru rute API necunoscute
 */
function notFound(req, res, next) {
  res.status(404).json({ error: 'Endpoint inexistent' });
}

module.exports = notFound;
