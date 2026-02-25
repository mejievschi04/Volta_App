// Script helper pentru conversia interogărilor MySQL la PostgreSQL
// Acest fișier conține funcții helper pentru a converti sintaxa MySQL la PostgreSQL

/**
 * Convertește un query MySQL cu ? placeholders la PostgreSQL cu $1, $2, etc.
 */
function convertQuery(query, params) {
  let paramIndex = 1;
  const convertedQuery = query.replace(/\?/g, () => `$${paramIndex++}`);
  return { query: convertedQuery, params };
}

/**
 * Convertește resultatul MySQL la format PostgreSQL
 * MySQL: [rows, fields] = await pool.execute(...)
 * PostgreSQL: result = await pool.query(...); rows = result.rows
 */
function convertResult(mysqlResult) {
  // În PostgreSQL, pool.query returnează { rows, rowCount }
  // Nu mai este nevoie de destructuring [rows]
  return mysqlResult.rows;
}

/**
 * Obține ID-ul inserat
 * MySQL: result.insertId
 * PostgreSQL: result.rows[0].id (cu RETURNING id în query)
 */
function getInsertId(result) {
  return result.rows[0].id;
}

/**
 * Obține numărul de rânduri afectate
 * MySQL: result.affectedRows
 * PostgreSQL: result.rowCount
 */
function getAffectedRows(result) {
  return result.rowCount;
}

/**
 * Convertește numele de coloane cu backticks la PostgreSQL quotes
 * MySQL: `read`
 * PostgreSQL: "read"
 */
function convertColumnName(columnName) {
  return columnName.replace(/`([^`]+)`/g, '"$1"');
}

module.exports = {
  convertQuery,
  convertResult,
  getInsertId,
  getAffectedRows,
  convertColumnName
};
