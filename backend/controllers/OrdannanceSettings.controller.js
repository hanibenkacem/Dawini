const db = require('../db/db');
const fs = require('fs');
const path = require('path');

// ⚠️ Adjust this to match wherever multer actually saves uploads for this route
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

exports.SaveOrdonnance = (req, res) => {
    const { nom_medecin, nom_medecin_ar, specialite, adresse, telephone, template } = req.body;
    const id_medecin = req.user.userId;

    // Sent from the frontend as FormData strings, e.g. "true"
    const modeSimplifie = req.body.mode_simplifie === 'true';

    // Get filenames from multer (new uploads, if any)
    const newLogo = req.files['logo'] ? req.files['logo'][0].filename : null;
    const newBackground = req.files['background'] ? req.files['background'][0].filename : null;

    // Sent from the frontend as FormData strings, e.g. "true"
    const removeLogo = req.body.remove_logo === 'true';
    const removeBackground = req.body.remove_background === 'true';

    // We need the current row first: to know what to keep when nothing changed,
    // and to know what old file to delete from disk when replacing/removing.
    db.query(
        `SELECT logo, background FROM ordonnance_settings WHERE id_medecin = ? LIMIT 1`,
        [id_medecin],
        (err, rows) => {
            if (err) {
                console.error("Database Error:", err);
                return res.status(500).json({ error: "Internal Server Error", details: err });
            }

            const existing = rows[0] || {};

            // Priority per field: new upload > explicit removal > keep existing value
            const finalLogo = newLogo || (removeLogo ? null : (existing.logo || null));
            const finalBackground = newBackground || (removeBackground ? null : (existing.background || null));

            const sql = `
                INSERT INTO ordonnance_settings 
                (id_medecin, nom_medecin, nom_medecin_ar, specialite, adresse, telephone, logo, background, template, mode_simplifie)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                nom_medecin = VALUES(nom_medecin),
                nom_medecin_ar = VALUES(nom_medecin_ar),
                specialite = VALUES(specialite),
                adresse = VALUES(adresse),
                telephone = VALUES(telephone),
                logo = VALUES(logo),
                background = VALUES(background),
                template = VALUES(template),
                mode_simplifie = VALUES(mode_simplifie)`;

            const values = [
                id_medecin, nom_medecin, nom_medecin_ar, specialite, adresse, telephone,
                finalLogo, finalBackground, template || 'classic', modeSimplifie
            ];

            db.query(sql, values, (err2, result) => {
                if (err2) {
                    console.error("Database Error:", err2);
                    return res.status(500).json({ error: "Internal Server Error", details: err2 });
                }

                // DB write succeeded — now clean up any file that was replaced or removed.
                if (existing.logo && existing.logo !== finalLogo) {
                    fs.unlink(path.join(UPLOAD_DIR, existing.logo), (unlinkErr) => {
                        if (unlinkErr) console.error("Could not delete old logo file:", unlinkErr);
                    });
                }
                if (existing.background && existing.background !== finalBackground) {
                    fs.unlink(path.join(UPLOAD_DIR, existing.background), (unlinkErr) => {
                        if (unlinkErr) console.error("Could not delete old background file:", unlinkErr);
                    });
                }

                res.json({ message: "Paramètres mis à jour avec succès !" });
            });
        }
    );
};

exports.GetOrdonnance = (req, res) => {
    const id_medecin = req.user.userId;
    const sql = `Select * FROM ordonnance_settings WHERE id_medecin = ? LIMIT 1`;
    db.query(sql, id_medecin, (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).json(err);
        }
        res.json(result[0] || {});
    });
};