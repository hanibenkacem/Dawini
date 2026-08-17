const express = require('express')
const router = express.Router()
const ordonnance = require('../controllers/OrdannanceSettings.controller')
const verifytoken = require('../middlewares/AuthMiddleware')
const multer = require('multer')
const path = require('path')

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '../uploads');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
      cb(null, Date.now() + path.extname(file.originalname)); // unique name
    }
  });
  const upload = multer({ storage: storage });
router.post('/',verifytoken,upload.fields([
    {name:'logo',maxCount:1},
    {name:'background',maxCount:1}
])   ,ordonnance.SaveOrdonnance)
router.get('/me',verifytoken,ordonnance.GetOrdonnance)
module.exports = router