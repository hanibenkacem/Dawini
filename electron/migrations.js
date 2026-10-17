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

async function ensureTableExists(connection, table, createSql) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS cnt
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
    [table]
  );
  if (rows[0].cnt > 0) return false; // already there

  await connection.query(createSql);
  console.log(`[migrations] created table ${table}`);
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
    await ensureColumnExists(
      connection,
      'consultations',
      'deleted_at',
      'DATETIME NULL DEFAULT NULL'
    );
    await ensureColumnExists(
      connection,
      'ordonnance_settings',
      'numero_ordre',
      'VARCHAR(50) NULL DEFAULT NULL'
    );

    // Bilans biologiques (lab test requests). No foreign keys on purpose:
    // consultations are soft-deleted and the ids are only used for lookup.
    await ensureTableExists(
      connection,
      'bilans',
      `CREATE TABLE bilans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_patient INT NOT NULL,
        id_consultation INT NULL,
        id_medecin INT NULL,
        tests TEXT NOT NULL,
        autres TEXT NULL,
        date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL,
        INDEX idx_bilans_patient (id_patient, deleted_at),
        INDEX idx_bilans_consultation (id_consultation)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );

    // Bilan follow-up: 'en_attente' (still to do) / 'fait' (done), used to
    // alert the doctor when the patient comes back with a pending bilan.
    await ensureColumnExists(
      connection,
      'bilans',
      'statut',
      "VARCHAR(20) NOT NULL DEFAULT 'en_attente'"
    );
    await ensureColumnExists(
      connection,
      'bilans',
      'date_fait',
      'DATETIME NULL DEFAULT NULL'
    );

    // future migrations get appended here
  } finally {
    await connection.end();
  }
}

module.exports = { runMigrations };