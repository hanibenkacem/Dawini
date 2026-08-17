const mysql = require('mysql2/promise');
const fs = require('fs');
const crypto = require('crypto');
const { MYSQL_PORT } = require('./mysql-manager');

const DB_NAME = 'cabinet';
const DB_APP_USER = 'dawini_app';

async function setupAppDatabase({ dataDirJustInitialized, configPath, schemaPath }) {
  // If credentials file already exists, just return it — no setup needed
  if (!dataDirJustInitialized && fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }

  // Either first run OR credentials file is missing — (re)create everything
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: MYSQL_PORT,
    user: 'root',
    password: '',
    multipleStatements: true, // allows running the whole schema in one shot
  });

  const appPassword = crypto.randomBytes(16).toString('hex');

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);

  // DROP + recreate the user so we always end up with the correct '%' host,
  // even if a previous install created it as '@localhost'
  await connection.query(`DROP USER IF EXISTS '${DB_APP_USER}'@'localhost'`);
  await connection.query(`DROP USER IF EXISTS '${DB_APP_USER}'@'%'`);
  await connection.query(
    `CREATE USER '${DB_APP_USER}'@'%' IDENTIFIED BY ?`,
    [appPassword]
  );
  await connection.query(
    `GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_APP_USER}'@'%'`
  );
  await connection.query('FLUSH PRIVILEGES');
  await connection.query(`USE \`${DB_NAME}\``);

  // Only run schema if the data dir was just initialized (fresh DB)
  if (dataDirJustInitialized) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

    // Run the entire schema file in one query using multipleStatements mode.
    // This avoids brittle manual splitting on ';' which breaks on values
    // that contain semicolons or apostrophes (e.g. '100MG/AMP. DE LYOPH').
    await connection.query(schemaSql);
  }

  await connection.end();

  const creds = {
    user: DB_APP_USER,
    password: appPassword,
    database: DB_NAME,
    port: MYSQL_PORT,
  };
  fs.writeFileSync(configPath, JSON.stringify(creds, null, 2));
  return creds;
}

module.exports = { setupAppDatabase };