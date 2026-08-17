const express = require('express')
const router = express.Router()
const verifytoken = require('../middlewares/AuthMiddleware')
const info = require('../controllers/UserInfo.controller')

router.get('/',verifytoken,info.GetLoggedInUser)
router.get('/doctors', verifytoken,info.getDoctors);
module.exports = router