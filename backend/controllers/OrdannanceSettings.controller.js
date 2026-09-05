const db = require('../db/db')

exports.SaveOrdonnance = (req, res) => {
    const { nom_medecin, nom_medecin_ar, specialite, adresse, telephone, template } = req.body;
    const id_medecin = req.user.userId;

    // Get filenames from multer
    const logo = req.files['logo'] ? req.files['logo'][0].filename : null;
    const background = req.files['background'] ? req.files['background'][0].filename : null;

    // We use COALESCE or IFNULL to keep the old filename if a new one wasn't uploaded
    const sql = `
        INSERT INTO ordonnance_settings 
        (id_medecin, nom_medecin, nom_medecin_ar, specialite, adresse, telephone, logo, background, template)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        nom_medecin = VALUES(nom_medecin),
        nom_medecin_ar = VALUES(nom_medecin_ar),
        specialite = VALUES(specialite),
        adresse = VALUES(adresse),
        telephone = VALUES(telephone),
        logo = IFNULL(VALUES(logo), logo),
        background = IFNULL(VALUES(background), background),
        template = VALUES(template)`;

    // Notice we only pass the values ONCE now (9 parameters)
    const values = [id_medecin, nom_medecin, nom_medecin_ar, specialite, adresse, telephone, logo, background, template || 'classic'];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Database Error:", err);
            return res.status(500).json({ error: "Internal Server Error", details: err });
        }
        res.json({ message: "Paramètres mis à jour avec succès !" });
    });
};
exports.GetOrdonnance = (req,res)=>{
    const id_medecin = req.user.userId
    const sql = `Select * FROM ordonnance_settings WHERE id_medecin = ? LIMIT 1`
    db.query(sql,id_medecin,(err,result)=>{
        if(err){
            console.log(err)
            return res.status(500).json(err)
        }
        res.json(result[0] || {});
    })
}