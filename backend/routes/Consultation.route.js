const express  = require('express')
const router   = express.Router()
const consultation = require('../controllers/Consultation.controller')
const verifytoken  = require('../middlewares/AuthMiddleware')

router.get("/patient/:id",    verifytoken, consultation.GetConsultationById);
router.post("/",              verifytoken, consultation.createConsultation);
router.post("/ordonnance",    verifytoken, consultation.insertOrdonnance);
router.post("/:id/documents", verifytoken, consultation.upload.single('file'), consultation.uploadDocument);
router.get("/:id/documents",  verifytoken, consultation.getDocuments);

// Bilans biologiques
router.post("/bilan",               verifytoken, consultation.createBilan);
router.get("/patient/:id/bilans",   verifytoken, consultation.getBilansByPatient);
router.delete("/bilan/:id",         verifytoken, consultation.deleteBilan);
router.put("/bilan/:id/statut",     verifytoken, consultation.updateBilanStatut);

router.put("/:id",            consultation.updateConsultation);
router.delete("/:id", verifytoken, consultation.deleteConsultation);
module.exports = router