const db = require('../db/db')

exports.InsertPatient =  async (req,res)=>{
    const patient = req.body
   values = [
    patient.nom,
    patient.prenom,
    patient.date_naissance,
    patient.sexe,
    patient.telephone,
    patient.adresse,
    patient.maladies_chroniques
   ]
   const sql = 'INSERT INTO patients (nom,prenom,date_naissance,sexe,telephone,adresse,maladies_chroniques) VALUES (?,?,?,?,?,?,?)'
   db.query(sql,values,(err,result)=>{
    if(err){
        console.log(err)
        return res.status(500).json({"message":"ERROR WHEN ADDING INSERTING THE PATIENT"})
    }
    else{
        res.status(201).json({
            message:"patient a été inséré avec succés",
            id:result.insertId
    })
        
      
    }

   })


}
exports.GetALLPatients = (req,res)=>{
    const sql = 'SELECT p.*, MAX(c.date_consultation) AS last_visit from patients p LEFT JOIN consultations c ON p.id = c.id_patient GROUP BY p.id ORDER BY last_visit DESC'
    db.query(sql,(err,result)=>{
        if(err){
            return res.status(500).json({"MESSAGE":"ERROR WHEN GETTING THE PATIENTS"})
        }
        else{
                        res.json(result)
        }
        
    })
}
exports.getPatient = (req,res)=>{
    const {id} = req.params
    const sql = 'SELECT  * FROM patients WHERE id = ?'
    db.query(sql,id,(err,result)=>{
        if(err){
            console.log(err)
            return res.status(500).json({"MESSAGE":"ERROR WHEN GETTING THIS PATIENT"})
        }
        else{
            res.json(result)
        }
    })
}

exports.UpdatePatient = (req, res) => {
    if (req.user?.role !== "receptionniste" && req.user?.role !== "medecin") {
        return res.status(403).json({ message: "Vous n'avez pas la permission de modifier ce patient." })
    }
    const { id } = req.params
    const patient = req.body
    const values = [
        patient.nom,
        patient.prenom,
        patient.date_naissance,
        patient.sexe,
        patient.telephone,
        patient.adresse,
        patient.maladies_chroniques,
        id,
    ]
    const sql = `UPDATE patients SET nom=?, prenom=?, date_naissance=?, sexe=?, telephone=?, adresse=?, maladies_chroniques=? WHERE id=?`
    db.query(sql, values, (err, result) => {
        if (err) {
            console.log(err)
            return res.status(500).json({ message: "ERREUR LORS DE LA MISE A JOUR DU PATIENT" })
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Patient introuvable." })
        }
        res.json({ message: "Informations du patient mises à jour avec succès." })
    })
}
 
// Doctor-only: permanently delete a patient's entire medical folder,
// including everything that references patient_id/id_patient elsewhere.
// Deletion order matters here since there's no ON DELETE CASCADE — children
// must go before the parent `patients` row or the FK constraint will reject
// the final delete. Order: rendez_vous, file_attente, consultations, patients.
exports.DeletePatient = (req, res) => {
    if (req.user?.role !== "medecin") {
        return res.status(403).json({ message: "Seul le médecin peut supprimer un dossier patient." })
    }
    const { id } = req.params
 
    db.query('DELETE FROM rendez_vous WHERE patient_id = ?', [id], (err) => {
        if (err) {
            console.log(err)
            return res.status(500).json({ message: "ERREUR LORS DE LA SUPPRESSION DES RENDEZ-VOUS" })
        }
        db.query('DELETE FROM file_attente WHERE patient_id = ?', [id], (err) => {
            if (err) {
                console.log(err)
                return res.status(500).json({ message: "ERREUR LORS DE LA SUPPRESSION DE LA FILE D'ATTENTE" })
            }
            db.query('DELETE FROM consultations WHERE id_patient = ?', [id], (err) => {
                if (err) {
                    console.log(err)
                    return res.status(500).json({ message: "ERREUR LORS DE LA SUPPRESSION DES CONSULTATIONS" })
                }
                db.query('DELETE FROM patients WHERE id = ?', [id], (err, result) => {
                    if (err) {
                        console.log(err)
                        return res.status(500).json({ message: "ERREUR LORS DE LA SUPPRESSION DU PATIENT" })
                    }
                    if (result.affectedRows === 0) {
                        return res.status(404).json({ message: "Patient introuvable." })
                    }
                    res.json({ message: "Dossier médical supprimé avec succès." })
                })
            })
        })
    })
}