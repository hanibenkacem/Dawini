import { useState, useEffect, useCallback, useRef } from "react";
import { API_BASE } from '../config/api';

const API = import.meta.env.VITE_API_URL || `${API_BASE}`;

// ─── PALETTES ─────────────────────────────────────────────────────────────────
const LIGHT = {
  bg: "#F0F4F8", surface: "#FFFFFF", surfaceAlt: "#FAFBFC",
  border: "#E2E8F0", text: "#0F2942", textSoft: "#64748B",
  teal: "#0E7490", tealLight: "#CFFAFE", tealMid: "#06B6D4",
  tealGhost: "rgba(14,116,144,0.08)",
  slateLight: "#F1F5F9", red: "#DC2626", redLight: "#FEF2F2",
  green: "#16A34A", greenLight: "#F0FDF4",
  amber: "#D97706", amberLight: "#FFFBEB",
  purple: "#7C3AED", purpleLight: "#F5F3FF",
  cash: "#16A34A", cashLight: "rgba(22,163,74,0.12)",
  chifaa: "#7C3AED", chifaaLight: "rgba(124,58,237,0.12)",
  shadow: "rgba(15,41,66,0.07)", shadowMd: "rgba(15,41,66,0.13)",
  gridLine: "rgba(100,116,139,0.10)",
  tooltipBg: "#0F2942",
};
const DARK = {
  bg: "#0D1520", surface: "#141E2E", surfaceAlt: "#1A2539",
  border: "#253047", text: "#E2EAF4", textSoft: "#7B93B8",
  teal: "#22D3EE", tealLight: "#083344", tealMid: "#06B6D4",
  tealGhost: "rgba(34,211,238,0.07)",
  slateLight: "#1E2B3E", red: "#F87171", redLight: "#2D1515",
  green: "#4ADE80", greenLight: "#0F2D1A",
  amber: "#FCD34D", amberLight: "#292107",
  purple: "#A78BFA", purpleLight: "#1E1040",
  cash: "#4ADE80", cashLight: "rgba(74,222,128,0.12)",
  chifaa: "#A78BFA", chifaaLight: "rgba(167,139,250,0.12)",
  shadow: "rgba(0,0,0,0.3)", shadowMd: "rgba(0,0,0,0.5)",
  gridLine: "rgba(255,255,255,0.05)",
  tooltipBg: "#1A2539",
};

// ─── RESPONSIVE HOOK ──────────────────────────────────────────────────────────
function useWindowWidth() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return w;
}

// ─── RANGE CONFIG ─────────────────────────────────────────────────────────────
const RANGES = [
  { key: "week",    label: "7 jours"  },
  { key: "month",   label: "Ce mois"  },
  { key: "quarter", label: "3 mois"   },
  { key: "year",    label: "Cette année" },
];

// ─── FORMAT HELPERS ──────────────────────────────────────────────────────────
function fmt(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}
function fmtFull(n) {
  return Number(n).toLocaleString("fr-DZ") + " DA";
}
function pct(a, total) {
  if (!total) return "0%";
  return Math.round((a / total) * 100) + "%";
}

// ─── KPI CARD ─────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, accent, accentBg, C, animate }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 18, padding: "20px 22px",
      boxShadow: `0 2px 12px ${C.shadow}`,
      flex: "1 1 150px", position: "relative", overflow: "hidden",
      animation: animate ? "fadeUp .4s ease both" : "none",
    }}>
      <div style={{
        position: "absolute", top: -20, right: -20,
        width: 90, height: 90, borderRadius: "50%",
        background: accentBg || accent, opacity: 0.13,
      }} />
      <div style={{ fontSize: 22, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: "-0.5px", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: C.textSoft, marginTop: 5, fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: accent, marginTop: 4, fontWeight: 700 }}>{sub}</div>}
    </div>
  );
}

