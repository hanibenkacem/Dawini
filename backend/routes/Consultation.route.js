const express  = require('express')
const router   = express.Router()
const consultation = require('../controllers/Consultation.controller')
const verifytoken  = require('../middlewares/AuthMiddleware')

router.get("/patient/:id",    verifytoken, consultation.GetConsultationById);
router.post("/",              verifytoken, consultation.createConsultation);
router.post("/ordonnance",    verifytoken, consultation.insertOrdonnance);
router.post("/:id/documents", verifytoken, consultation.upload.single('file'), consultation.uploadDocument);
router.get("/:id/documents",  verifytoken, consultation.getDocuments);
router.put("/:id",            consultation.updateConsultation);

module.exports = router