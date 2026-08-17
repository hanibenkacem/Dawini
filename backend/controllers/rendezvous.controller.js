const db = require('../db/db')

exports.createRdv = (req, res) => {
  let { patient_id, id_medecin, date_rdv, motif } = req.body;

  if (req.user.role === "medecin") {
    id_medecin = req.user.userId;
  }

  if (!id_medecin) {
    return res.status(400).json({
      message: "Médecin requis"
    });
  }

  const sql = `
    INSERT INTO rendez_vous
    (patient_id, id_medecin, date_rdv, motif)
    VALUES (?, ?, ?, ?)
  `;

  db.query(
    sql,
    [patient_id, id_medecin, date_rdv, motif],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({
          message: "Erreur création RDV"
        });
      }

      res.json({
        message: "RDV créé",
        id: result.insertId
      });
    }
  );
};

exports.getToday = (req, res) => {
    const sql = `
      SELECT r.*, p.nom, p.prenom
      FROM rendez_vous r
      JOIN patients p ON p.id = r.patient_id
      WHERE DATE(r.date_rdv) = CURDATE()
      ORDER BY r.date_rdv ASC
    `;

    db.query(sql, (err, rows) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ message: "Erreur serveur" });
      }
      res.json(rows);
    });
  };

  exports.checkIn = (req, res) => {
    const { id } = req.params;

    // 1. Get the RDV
    db.query("SELECT * FROM rendez_vous WHERE id = ?", [id], (err, rdvRows) => {
      if (err) return res.status(500).json({ message: "Erreur serveur" });

      const rdv = rdvRows[0];

      if (!rdv) {
        return res.status(404).json({ message: "Rendez-vous introuvable" });
      }

      if (rdv.statut !== "planifie") {
        return res.status(400).json({ message: "RDV invalide ou déjà traité" });
      }

      // 2. Same-day check — compare date only, ignore time
      const rdvDate = new Date(rdv.date_rdv).toISOString().slice(0, 10);
      const today   = new Date().toISOString().slice(0, 10);

      if (rdvDate !== today) {
        return res.status(400).json({
          message: "Ce rendez-vous n'est pas prévu aujourd'hui"
        });
      }

      // 3. Prevent duplicate in queue
      db.query(
        "SELECT * FROM file_attente WHERE patient_id = ? AND date_jour = CURDATE() AND statut != 'termine'",
        [rdv.patient_id],
        (err, existing) => {
          if (err) return res.status(500).json({ message: "Erreur serveur" });
          if (existing.length) {
            return res.status(400).json({ message: "Patient déjà en file d'attente" });
          }

          // 4. Make room — shift queue down by 1
          db.query(
            "UPDATE file_attente SET ordre = ordre + 1 WHERE statut != 'termine' AND date_jour = CURDATE()",
            (err) => {
              if (err) return res.status(500).json({ message: "Erreur lors du décalage de la file" });

              // 5. Insert at front with ordre = 1 — now carries rdv_id so we can sync back later
              db.query(
                "INSERT INTO file_attente (patient_id, rdv_id, date_jour, ordre, statut, est_urgent) VALUES (?, ?, CURDATE(), 1, 'en_attente', 0)",
                [rdv.patient_id, id],
                (err) => {
                  if (err) return res.status(500).json({ message: "Erreur insertion file" });

                  // 6. Update RDV status → arrive
                  db.query(
                    "UPDATE rendez_vous SET statut = 'arrive', heure_arrive = NOW() WHERE id = ?",
                    [id],
                    (err) => {
                      if (err) return res.status(500).json({ message: "Erreur update RDV" });
                      res.json({ message: "Patient enregistré et ajouté en tête de file" });
                    }
                  );
                }
              );
            }
          );
        }
      );
    });
  };

  exports.getAllRendezVous = (req, res) => {
    const sql = `
     SELECT r.*, p.nom, p.prenom, u.nom AS medecin_nom, u.prenom AS medecin_prenom
FROM rendez_vous r
JOIN patients p ON p.id = r.patient_id
JOIN utilisateurs u    ON u.id = r.id_medecin
ORDER BY r.date_rdv ASC
    `;

    db.query(sql, (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({
          message: "Erreur serveur"
        });
      }
      console.log(rows)
      res.json(rows);
    });
  };

exports.getUpcoming = (req, res) => {
  const sql = `
   SELECT r.*, p.nom, p.prenom, u.nom AS medecin_nom, u.prenom AS medecin_prenom
FROM rendez_vous r
JOIN patients p ON p.id = r.patient_id
JOIN utilisateurs u ON u.id = r.id_medecin
WHERE r.date_rdv >= CURDATE() 
  AND r.statut NOT IN ('annule', 'non_presente')
ORDER BY r.date_rdv ASC;
  `;
  db.query(sql, (err, rows) => {
    if (err) { console.error(err); return res.status(500).json({ message: "Erreur serveur" }); }
    res.json(rows);
  });
};

exports.getPast = (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit, 10)  || 20, 100);
  const offset = parseInt(req.query.offset, 10) || 0;

  const sql = `
    SELECT r.*, p.nom, p.prenom, u.nom AS medecin_nom, u.prenom AS medecin_prenom
    FROM rendez_vous r
    JOIN patients p ON p.id = r.patient_id
    JOIN utilisateurs u ON u.id = r.id_medecin
    WHERE r.date_rdv < CURDATE() OR r.statut IN ('annule', 'non_presente')
    ORDER BY r.date_rdv DESC
    LIMIT ? OFFSET ?
  `;
  db.query(sql, [limit + 1, offset], (err, rows) => {
    if (err) { console.error(err); return res.status(500).json({ message: "Erreur serveur" }); }
    const hasMore = rows.length > limit;
    res.json({ rows: rows.slice(0, limit), hasMore });
  });
};
exports.cancelRdv = (req, res) => {
  const { id } = req.params;

  // 1. First, check if the appointment exists
  db.query("SELECT * FROM rendez_vous WHERE id = ?", [id], (err, rdvRows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Erreur serveur lors de la vérification du RDV" });
    }

    const rdv = rdvRows[0];
    if (!rdv) {
      return res.status(404).json({ message: "Rendez-vous introuvable" });
    }

    // 2. Update the appointment status to 'annule'
    const updateRdvSql = `
      UPDATE rendez_vous 
      SET statut = 'annule' 
      WHERE id = ?
    `;

    db.query(updateRdvSql, [id], (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur lors de l'annulation du RDV" });
      }

      // 3. Cleanup: If they were checked into today's queue, remove them from file_attente
      const deleteQueueSql = `
        DELETE FROM file_attente 
        WHERE rdv_id = ? AND date_jour = CURDATE() AND statut != 'termine'
      `;

      db.query(deleteQueueSql, [id], (err) => {
        if (err) {
          console.error("Queue cleanup failed:", err);
          // We don't block the whole response since the RDV itself is successfully cancelled
        }
        
        res.json({ message: "Rendez-vous annulé avec succès et retiré de la file d'attente." });
      });
    });
  });
};