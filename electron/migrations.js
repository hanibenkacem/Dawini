const mysql = require('mysql2/promise');

async function ensureColumnExists(connection, table, column, definition) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS cnt
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [table, column]
  );
  if (rows[0].cnt > 0) return false; // already there

  await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN ${column} ${definition}`);
  console.log(`[migrations] added ${table}.${column}`);
  return true;
}

async function runMigrations(creds) {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: creds.port,
    user: creds.user,
    password: creds.password,
    database: creds.database,
  });

  try {
    await ensureColumnExists(
      connection,
      'ordonnance_settings',
      'template',
      "VARCHAR(30) NOT NULL DEFAULT 'classic'"
    );
    await ensureColumnExists(
      connection,
      'ordonnance_settings',
      'mode_simplifie',
      "TINYINT(1) NOT NULL DEFAULT 0"
    );
    // future migrations get appended here
  } finally {
    await connection.end();
  }
}

module.exports = { runMigrations };