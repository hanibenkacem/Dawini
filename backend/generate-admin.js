// generate-admin.js  (run with: node generate-admin.js)
const bcrypt = require('bcrypt');
const db = require('./db/db');

async function createAdmin() {
  const hashed = await bcrypt.hash('admin', 10);
  const sql = `INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role) VALUES (?, ?, ?, ?, ?)`;
  db.query(sql, ['Admin', 'Admin', 'admin@clinic.com', hashed, 'admin'], (err) => {
    if (err) console.error(err);
    else console.log('✅ Admin created successfully!');
    process.exit();
  });
}

createAdmin();