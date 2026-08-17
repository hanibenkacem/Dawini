const db = require('../db/db')

exports.AddNewPatientToQueue = (req, res) => {
  const { patient_id, urgent } = req.body;
  const today = new Date().toISOString().slice(0, 10);

  db.query("SELECT MAX(ordre) as maxOrdre FROM file_attente WHERE date_jour = ?", [today], (err, results) => {
      if (err) return res.status(500).json(err);

      const maxOrdre = results[0].maxOrdre || 0;
      const ordre = urgent ? 0 : maxOrdre + 1;

      // No rdv_id passed → stays NULL → this is a walk-in, no appointment to sync later
      const sql = `INSERT INTO file_attente (patient_id, date_jour, ordre, est_urgent) VALUES (?, ?, ?, ?)`;

      db.query(sql, [patient_id, today, ordre, urgent || false], (err, result) => {
          if (err) {
            console.log(err)
            return res.status(500).json(err);}

          res.json({ id: result.insertId, ordre: ordre });
      });
  });
};

let lastCallTime = null;
exports.getCallSignal = (req, res) => res.json({ lastCallTime });

exports.GetFileAttente = (req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  const sql = `
    SELECT f.*, p.nom, p.prenom,
           pay.montant  AS montant_prevu,
           pay.mode_paiement AS mode_prevu
    FROM file_attente f
    JOIN patients p ON p.id = f.patient_id
    LEFT JOIN paiements pay
      ON pay.id_consultation = f.id_consultation
      AND pay.statut = 'pending'
    WHERE f.date_jour = ?
      AND f.statut IN ('en_attente', 'en_consultation', 'en_paiement')
    ORDER BY f.ordre ASC
  `;

  db.query(sql, [today], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
};

exports.NextPatient = (req, res) => {
  const id_medecin = req.user.userId;
  const today = new Date().toISOString().slice(0, 10);

  const selectSql = `
    SELECT * FROM file_attente
    WHERE date_jour = ? AND statut = 'en_attente'
    ORDER BY ordre ASC LIMIT 1
  `;

  db.query(selectSql, [today], (err, rows) => {
    if (err) return res.status(500).json(err);
    if (!rows.length) return res.status(404).json({ message: "Aucun patient en attente" });

    const patient = rows[0];

    const insertConsult = `
      INSERT INTO consultations (id_patient, id_medecin, statut)
      VALUES (?, ?, 'en_cours')
    `;

    db.query(insertConsult, [patient.patient_id, id_medecin], (err, result) => {
      if (err) return res.status(500).json(err);

      const id_consultation = result.insertId;

      const updateSql = `
        UPDATE file_attente
        SET statut = 'en_consultation', id_consultation = ?
        WHERE id = ?
      `;

      db.query(updateSql, [id_consultation, patient.id], (err) => {
        if (err) return res.status(500).json(err);
        lastCallTime = new Date().toISOString();
        res.json({ ...patient, id_consultation });
      });
    });
  });
};

exports.passerEnPaiement = (req, res) => {
  const { file_id, montant, mode_paiement } = req.body;

  if (!file_id || !montant)
    return res.status(400).json({ error: "file_id et montant sont requis" });

  db.query(`SELECT statut, id_consultation FROM file_attente WHERE id = ?`, [file_id], (err, rows) => {
    if (err) return res.status(500).json(err);
    if (!rows.length) return res.status(404).json({ error: "Patient introuvable" });
    if (rows[0].statut !== "en_consultation")
      return res.status(400).json({ error: "Le patient doit être en consultation" });

    const id_consultation = rows[0].id_consultation;

    db.query(
      `INSERT INTO paiements (id_consultation, montant, mode_paiement, statut)
       VALUES (?, ?, ?, 'pending')`,
      [id_consultation, montant, mode_paiement || "cash"],
      (err) => {
        if (err) return res.status(500).json(err);

        db.query(
          `UPDATE file_attente SET statut = 'en_paiement' WHERE id = ?`,
          [file_id],
          (err) => {
            if (err) return res.status(500).json(err);
            res.json({ success: true });
          }
        );
      }
    );
  });
};

exports.confirmerPaiement = (req, res) => {
  const { file_id, id_consultation, montant, mode_paiement } = req.body;

  if (!file_id || !id_consultation)
    return res.status(400).json({ error: "Données manquantes" });

  db.query(
    `SELECT id FROM paiements WHERE id_consultation = ? AND statut = 'pending'`,
    [id_consultation],
    (err, rows) => {
      if (err) return res.status(500).json(err);

      const finalize = (err) => {
        if (err) return res.status(500).json(err);

        // 1. Was this queue entry born from a booked appointment?
        db.query(`SELECT rdv_id FROM file_attente WHERE id = ?`, [file_id], (err, fRows) => {
          if (err) return res.status(500).json(err);
          const rdv_id = fRows[0]?.rdv_id || null;

          // 2. Close the queue entry — same as before
          db.query(`UPDATE file_attente SET statut = 'termine' WHERE id = ?`, [file_id], (err) => {
            if (err) return res.status(500).json(err);

            if (!rdv_id) return res.json({ success: true }); // walk-in, nothing more to sync

            // 3. Close the appointment too
            db.query(`UPDATE rendez_vous SET statut = 'termine' WHERE id = ?`, [rdv_id], (err) => {
              if (err) return res.status(500).json(err);
              res.json({ success: true });
            });
          });
        });
      };

      if (rows.length > 0) {
        db.query(
          `UPDATE paiements SET statut = 'paid', montant = ?, mode_paiement = ?
           WHERE id_consultation = ? AND statut = 'pending'`,
          [montant, mode_paiement, id_consultation],
          finalize
        );
      } else {
        db.query(
          `INSERT INTO paiements (id_consultation, montant, mode_paiement, statut)
           VALUES (?, ?, ?, 'paid')`,
          [id_consultation, montant, mode_paiement || 'cash'],
          finalize
        );
      }
    }
  );
};

exports.SearchPatients = (req, res) => {
  const { q } = req.query;

  if (!q || !q.trim()) {
    return res.status(400).json({ message: "Paramètre de recherche manquant" });
  }

  const search = `%${q.trim()}%`;

  const sql = `
    SELECT id, nom, prenom, telephone, date_naissance, sexe, adresse, maladies_chroniques
    FROM patients
    WHERE nom LIKE ? OR prenom LIKE ? OR telephone LIKE ?
    ORDER BY nom ASC
    LIMIT 20
  `;

  db.query(sql, [search, search, search], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
};

exports.RemoveFromQueue = (req, res) => {
  db.query("DELETE FROM file_attente WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: "Erreur lors de la suppression." });
    res.json({ success: true });
  });
};