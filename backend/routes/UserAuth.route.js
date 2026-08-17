const express = require('express')
const router = express.Router()
const user = require('../controllers/UserAuth.controller')

router.post('/login',user.UserLogin)
router.post('/register',user.UserRegister)


module.exports = router