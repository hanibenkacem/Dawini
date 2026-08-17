const express = require('express');
const path = require('path');
const cron = require('node-cron');
const cors = require('cors');

const PORT = 3000;

const app = express();
app.use(express.json());
app.use(cors());

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');
app.use('/uploads', express.static(UPLOADS_DIR));

// Lazy-load db so the connection is created AFTER env vars are set by main.js
const db = require('./db/db');

cron.schedule('0 0 * * *', () => {
  const sql = `
    UPDATE rendez_vous
    SET statut = 'absent'
    WHERE statut = 'planifie'
    AND DATE(date_rdv) < CURDATE()
  `;
  db.query(sql, (err, result) => {
    if (err) {
      console.error('[Cron] Erreur marquage absences:', err);
    } else {
      console.log(`[Cron] ${result.affectedRows} rendez-vous marqués comme non_presente`);
    }
  });
});

app.use('/patient', require('./routes/PatientRoute.route'));
app.use('/user', require('./routes/UserAuth.route'));
app.use('/consultation', require('./routes/Consultation.route'));
app.use('/me', require('./routes/UserInfo.route'));
app.use('/ordonnance-settings', require('./routes/Ordonnace.route'));
app.use('/medicaments', require('./routes/Medicament.route'));
app.use('/ordonnance', require('./routes/Ordonnace.route'));
app.use('/file-attente', require('./routes/FileAttente.route'));
app.use('/rendez-vous', require('./routes/RendezVous.route'));
app.use('/paiements', require('./routes/Payment.route'));
app.use('/statistiques', require('./routes/Statistiques.route'));
app.use('/api/admin', require('./routes/Admin.route'));

app.get('/api/health', (req, res) => res.sendStatus(200));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}/`);
});