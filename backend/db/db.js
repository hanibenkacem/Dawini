const mysql = require('mysql2');

let _connection = null;

function getDb() {
  if (_connection) return _connection;

  _connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'cabinet',
    dateStrings: true,
  });

  _connection.connect((err) => {
    if (err) {
      console.error('Erreur de connexion à MySQL:', err.message);
      _connection = null; // allow retry on next call
    } else {
      console.log('Connected to MySQL database!');
    }
  });

  _connection.on('error', (err) => {
    console.error('MySQL connection error:', err.message);
    if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.fatal) {
      _connection = null; // will reconnect on next getDb() call
    }
  });

  return _connection;
}

// Proxy: every property access (query, execute, etc.) goes through getDb()
// so callers can keep using `db.query(...)` unchanged
const db = new Proxy(
  {},
  {
    get(_target, prop) {
      const conn = getDb();
      const val = conn[prop];
      return typeof val === 'function' ? val.bind(conn) : val;
    },
  }
);

module.exports = db;