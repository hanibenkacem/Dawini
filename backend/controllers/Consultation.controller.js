const db = require('../db/db')
const path = require('path');
const fs   = require('fs');
const multer = require('multer');
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '../uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOADS_DIR, 'consultations', String(req.params.id));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});

exports.upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Type non autorisé'));
  },
});

exports.uploadDocument = (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
  const { id } = req.params;
  const { docType, docTypeLabel, label } = req.body;
  const sql = `
    INSERT INTO consultation_documents
      (id_consultation, doc_type, doc_type_label, label, filename, original_name, mime_type, size)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  db.query(sql,
    [id, docType, docTypeLabel, label, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ success: true, id: result.insertId });
    }
  );
};

exports.getDocuments = (req, res) => {
  const { id } = req.params;
  db.query(
    'SELECT * FROM consultation_documents WHERE id_consultation = ? ORDER BY created_at DESC',
    [id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(result);
    }
  );
};
// historique de consultations
exports.GetConsultationByPatient = (req,res)=>{
    const {id} = req.params
    const sql = `SELECT * FROM consultations WHERE id_patient = ? ORDER BY date_consultation DESC `
    db.query(sql,[id],(err,result)=>{
        if(err) return res.status(500).json(err)
            res.json(result)
    })
}
  exports.GetConsultationById = (req,res)=>{
      const {id} = req.params
      const sql = `SELECT 
    c.*,
    o.instructions AS medicaments
  FROM consultations c
  LEFT JOIN ordonnances o 
    ON o.id_consultation = c.id
  WHERE c.id_patient = ?
  ORDER BY c.date_consultation DESC;`
      db.query(sql, [id], (err, result) => {
          if (err) return res.status(500).json(err);
      else{
          res.json(result);
          console.log(result)
      }
        });
      };
exports.createConsultation = (req,res)=>{
    const userid = req.user.userId
    console.log(userid)
    const {id_patient,diagnostic,notes} = req.body
    if (!id_patient || !diagnostic) {
        return res.status(400).json({
          message: "Champs requis manquants"
        });
      }
      const query = `
    INSERT INTO consultations
    (id_patient,id_medecin,diagnostic, notes)
    VALUES (?, ?, ?,?)
  `;

  db.query(
    query,
    [id_patient,userid,diagnostic, notes],
    (err, result) => {
      if (err) return res.status(500).json(err);

      res.status(201).json({
        message: "Consultation créée",
        id: result.insertId
      });
    }
  );
}


exports.insertOrdonnance = (req, res) => {
  const { id_consultation, instructions } = req.body;

  if (!id_consultation) {
    return res.status(400).json({ message: "id_consultation is required" });
  }

  const query = `
    INSERT INTO ordonnances (id_consultation, instructions, date_creation)
    VALUES (?, ?, NOW())
  `;

  // Use the callback pattern (err, result) instead of await
  db.query(query, [id_consultation, instructions], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Server error" });
    }

    // On success
    res.status(201).json({
      message: "Ordonnance created",
      id: result.insertId,
    });
  });
};
exports.updateConsultation = (req, res) => {
  const { id } = req.params;
  const { diagnostic, notes } = req.body;

  const queryText = "UPDATE consultations SET diagnostic = ?, notes = ? WHERE id = ?";

  db.query(queryText, [diagnostic, notes, id], (err, results) => {
    if (err) {
      // It's usually safer not to pass the raw database error to the client
      return res.status(500).json({ error: "Database update failed", details: err.message });
    }

    // Optional but highly recommended: check if the row actually existed to be updated
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: "Consultation not found" });
    }

    return res.json({ success: true, message: "Consultation updated successfully" });
  });
};