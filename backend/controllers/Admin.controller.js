const db = require('../db/db');
const bcrypt = require('bcrypt');

// GET all users (doctors and receptionists)
exports.getAllUsers = (req, res) => {
    const sql = `SELECT id, nom, prenom, email, role, date_creation FROM utilisateurs WHERE role IN ('medecin', 'receptionniste') ORDER BY date_creation DESC`;
    db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ message: 'Error fetching users' });
    return res.status(200).json(results);
  });
};

// CREATE a new doctor or receptionist
exports.createUser = async (req, res) => {
  const { nom, prenom, email, mot_de_passe, role } = req.body;

  if (!['medecin', 'receptionniste'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role. Must be medecin or receptionniste.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(mot_de_passe, 10);
    const sql = `INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role) VALUES (?, ?, ?, ?, ?)`;
    db.query(sql, [nom, prenom, email, hashedPassword, role], (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ message: 'Email already exists.' });
        }
        return res.status(500).json({ message: 'Error creating user.' });
      }
      return res.status(201).json({ message: 'User created successfully.', id: result.insertId });
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
};

// UPDATE a user
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { nom, prenom, email, role, mot_de_passe } = req.body;

  if (role && !['medecin', 'receptionniste'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role.' });
  }

  try {
    let sql, values;
    if (mot_de_passe) {
      const hashed = await bcrypt.hash(mot_de_passe, 10);
      sql = `UPDATE utilisateurs SET nom=?, prenom=?, email=?, role=?, mot_de_passe=? WHERE id=?`;
      values = [nom, prenom, email, role, hashed, id];
    } else {
      sql = `UPDATE utilisateurs SET nom=?, prenom=?, email=?, role=? WHERE id=?`;
      values = [nom, prenom, email, role, id];
    }

    db.query(sql, values, (err, result) => {
      if (err) return res.status(500).json({ message: 'Error updating user.' });
      if (result.affectedRows === 0) return res.status(404).json({ message: 'User not found.' });
      return res.status(200).json({ message: 'User updated successfully.' });
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
};

// DELETE a user
exports.deleteUser = (req, res) => {
  const { id } = req.params;
  const sql = `DELETE FROM utilisateurs WHERE id = ? AND role IN ('medecin', 'receptionniste')`;
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ message: 'Error deleting user.' });
    if (result.affectedRows === 0) return res.status(404).json({ message: 'User not found.' });
    return res.status(200).json({ message: 'User deleted successfully.' });
  });
};