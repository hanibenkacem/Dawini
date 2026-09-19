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

async function ensureForeignKeyCascade(connection, table, constraintName, column, refTable, refColumn, onDelete = 'CASCADE') {
  const [rows] = await connection.query(
    `SELECT DELETE_RULE
     FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
     WHERE CONSTRAINT_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND CONSTRAINT_NAME = ?`,
    [table, constraintName]
  );

  if (rows.length > 0 && rows[0].DELETE_RULE === onDelete) {
    return false; // already correct, nothing to do
  }

  if (rows.length > 0) {
    // constraint exists but with wrong ON DELETE rule -> drop it first
    await connection.query(`ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${constraintName}\``);
  }

  await connection.query(
    `ALTER TABLE \`${table}\`
     ADD CONSTRAINT \`${constraintName}\`
     FOREIGN KEY (\`${column}\`) REFERENCES \`${refTable}\` (\`${refColumn}\`)
     ON DELETE ${onDelete}`
  );

  console.log(`[migrations] set ${table}.${constraintName} ON DELETE ${onDelete}`);
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

    await ensureForeignKeyCascade(
      connection,
      'rendez_vous',
      'rendez_vous_ibfk_1',
      'patient_id',
      'patients',
      'id',
      'CASCADE'
    );
    await ensureForeignKeyCascade(
      connection,
      'file_attente',
      'file_attente_ibfk_2',
      'rdv_id',
      'rendez_vous',
      'id',
      'CASCADE'
    );
    // future migrations get appended here
  } finally {
    await connection.end();
  }
}

module.exports = { runMigrations };