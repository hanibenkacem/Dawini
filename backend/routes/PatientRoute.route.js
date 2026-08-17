const express = require('express')
const router = express.Router()
const patient = require('../controllers/PatientController.controller')
const verifytoken = require('../middlewares/AuthMiddleware')


router.post('/add',verifytoken,patient.InsertPatient)
router.get('/getall',verifytoken,patient.GetALLPatients)
router.get('/get/:id',verifytoken,patient.getPatient)
router.put('/edit/:id',verifytoken,patient.UpdatePatient)
router.delete('/delete/:id',verifytoken,patient.DeletePatient)

module.exports = router