// ─── PAYMENT METHOD PILL ──────────────────────────────────────────────────────
function MethodBar({ cashTotal, chifaaTotal, C }) {
  const total = cashTotal + chifaaTotal;
  const cashPct = total ? (cashTotal / total) * 100 : 50;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: "18px 22px", boxShadow: `0 2px 12px ${C.shadow}`, animation: "fadeUp .42s ease" }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: C.textSoft, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
        💳 Répartition par mode de paiement
      </div>
      {/* Bar */}
      <div style={{ height: 10, borderRadius: 99, overflow: "hidden", background: C.border, marginBottom: 14 }}>
        <div style={{ height: "100%", width: `${cashPct}%`, background: C.cash, borderRadius: 99, transition: "width .6s ease" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        {/* Cash */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.cash, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 11, color: C.textSoft, fontWeight: 600 }}>💵 Espèces</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.cash }}>{fmtFull(cashTotal)}</div>
            <div style={{ fontSize: 11, color: C.textSoft }}>{pct(cashTotal, total)} du total</div>
          </div>
        </div>
        {/* Chifaa */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.chifaa, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 11, color: C.textSoft, fontWeight: 600 }}>🏥 Carte Chifaa</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.chifaa }}>{fmtFull(chifaaTotal)}</div>
            <div style={{ fontSize: 11, color: C.textSoft }}>{pct(chifaaTotal, total)} du total</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DUAL-LINE AREA CHART ─────────────────────────────────────────────────────
