// routes/paiementRoutes.js

const express = require("express");
const router = express.Router();
const {
  getAllPaiements,
  getPaiementById,
  createPaiement,
  updatePaiement,
  deletePaiement,
  getStats,
} = require("../controllers/paymentController.controller");

// ─── ROUTES ───────────────────────────────────────────────────────────────────
//  GET    /api/paiements/stats      → KPI cards (must be BEFORE /:id)
//  GET    /api/paiements            → list with filters + pagination
//  GET    /api/paiements/:id        → single payment (used by receipt modal)
//  POST   /api/paiements            → create new payment
//  PUT    /api/paiements/:id        → update payment
//  DELETE /api/paiements/:id        → delete payment

router.get("/stats", getStats);
router.get("/", getAllPaiements);
router.get("/:id", getPaiementById);
router.post("/", createPaiement);
router.put("/:id", updatePaiement);
router.delete("/:id", deletePaiement);

module.exports = router;