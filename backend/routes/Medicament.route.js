const express = require('express')
const router = express.Router()
const consultation = require('../controllers/Consultation.controller')
const verifytoken = require('../middlewares/AuthMiddleware')
const db = require('../db/db')

router.get("/search", async (req, res) => {
    const q = req.query.q;
  
    if (!q) return res.json([]);
  try{
    const [rows] = await db.promise().query(
      `SELECT id,DENOMINATION_COMMUNE_INTERNATIONALE, NOM_DE_MARQUE, FORME,DOSAGE 
       FROM medicaments
       WHERE NOM_DE_MARQUE LIKE ? OR DENOMINATION_COMMUNE_INTERNATIONALE LIKE ?
       LIMIT 10`,
      [`%${q}%`, `%${q}%`]
    );
  
    res.json(rows);
  }


catch (err){
    console.error("Search error:", err);
    res.status(500).json({ error: "Database error" });
}
});

  module.exports = router