function AreaChart({ data, C, width: containerWidth }) {
  const [tooltip, setTooltip] = useState(null);
  const svgRef  = useRef(null);
  const padL    = containerWidth < 400 ? 42 : 52;
  const padR    = 20;
  const padT    = 24;
  const padB    = containerWidth < 400 ? 36 : 44;
  const W       = containerWidth;
  const H       = containerWidth < 500 ? 200 : containerWidth < 800 ? 240 : 300;
  const chartW  = W - padL - padR;
  const chartH  = H - padT - padB;

  if (!data || data.length === 0) return null;

  const maxVal  = Math.max(...data.map(d => Math.max(d.cash || 0, d.chifaa || 0, d.paid || 0)), 1);
  const yMax    = Math.ceil(maxVal * 1.20 / 1000) * 1000 || 10000;
  const yTicks  = 4;
  const xStep   = chartW / Math.max(data.length - 1, 1);

  function px(i) { return padL + i * xStep; }
  function py(v) { return padT + chartH - (v / yMax) * chartH; }

  function buildPath(points) {
    if (points.length === 0) return "";
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const cp1x = points[i].x + xStep * 0.4;
      const cp2x = points[i + 1].x - xStep * 0.4;
      d += ` C ${cp1x} ${points[i].y}, ${cp2x} ${points[i+1].y}, ${points[i+1].x} ${points[i+1].y}`;
    }
    return d;
  }

  const cashPts   = data.map((d, i) => ({ x: px(i), y: py(d.cash   || 0) }));
  const chifaaPts = data.map((d, i) => ({ x: px(i), y: py(d.chifaa || 0) }));
  const totalPts  = data.map((d, i) => ({ x: px(i), y: py(d.paid   || 0) }));

  const cashLine   = buildPath(cashPts);
  const chifaaLine = buildPath(chifaaPts);
  const totalLine  = buildPath(totalPts);

  const totalArea  = totalLine
    + ` L ${px(data.length - 1)} ${padT + chartH}`
    + ` L ${px(0)} ${padT + chartH} Z`;

  const labelStep = data.length > 20 ? Math.ceil(data.length / 10) : data.length > 10 ? 2 : 1;

  function handleMouseMove(e) {
    const svg  = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mouseX = (e.clientX ?? e.touches?.[0]?.clientX ?? 0) - rect.left;
    const idx  = Math.round((mouseX - padL) / xStep);
    if (idx >= 0 && idx < data.length) setTooltip({ idx, x: px(idx), y: py(data[idx].paid || 0) });
  }

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg
        ref={svgRef} width={W} height={H}
        onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip(null)}
        onTouchMove={handleMouseMove} onTouchEnd={() => setTooltip(null)}
        style={{ display: "block", cursor: "crosshair", overflow: "visible" }}
      >
        <defs>
          <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={C.teal} stopOpacity="0.15" />
            <stop offset="100%" stopColor={C.teal} stopOpacity="0"    />
          </linearGradient>
        </defs>

        {/* Grid */}
        {Array.from({ length: yTicks + 1 }).map((_, i) => {
          const v = (yMax / yTicks) * i;
          const y = py(v);
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={padL + chartW} y2={y} stroke={C.gridLine} strokeWidth={1} strokeDasharray="4 4" />
              <text x={padL - 6} y={y + 4} textAnchor="end" fontSize={containerWidth < 400 ? 9 : 10} fill={C.textSoft} fontFamily="'Plus Jakarta Sans',sans-serif">{fmt(v)}</text>
            </g>
          );
        })}

        {/* X labels */}
        {data.map((d, i) => {
          if (i % labelStep !== 0) return null;
          return <text key={i} x={px(i)} y={H - padB + 16} textAnchor="middle" fontSize={containerWidth < 400 ? 9 : 10} fill={C.textSoft} fontFamily="'Plus Jakarta Sans',sans-serif">{d.label}</text>;
        })}

        {/* Baseline */}
        <line x1={padL} y1={padT + chartH} x2={padL + chartW} y2={padT + chartH} stroke={C.border} strokeWidth={1} />

        {/* Total area fill */}
        <path d={totalArea} fill="url(#totalGrad)" />

        {/* Total line (teal, thicker, behind) */}
        <path d={totalLine} fill="none" stroke={C.teal} strokeWidth={2} strokeOpacity={0.35} strokeLinejoin="round" strokeLinecap="round" strokeDasharray="5 3" />

        {/* Cash line (green) */}
        <path d={cashLine} fill="none" stroke={C.cash} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

        {/* Chifaa line (purple) */}
        <path d={chifaaLine} fill="none" stroke={C.chifaa} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

        {/* Dots */}
        {data.map((d, i) => {
          if (data.length > 15 && i % labelStep !== 0) return null;
          return (
            <g key={i}>
              <circle cx={px(i)} cy={py(d.cash   || 0)} r={3} fill={C.surface} stroke={C.cash}   strokeWidth={2} />
              <circle cx={px(i)} cy={py(d.chifaa || 0)} r={3} fill={C.surface} stroke={C.chifaa} strokeWidth={2} />
            </g>
          );
        })}

        {/* Crosshair */}
        {tooltip && (
          <>
            <line x1={tooltip.x} y1={padT} x2={tooltip.x} y2={padT + chartH} stroke={C.teal} strokeWidth={1} strokeDasharray="4 3" opacity={0.5} />
            <circle cx={tooltip.x} cy={py(data[tooltip.idx].cash   || 0)} r={5} fill={C.cash}   stroke={C.surface} strokeWidth={2} />
            <circle cx={tooltip.x} cy={py(data[tooltip.idx].chifaa || 0)} r={5} fill={C.chifaa} stroke={C.surface} strokeWidth={2} />
          </>
        )}
      </svg>

      {/* Tooltip bubble */}
      {tooltip && (() => {
        const d  = data[tooltip.idx];
        const bx = tooltip.x > W * 0.7 ? tooltip.x - 162 : tooltip.x + 14;
        const by = Math.max(padT, tooltip.y - 60);
        return (
          <div style={{
            position: "absolute", left: bx, top: by,
            background: C.tooltipBg, color: "#fff",
            borderRadius: 10, padding: "10px 14px",
            fontSize: 12, pointerEvents: "none",
            boxShadow: `0 8px 24px ${C.shadowMd}`,
            minWidth: 160, zIndex: 10,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 7, opacity: 0.7, fontSize: 11, borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 5 }}>{d.label}</div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 3 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.cash, display: "inline-block" }} />
                <span style={{ opacity: 0.75 }}>Espèces</span>
              </span>
              <span style={{ fontWeight: 800, color: C.cash }}>{fmtFull(d.cash || 0)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 3 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.chifaa, display: "inline-block" }} />
                <span style={{ opacity: 0.75 }}>Chifaa</span>
              </span>
              <span style={{ fontWeight: 800, color: C.chifaa }}>{fmtFull(d.chifaa || 0)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 5, marginTop: 3 }}>
              <span style={{ opacity: 0.7 }}>Total encaissé</span>
              <span style={{ fontWeight: 800, color: "#22D3EE" }}>{fmtFull(d.paid || 0)}</span>
            </div>
            {d.pending > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 3 }}>
                <span style={{ opacity: 0.7 }}>Impayé</span>
                <span style={{ fontWeight: 700, color: "#F87171" }}>{fmtFull(d.pending)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 3, opacity: 0.6 }}>
              <span>Transactions</span>
              <span style={{ fontWeight: 600 }}>{d.transactions}</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── SKELETON ─────────────────────────────────────────────────────────────────
