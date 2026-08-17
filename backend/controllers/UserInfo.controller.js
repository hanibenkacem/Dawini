const db = require ('../db/db')
exports.GetLoggedInUser = (req, res) => {
    const userId = req.user.userId; 

    const sql = "SELECT * FROM utilisateurs WHERE id = ?";
    db.query(sql, [userId], (err, result) => {
        if (err) return res.status(500).json({ message: "Database Error" });
        if (result.length === 0) return res.status(404).json({ message: "User not found" });
        
        res.status(200).json(result[0]); // Send back the first user found
    });
};
exports.getDoctors = (req, res) => {
    const sql = `
      SELECT id, nom, prenom, email
      FROM utilisateurs
      WHERE role = 'medecin'
      ORDER BY nom ASC
    `;
   
    db.query(sql, (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur serveur" });
      }
      res.json(rows);
    });
  };
   