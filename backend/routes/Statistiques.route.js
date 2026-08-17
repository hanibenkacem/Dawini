const express = require("express");
const router  = express.Router();
const { getRevenueSeries } = require("../controllers/Statistique.controller");
 

router.get("/revenue", getRevenueSeries);
 
module.exports = router;
 