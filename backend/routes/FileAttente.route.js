const express = require('express')
const router = express.Router()
const fileattente = require('../controllers/FileAttente.controller')
const verifytoken = require('../middlewares/AuthMiddleware')


router.post('/ajouter',verifytoken,fileattente.AddNewPatientToQueue)
router.get('/',verifytoken,fileattente.GetFileAttente)
router.post('/suivant',verifytoken,fileattente.NextPatient)
router.post('/passer-en-paiement',verifytoken,fileattente.passerEnPaiement)
router.post('/confirmer-paiement',verifytoken,fileattente.confirmerPaiement)
router.get('/patient-search',verifytoken,fileattente.SearchPatients)
router.get('/call-signal',verifytoken, fileattente.getCallSignal);
router.delete("/:id", verifytoken, fileattente.RemoveFromQueue);
module.exports = router