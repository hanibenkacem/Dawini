const express = require('express')
const router = express.Router()
const rendezvous = require('../controllers/rendezvous.controller')
const verifytoken = require('../middlewares/AuthMiddleware')

router.post('/add',verifytoken,rendezvous.createRdv)
router.get('/gettoday',verifytoken,rendezvous.getToday)
router.post('/arrived/:id',verifytoken,rendezvous.checkIn)
router.get('/getall',verifytoken,rendezvous.getAllRendezVous)
router.get('/upcoming', verifytoken, rendezvous.getUpcoming);
router.get('/past',     verifytoken, rendezvous.getPast);
router.delete('/:id', verifytoken, rendezvous.cancelRdv);
module.exports = router