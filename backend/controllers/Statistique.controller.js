// controllers/statistiquesController.js
const db = require("../db/db");

function buildSeries(range) {
  const now = new Date();
  const series = [];

  if (range === "week") {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      series.push({
        label: d.toLocaleDateString("fr-DZ", { weekday: "short", day: "numeric" }),
        date_key: key,
      });
    }
  } else if (range === "month") {
    const year = now.getFullYear();
    const month = now.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= days; d++) {
      const date = new Date(year, month, d);
      if (date > now) break;
      const key = date.toISOString().split("T")[0];
      series.push({ label: String(d).padStart(2, "0"), date_key: key });
    }
  } else if (range === "quarter") {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay() + 1);
      const key = weekStart.toISOString().split("T")[0];
      series.push({
        label: `S${getISOWeek(weekStart)}`,
        date_key: key,
        week_end: new Date(weekStart.getTime() + 6 * 86400000).toISOString().split("T")[0],
      });
    }
  } else if (range === "year") {
    const year = now.getFullYear();
    for (let m = 0; m <= now.getMonth(); m++) {
      const date = new Date(year, m, 1);
      series.push({
        label: date.toLocaleDateString("fr-DZ", { month: "short" }),
        date_key: `${year}-${String(m + 1).padStart(2, "0")}`,
      });
    }
  }

  return series;
}

function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function getRangeBounds(range) {
  const now = new Date();
  const start = new Date();
  if (range === "week")    { start.setDate(now.getDate() - 6); }
  else if (range === "month")   { start.setDate(1); }
  else if (range === "quarter") { start.setDate(now.getDate() - 83); }
  else if (range === "year")    { start.setMonth(0, 1); }
  start.setHours(0, 0, 0, 0);
  return { start, end: now };
}

const getRevenueSeries = (req, res) => {
  const range = ["week", "month", "quarter", "year"].includes(req.query.range)
    ? req.query.range : "month";

  const { start, end } = getRangeBounds(range);
  const series = buildSeries(range);

  let groupSQL, labelFn;

  if (range === "week" || range === "month") {
    groupSQL = `
      SELECT
        DATE(date_paiement) AS period_key,
        COALESCE(SUM(CASE WHEN statut='paid' THEN montant ELSE 0 END), 0) AS paid,
        COALESCE(SUM(CASE WHEN statut='pending' THEN montant ELSE 0 END), 0) AS pending,
        COALESCE(SUM(CASE WHEN statut='paid' AND mode_paiement='cash' THEN montant ELSE 0 END), 0) AS cash,
        COALESCE(SUM(CASE WHEN statut='paid' AND mode_paiement='carte' THEN montant ELSE 0 END), 0) AS chifaa,
        COUNT(*) AS transactions
      FROM paiements
      WHERE date_paiement BETWEEN ? AND ?
      GROUP BY DATE(date_paiement)
    `;
    labelFn = row => row.period_key;
  } else if (range === "quarter") {
    groupSQL = `
      SELECT
        YEARWEEK(date_paiement, 1) AS period_key,
        COALESCE(SUM(CASE WHEN statut='paid' THEN montant ELSE 0 END), 0) AS paid,
        COALESCE(SUM(CASE WHEN statut='pending' THEN montant ELSE 0 END), 0) AS pending,
        COALESCE(SUM(CASE WHEN statut='paid' AND mode_paiement='cash' THEN montant ELSE 0 END), 0) AS cash,
        COALESCE(SUM(CASE WHEN statut='paid' AND mode_paiement='carte' THEN montant ELSE 0 END), 0) AS chifaa,
        COUNT(*) AS transactions,
        DATE(MIN(date_paiement)) AS week_start
      FROM paiements
      WHERE date_paiement BETWEEN ? AND ?
      GROUP BY YEARWEEK(date_paiement, 1)
    `;
    labelFn = row => row.week_start;
  } else {
    groupSQL = `
      SELECT
        DATE_FORMAT(date_paiement, '%Y-%m') AS period_key,
        COALESCE(SUM(CASE WHEN statut='paid' THEN montant ELSE 0 END), 0) AS paid,
        COALESCE(SUM(CASE WHEN statut='pending' THEN montant ELSE 0 END), 0) AS pending,
        COALESCE(SUM(CASE WHEN statut='paid' AND mode_paiement='cash' THEN montant ELSE 0 END), 0) AS cash,
        COALESCE(SUM(CASE WHEN statut='paid' AND mode_paiement='carte' THEN montant ELSE 0 END), 0) AS chifaa,
        COUNT(*) AS transactions
      FROM paiements
      WHERE date_paiement BETWEEN ? AND ?
      GROUP BY DATE_FORMAT(date_paiement, '%Y-%m')
    `;
    labelFn = row => row.period_key;
  }

  db.query(groupSQL, [start, end], (err, rows) => {
    if (err) {
      console.error("[getRevenueSeries]:", err);
      return res.status(500).json({ success: false, message: "Erreur serveur", error: err.message });
    }

    const byKey = {};
    rows.forEach(r => { byKey[labelFn(r)] = r; });

    const chartData = series.map(s => {
      const hit = byKey[s.date_key] || {};
      return {
        label:        s.label,
        paid:         parseFloat(hit.paid    || 0),
        pending:      parseFloat(hit.pending || 0),
        cash:         parseFloat(hit.cash    || 0),
        chifaa:       parseFloat(hit.chifaa  || 0),
        transactions: parseInt(hit.transactions || 0),
      };
    });

    const totalPaid    = chartData.reduce((s, d) => s + d.paid, 0);
    const totalPending = chartData.reduce((s, d) => s + d.pending, 0);
    const totalTx      = chartData.reduce((s, d) => s + d.transactions, 0);
    const totalCash    = chartData.reduce((s, d) => s + d.cash, 0);
    const totalChifaa  = chartData.reduce((s, d) => s + d.chifaa, 0);
    const activeDays   = chartData.filter(d => d.paid > 0 || d.pending > 0).length;
    const avgPerPeriod = activeDays > 0 ? totalPaid / activeDays : 0;
    const bestPeriod   = chartData.reduce((best, d) => d.paid > (best?.paid ?? 0) ? d : best, null);

    res.json({
      success: true,
      range,
      data: chartData,
      kpi: {
        totalPaid,
        totalPending,
        totalCash,
        totalChifaa,
        totalTransactions: totalTx,
        avgPerPeriod,
        bestPeriod: bestPeriod?.paid > 0 ? { label: bestPeriod.label, amount: bestPeriod.paid } : null,
        activePeriods: activeDays,
      },
    });
  });
};

module.exports = { getRevenueSeries };