// controllers/paiementController.js
// Uses mysql2 (callback API) — no promises, no async/await

const db = require("../db/db");

// ─── HELPER: format a DB row to match the frontend fields ────────────────────
function toFrontend(row) {
  return {
    id:              row.id,
    id_consultation: row.id_consultation,
    montant:         parseFloat(row.montant),
    mode_paiement:   row.mode_paiement,
    statut:          row.statut,
    date:            row.date_paiement
                       ? new Date(row.date_paiement).toISOString().split("T")[0]
                       : null,
    patient:         row.patient_prenom && row.patient_nom
                       ? `${row.patient_prenom} ${row.patient_nom}`
                       : row.patient_nom ?? null,
    diagnostic:      row.diagnostic ?? null,
  };
}

// ─── BASE JOIN ────────────────────────────────────────────────────────────────
// Reused in getAllPaiements and getPaiementById
const BASE_SELECT = `
  SELECT
    p.*,
    pat.nom        AS patient_nom,
    pat.prenom     AS patient_prenom,
    c.diagnostic   AS diagnostic
  FROM paiements p
  LEFT JOIN consultations c   ON c.id  = p.id_consultation
  LEFT JOIN patients      pat ON pat.id = c.id_patient
`;

// ─── GET ALL ──────────────────────────────────────────────────────────────────
// GET /api/paiements
// Query params: search, statut, mode_paiement, sortBy, sortDir, page, limit
const getAllPaiements = (req, res) => {
  const {
    search        = "",
    statut        = "tous",
    mode_paiement = "tous",
    sortBy        = "date_paiement",
    sortDir       = "DESC",
    page          = 1,
    limit         = 50,
  } = req.query;

  const ALLOWED_SORT = ["date_paiement", "montant", "statut", "mode_paiement"];
  const safeSort = ALLOWED_SORT.includes(sortBy) ? `p.${sortBy}` : "p.date_paiement";
  const safeDir  = sortDir.toUpperCase() === "ASC" ? "ASC" : "DESC";
  const offset   = (parseInt(page) - 1) * parseInt(limit);

  const conditions = [];
  const params     = [];

  if (search) {
    // Search by patient name, diagnostic, or mode_paiement
    conditions.push(`(
      p.mode_paiement LIKE ? OR
      CAST(p.id AS CHAR) LIKE ? OR
      pat.nom LIKE ? OR
      pat.prenom LIKE ? OR
      CONCAT(pat.prenom, ' ', pat.nom) LIKE ? OR
      c.diagnostic LIKE ?
    )`);
    const like = `%${search}%`;
    params.push(like, like, like, like, like, like);
  }

  if (statut !== "tous") {
    conditions.push("p.statut = ?");
    params.push(statut);
  }

  if (mode_paiement !== "tous") {
    conditions.push("p.mode_paiement = ?");
    params.push(mode_paiement);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const dataSQL = `
    ${BASE_SELECT}
    ${where}
    ORDER BY ${safeSort} ${safeDir}
    LIMIT ? OFFSET ?
  `;

  const countSQL = `
    SELECT COUNT(*) AS total
    FROM paiements p
    LEFT JOIN consultations c   ON c.id   = p.id_consultation
    LEFT JOIN patients      pat ON pat.id  = c.id_patient
    ${where}
  `;

  db.query(dataSQL, [...params, parseInt(limit), offset], (err, rows) => {
    if (err) {
      console.error("[getAllPaiements] data query:", err);
      return res.status(500).json({ success: false, message: "Erreur serveur", error: err.message });
    }

    db.query(countSQL, params, (err2, countResult) => {
      if (err2) {
        console.error("[getAllPaiements] count query:", err2);
        return res.status(500).json({ success: false, message: "Erreur serveur", error: err2.message });
      }

      const total = countResult[0].total;

      res.json({
        success: true,
        data: rows.map(toFrontend),
        pagination: {
          total,
          page:       parseInt(page),
          limit:      parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      });
    });
  });
};

// ─── GET ONE ──────────────────────────────────────────────────────────────────
// GET /api/paiements/:id
const getPaiementById = (req, res) => {
  const { id } = req.params;

  db.query(`${BASE_SELECT} WHERE p.id = ?`, [id], (err, rows) => {
    if (err) {
      console.error("[getPaiementById]:", err);
      return res.status(500).json({ success: false, message: "Erreur serveur", error: err.message });
    }

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Paiement introuvable" });
    }

    res.json({ success: true, data: toFrontend(rows[0]) });
  });
};

// ─── CREATE ───────────────────────────────────────────────────────────────────
// POST /api/paiements
// Body: { id_consultation, montant, mode_paiement, statut, date_paiement? }
const createPaiement = (req, res) => {
  const {
    id_consultation,
    montant,
    mode_paiement,
    statut        = "pending",
    date_paiement,
  } = req.body;

  if (!id_consultation || montant === undefined) {
    return res.status(400).json({
      success: false,
      message: "id_consultation et montant sont obligatoires",
    });
  }

  if (isNaN(parseFloat(montant)) || parseFloat(montant) < 0) {
    return res.status(400).json({ success: false, message: "Montant invalide" });
  }

  const validStatuts = ["paid", "pending"];
  const safeStatut   = validStatuts.includes(statut) ? statut : "pending";
  const dateValue    = date_paiement ? new Date(date_paiement) : new Date();

  const insertSQL = `
    INSERT INTO paiements (id_consultation, montant, mode_paiement, statut, date_paiement)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(
    insertSQL,
    [id_consultation, parseFloat(montant), mode_paiement ?? null, safeStatut, dateValue],
    (err, result) => {
      if (err) {
        console.error("[createPaiement] insert:", err);
        return res.status(500).json({ success: false, message: "Erreur serveur", error: err.message });
      }

      // Fetch the new row with the JOIN to return patient + diagnostic
      db.query(`${BASE_SELECT} WHERE p.id = ?`, [result.insertId], (err2, rows) => {
        if (err2) {
          console.error("[createPaiement] fetch:", err2);
          return res.status(500).json({ success: false, message: "Erreur serveur", error: err2.message });
        }

        res.status(201).json({
          success: true,
          message: "Paiement enregistré avec succès",
          data:    toFrontend(rows[0]),
        });
      });
    }
  );
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────
// PUT /api/paiements/:id
// Body: any subset of updatable fields (partial update supported)
const updatePaiement = (req, res) => {
  const { id } = req.params;

  db.query("SELECT id FROM paiements WHERE id = ?", [id], (err, existing) => {
    if (err) {
      console.error("[updatePaiement] check:", err);
      return res.status(500).json({ success: false, message: "Erreur serveur", error: err.message });
    }

    if (!existing.length) {
      return res.status(404).json({ success: false, message: "Paiement introuvable" });
    }

    const { montant, mode_paiement, statut, date_paiement, id_consultation } = req.body;

    const updates = [];
    const params  = [];

    if (montant !== undefined) {
      if (isNaN(parseFloat(montant)) || parseFloat(montant) < 0) {
        return res.status(400).json({ success: false, message: "Montant invalide" });
      }
      updates.push("montant = ?");
      params.push(parseFloat(montant));
    }

    if (mode_paiement !== undefined) {
      updates.push("mode_paiement = ?");
      params.push(mode_paiement);
    }

    if (statut !== undefined) {
      const validStatuts = ["paid", "pending"];
      updates.push("statut = ?");
      params.push(validStatuts.includes(statut) ? statut : "pending");
    }

    if (date_paiement !== undefined) {
      updates.push("date_paiement = ?");
      params.push(new Date(date_paiement));
    }

    if (id_consultation !== undefined) {
      updates.push("id_consultation = ?");
      params.push(id_consultation);
    }

    if (!updates.length) {
      return res.status(400).json({ success: false, message: "Aucun champ à mettre à jour" });
    }

    params.push(id);

    db.query(`UPDATE paiements SET ${updates.join(", ")} WHERE id = ?`, params, (err2) => {
      if (err2) {
        console.error("[updatePaiement] update:", err2);
        return res.status(500).json({ success: false, message: "Erreur serveur", error: err2.message });
      }

      // Fetch updated row with JOIN
      db.query(`${BASE_SELECT} WHERE p.id = ?`, [id], (err3, rows) => {
        if (err3) {
          console.error("[updatePaiement] fetch:", err3);
          return res.status(500).json({ success: false, message: "Erreur serveur", error: err3.message });
        }

        res.json({
          success: true,
          message: "Paiement mis à jour",
          data:    toFrontend(rows[0]),
        });
      });
    });
  });
};

// ─── DELETE ───────────────────────────────────────────────────────────────────
// DELETE /api/paiements/:id
const deletePaiement = (req, res) => {
  const { id } = req.params;

  db.query("SELECT id FROM paiements WHERE id = ?", [id], (err, existing) => {
    if (err) {
      console.error("[deletePaiement] check:", err);
      return res.status(500).json({ success: false, message: "Erreur serveur", error: err.message });
    }

    if (!existing.length) {
      return res.status(404).json({ success: false, message: "Paiement introuvable" });
    }

    db.query("DELETE FROM paiements WHERE id = ?", [id], (err2) => {
      if (err2) {
        console.error("[deletePaiement] delete:", err2);
        return res.status(500).json({ success: false, message: "Erreur serveur", error: err2.message });
      }

      res.json({ success: true, message: "Paiement supprimé" });
    });
  });
};

// ─── STATS ────────────────────────────────────────────────────────────────────
// GET /api/paiements/stats
const getStats = (req, res) => {
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

  db.query(
    `SELECT COALESCE(SUM(montant), 0) AS total, COUNT(*) AS count
     FROM paiements
     WHERE statut = 'paid' AND date_paiement BETWEEN ? AND ?`,
    [todayStart, todayEnd],
    (err, todayRows) => {
      if (err) {
        console.error("[getStats] today:", err);
        return res.status(500).json({ success: false, message: "Erreur serveur", error: err.message });
      }

      db.query(
        `SELECT COALESCE(SUM(montant), 0) AS total
         FROM paiements
         WHERE statut = 'paid' AND date_paiement >= ?`,
        [monthStart],
        (err2, monthRows) => {
          if (err2) {
            console.error("[getStats] month:", err2);
            return res.status(500).json({ success: false, message: "Erreur serveur", error: err2.message });
          }

          db.query(
            "SELECT COUNT(*) AS count FROM paiements WHERE statut = 'pending'",
            (err3, pendingRows) => {
              if (err3) {
                console.error("[getStats] pending:", err3);
                return res.status(500).json({ success: false, message: "Erreur serveur", error: err3.message });
              }

              db.query(
                "SELECT COUNT(*) AS count FROM paiements WHERE date_paiement >= ?",
                [monthStart],
                (err4, totalRows) => {
                  if (err4) {
                    console.error("[getStats] total:", err4);
                    return res.status(500).json({ success: false, message: "Erreur serveur", error: err4.message });
                  }

                  res.json({
                    success: true,
                    data: {
                      today: {
                        total: parseFloat(todayRows[0].total),
                        count: todayRows[0].count,
                      },
                      month: {
                        total: parseFloat(monthRows[0].total),
                      },
                      pending: pendingRows[0].count,
                      consultationsThisMonth: totalRows[0].count,
                    },
                  });
                }
              );
            }
          );
        }
      );
    }
  );
};

module.exports = {
  getAllPaiements,
  getPaiementById,
  createPaiement,
  updatePaiement,
  deletePaiement,
  getStats,
};