function Skeleton({ C, height = 16, width = "100%", radius = 8 }) {
  return (
    <div style={{
      height, width, borderRadius: radius,
      background: C.border,
      animation: "skeletonPulse 1.4s ease-in-out infinite",
    }} />
  );
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
function EmptyChart({ C }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 0", color: C.textSoft }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Aucune donnée</div>
      <div style={{ fontSize: 13 }}>Aucun paiement enregistré sur cette période.</div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function Statistiques() {
  const [dark, setDark] = useState(() => localStorage.getItem("med-theme") === "dark");
  const C               = dark ? DARK : LIGHT;
  const width           = useWindowWidth();
  const isMobile        = width <= 480;
  const isTablet        = width > 480 && width <= 768;

  const [range, setRange]     = useState("month");
  const [data, setData]       = useState(null);
  const [kpi, setKpi]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const chartRef        = useRef(null);
  const [chartW, setChartW] = useState(600);

  useEffect(() => {
    if (!chartRef.current) return;
    const obs = new ResizeObserver(([entry]) => setChartW(entry.contentRect.width || 600));
    obs.observe(chartRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const fn = e => setDark(e.detail);
    window.addEventListener("med-theme-change", fn);
    return () => window.removeEventListener("med-theme-change", fn);
  }, []);

  const fetchStats = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`${API}/statistiques/revenue?range=${range}`)
      .then(r => { if (!r.ok) throw new Error(`Erreur ${r.status}`); return r.json(); })
      .then(j => {
        setData(j.data || []);
        setKpi(j.kpi  || null);
        setLoading(false);
      })
      .catch(e => {
        console.error("[Statistiques]", e);
        setError("Impossible de charger les statistiques.");
        setLoading(false);
      });
  }, [range]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const hasData = data && data.some(d => d.paid > 0 || d.pending > 0 || d.cash > 0 || d.chifaa > 0);
  const outerPad = isMobile ? "16px" : isTablet ? "20px 24px" : "28px 32px";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes fadeUp        { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes skeletonPulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        .range-btn { transition: all .15s; }
        .range-btn:hover { opacity:.85; }
      `}</style>

      <div style={{
        flex: 1, background: C.bg, minHeight: "100vh",
        padding: outerPad, paddingBottom: "52px",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        color: C.text, boxSizing: "border-box",
        overflowY: "auto", transition: "background .3s",
      }}>

        {/* ── HEADER ── */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          marginBottom: isMobile ? 16 : 24, flexWrap: "wrap", gap: 12,
          animation: "fadeUp .3s ease",
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 24, fontWeight: 800, color: C.text, letterSpacing: "-0.5px" }}>
              📊 Statistiques
            </h1>
            {!isMobile && <p style={{ margin: "4px 0 0", color: C.textSoft, fontSize: 13 }}>Suivi des revenus et performances financières</p>}
          </div>
          <button onClick={fetchStats} disabled={loading} title="Actualiser" style={{
            padding: "9px 13px", background: C.surface,
            border: `1px solid ${C.border}`, borderRadius: 12,
            color: C.textSoft, fontSize: 15, cursor: loading ? "not-allowed" : "pointer",
          }}>🔄</button>
        </div>

        {/* ── ERROR ── */}
        {error && (
          <div style={{
            background: C.redLight, border: `1px solid ${C.red}`,
            borderRadius: 12, padding: "11px 14px", marginBottom: 18,
            display: "flex", justifyContent: "space-between", alignItems: "center",
            gap: 10, flexWrap: "wrap", animation: "fadeUp .3s ease",
          }}>
            <span style={{ color: C.red, fontWeight: 600, fontSize: 13 }}>⚠️ {error}</span>
            <button onClick={fetchStats} style={{
              background: C.red, color: "#fff", border: "none", borderRadius: 8,
              padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}>Réessayer</button>
          </div>
        )}

        {/* ── RANGE SWITCHER ── */}
        <div style={{ display: "flex", gap: 6, marginBottom: isMobile ? 14 : 20, flexWrap: "wrap", animation: "fadeUp .35s ease" }}>
          {RANGES.map(r => (
            <button key={r.key} className="range-btn" onClick={() => setRange(r.key)} style={{
              padding: isMobile ? "7px 12px" : "8px 18px",
              borderRadius: 10, border: "1.5px solid",
              borderColor: range === r.key ? C.teal : C.border,
              background: range === r.key ? `linear-gradient(135deg, ${C.teal}, ${C.tealMid})` : C.surface,
              color: range === r.key ? "#fff" : C.textSoft,
              fontWeight: 700, fontSize: isMobile ? 12 : 13,
              cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif",
              boxShadow: range === r.key ? `0 4px 12px ${C.tealGhost}` : "none",
            }}>
              {r.label}
            </button>
          ))}
        </div>

        {/* ── KPI CARDS ── */}
        <div style={{ display: "flex", gap: 12, marginBottom: isMobile ? 14 : 16, flexWrap: "wrap", animation: "fadeUp .4s ease" }}>
          {loading ? (
            Array.from({ length: isMobile ? 3 : 5 }).map((_, i) => (
              <div key={i} style={{ flex: "1 1 150px", background: C.surface, borderRadius: 18, padding: "20px 22px", border: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 10 }}>
                <Skeleton C={C} height={24} width={32} />
                <Skeleton C={C} height={22} width="70%" />
                <Skeleton C={C} height={12} width="50%" />
              </div>
            ))
          ) : kpi ? (
            <>
              <KpiCard icon="💰" label="Total encaissé"     value={fmtFull(kpi.totalPaid)}         sub={`${kpi.totalTransactions} transaction(s)`}     accent={C.teal}   C={C} animate />
              <KpiCard icon="💵" label="Espèces"            value={fmtFull(kpi.totalCash || 0)}    sub={pct(kpi.totalCash || 0, kpi.totalPaid) + " du total"} accent={C.cash}   accentBg={C.cashLight}   C={C} animate />
              <KpiCard icon="🏥" label="Carte Chifaa"       value={fmtFull(kpi.totalChifaa || 0)}  sub={pct(kpi.totalChifaa || 0, kpi.totalPaid) + " du total"} accent={C.chifaa} accentBg={C.chifaaLight} C={C} animate />
              {kpi.bestPeriod && <KpiCard icon="🏆" label="Meilleure période" value={fmtFull(kpi.bestPeriod.amount)} sub={kpi.bestPeriod.label} accent={C.amber} C={C} animate />}
              {!isMobile && <KpiCard icon="⏳" label="Montant impayé" value={fmtFull(kpi.totalPending)} sub="En attente" accent={C.red} C={C} animate />}
            </>
          ) : null}
        </div>

        {/* ── METHOD BAR + CHART CARD row ── */}
        <div style={{ display: "flex", gap: 16, marginBottom: isMobile ? 14 : 20, flexWrap: "wrap", alignItems: "flex-start" }}>

          {/* Payment method breakdown */}
          <div style={{ flex: "0 0 auto", width: isMobile ? "100%" : 240 }}>
            {loading ? (
              <div style={{ background: C.surface, borderRadius: 18, padding: "20px 22px", border: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 12 }}>
                <Skeleton C={C} height={14} width="70%" />
                <Skeleton C={C} height={10} width="100%" radius={99} />
                <Skeleton C={C} height={40} width="100%" />
              </div>
            ) : kpi ? (
              <MethodBar cashTotal={kpi.totalCash || 0} chifaaTotal={kpi.totalChifaa || 0} C={C} />
            ) : null}
          </div>

          {/* Chart card */}
          <div style={{ flex: "1 1 300px", background: C.surface, borderRadius: 20, border: `1px solid ${C.border}`, boxShadow: `0 4px 20px ${C.shadow}`, overflow: "hidden", animation: "fadeUp .45s ease" }}>
            {/* Chart header */}
            <div style={{
              padding: isMobile ? "16px 16px 12px" : "18px 22px 12px",
              borderBottom: `1px solid ${C.border}`,
              display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8,
            }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: isMobile ? 14 : 15, color: C.text }}>Revenus par mode de paiement</div>
                <div style={{ fontSize: 12, color: C.textSoft, marginTop: 2 }}>{RANGES.find(r => r.key === range)?.label} · en DA</div>
              </div>
              {/* Legend */}
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                {[
                  { color: C.cash,   label: "Espèces" },
                  { color: C.chifaa, label: "Chifaa"  },
                  { color: C.teal,   label: "Total", dashed: true },
                ].map(l => (
                  <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 20, height: 2.5, borderRadius: 99, opacity: l.dashed ? 0.5 : 1, borderTop: l.dashed ? `2px dashed ${l.color}` : "none", background: l.dashed ? "none" : l.color }} />
                    <span style={{ fontSize: 11, color: C.textSoft, fontWeight: 600 }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart body */}
            <div ref={chartRef} style={{ padding: isMobile ? "12px 8px 4px" : "16px 12px 6px" }}>
              {loading ? (
                <div style={{ padding: "16px 0" }}>
                  <Skeleton C={C} height={isMobile ? 180 : 260} width="100%" radius={12} />
                </div>
              ) : !hasData ? (
                <EmptyChart C={C} />
              ) : (
                <AreaChart data={data} C={C} width={chartW} />
              )}
            </div>

            {/* Footer summary */}
            {!loading && kpi && hasData && (
              <div style={{
                padding: isMobile ? "10px 16px" : "12px 22px",
                borderTop: `1px solid ${C.border}`,
                background: C.surfaceAlt,
                display: "flex", gap: isMobile ? 16 : 28, flexWrap: "wrap",
              }}>
                {[
                  { label: "Total encaissé", value: fmtFull(kpi.totalPaid),         color: C.teal   },
                  { label: "💵 Espèces",      value: fmtFull(kpi.totalCash || 0),    color: C.cash   },
                  { label: "🏥 Chifaa",       value: fmtFull(kpi.totalChifaa || 0),  color: C.chifaa },
                  { label: "Impayés",         value: fmtFull(kpi.totalPending),       color: C.red    },
                  { label: "Transactions",    value: kpi.totalTransactions,           color: C.textSoft },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ fontSize: 10, color: C.textSoft, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: s.color, marginTop: 2 }}>{s.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── INSIGHT STRIP ── */}
        {!loading && kpi && hasData && (
          <div style={{
            background: C.tealGhost, border: `1px solid ${C.border}`,
            borderRadius: 14, padding: "13px 18px",
            display: "flex", alignItems: "center", gap: 12,
            animation: "fadeUp .5s ease",
          }}>
            <span style={{ fontSize: 20 }}>💡</span>
            <div style={{ fontSize: 13, color: C.textSoft, lineHeight: 1.5 }}>
              {kpi.totalCash || kpi.totalChifaa ? (
                <>
                  {(kpi.totalCash || 0) >= (kpi.totalChifaa || 0)
                    ? <>Les paiements en <strong style={{ color: C.cash }}>espèces</strong> dominent avec <strong style={{ color: C.cash }}>{fmtFull(kpi.totalCash || 0)}</strong> ({pct(kpi.totalCash || 0, kpi.totalPaid)} du total).</>
                    : <>La <strong style={{ color: C.chifaa }}>carte Chifaa</strong> domine avec <strong style={{ color: C.chifaa }}>{fmtFull(kpi.totalChifaa || 0)}</strong> ({pct(kpi.totalChifaa || 0, kpi.totalPaid)} du total).</>
                  }
                  {kpi.totalPending > 0 && <> Il reste <strong style={{ color: C.red }}>{fmtFull(kpi.totalPending)}</strong> de paiements en attente.</>}
                </>
              ) : kpi.bestPeriod ? (
                <>La meilleure période est <strong style={{ color: C.text }}>{kpi.bestPeriod.label}</strong> avec <strong style={{ color: C.teal }}>{fmtFull(kpi.bestPeriod.amount)}</strong> encaissés.</>
              ) : "Aucune donnée disponible pour générer un aperçu."}
            </div>
          </div>
        )}
      </div>
    </>
  );
}