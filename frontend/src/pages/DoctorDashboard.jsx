import { useEffect, useState, createContext, useContext } from "react";
  import axios from "axios";
  import { useNavigate } from "react-router-dom";

import { API_BASE } from '../config/api';
  const API      = `${API_BASE}/file-attente`;

  const token = () => localStorage.getItem("token");
  const auth  = () => ({ Authorization: `Bearer ${token()}` });

  // PALETTES (identical to ReceptionDashboard)
  const LIGHT = {
    bg: "#F0F4F8", surface: "#FFFFFF", surfaceAlt: "#FAFBFC",
    border: "#E2E8F0", borderSoft: "#F1F5F9",
    text: "#0F2942", textSoft: "#64748B",
    teal: "#0E7490", tealLight: "#CFFAFE", tealMid: "#06B6D4",
    navy: "#0F2942", navyCard: "#1a3f5c",
    green: "#059669", greenLight: "#D1FAE5",
    amber: "#D97706", amberLight: "#FEF3C7",
    red: "#DC2626", redLight: "#FEE2E2",
    slate: "#64748B", slateLight: "#F1F5F9",
    shadow: "rgba(15,41,66,0.07)", shadowMd: "rgba(15,41,66,0.12)",
    rowHover: "#F1F5F9",
    avatarBg: "linear-gradient(135deg,#CFFAFE 0%,#BAE6FD 100%)", avatarColor: "#0E7490",
    theadBg: "#FAFBFC",
  };
  const DARK = {
    bg: "#0D1520", surface: "#141E2E", surfaceAlt: "#1A2539",
    border: "#253047", borderSoft: "#1E2B40",
    text: "#E2EAF4", textSoft: "#7B93B8",
    teal: "#22D3EE", tealLight: "#083344", tealMid: "#06B6D4",
    navy: "#0F2942", navyCard: "#0A1628",
    green: "#34D399", greenLight: "#064E3B",
    amber: "#FBBF24", amberLight: "#451A03",
    red: "#F87171", redLight: "#450A0A",
    slate: "#94A3B8", slateLight: "#1E2B3E",
    shadow: "rgba(0,0,0,0.3)", shadowMd: "rgba(0,0,0,0.45)",
    rowHover: "#1A2539",
    avatarBg: "linear-gradient(135deg,#083344 0%,#0C4A6E 100%)", avatarColor: "#22D3EE",
    theadBg: "#111C2C",
  };

  const ThemeCtx = createContext({ C: LIGHT, dark: false });
  const useTheme = () => useContext(ThemeCtx);
const MED_GLOBALS_CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #94A3B8; border-radius: 10px; }
    @keyframes fadeUp   { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
    @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
    @keyframes rowSlide { from { opacity:0; transform:translateX(-6px); } to { opacity:1; transform:translateX(0); } }
    @keyframes livePulse {
      0%,100% { box-shadow: 0 0 0 0 rgba(14,116,144,0.4); }
      50%     { box-shadow: 0 0 0 7px rgba(14,116,144,0); }
    }
    @keyframes alertPulse {
      0%,100% { box-shadow: 0 0 0 0 rgba(217,119,6,0.5); }
      50%     { box-shadow: 0 0 0 12px rgba(217,119,6,0); }
    }
    @keyframes alertSlideIn {
      from { opacity:0; transform:translateY(-24px) scale(0.97); }
      to   { opacity:1; transform:translateY(0) scale(1); }
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .med-btn:hover  { filter: brightness(1.1); transform: translateY(-1px); }
    .med-stat:hover { transform: translateY(-2px); }
`;

function useMedGlobals() {
  useEffect(() => {
    let el = document.getElementById("med-globals");
    if (!el) {
      el = document.createElement("style");
      el.id = "med-globals";
      el.textContent = MED_GLOBALS_CSS;
      document.head.appendChild(el);
    }
    return () => {
      const tag = document.getElementById("med-globals");
      if (tag) tag.remove();
    };
  }, []);
}
  function Badge({ status }) {
    const { C } = useTheme();
    const MAP = {
      en_attente:      { label: "En attente",   fg: C.slate, bg: C.slateLight, dot: C.slate   },
      en_consultation: { label: "Consultation", fg: C.teal,  bg: C.tealLight,  dot: C.tealMid },
      en_paiement:     { label: "En caisse",    fg: C.amber, bg: C.amberLight, dot: C.amber   },
      termine:         { label: "Termine",      fg: C.green, bg: C.greenLight, dot: C.green   },
    };
    const s = MAP[status] || { label: status, fg: C.slate, bg: C.slateLight, dot: C.slate };
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, background: s.bg, color: s.fg, fontSize: 12, fontWeight: 700 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.dot, flexShrink: 0, animation: status === "en_consultation" ? "livePulse 1.6s ease-in-out infinite" : "none" }} />
        {s.label}
      </span>
    );
  }

  function Btn({ children, variant = "primary", size = "md", style: ex = {}, ...rest }) {
    const { C } = useTheme();
    const V = {
      primary: { background: C.teal,        color: "#fff", border: "none", boxShadow: `0 2px 8px ${C.shadow}` },
      ghost:   { background: "transparent", color: C.text, border: `1.5px solid ${C.border}`, boxShadow: "none" },
      soft:    { background: C.tealLight,   color: C.teal, border: "none", boxShadow: "none" },
    };
    const S = {
      sm: { padding: "6px 14px",  fontSize: 12, borderRadius: 8  },
      md: { padding: "9px 20px",  fontSize: 13, borderRadius: 10 },
    };
    return (
      <button className="med-btn" style={{ ...V[variant], ...S[size], fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7, transition: "filter .15s, transform .12s", fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: "nowrap", ...ex }} {...rest}>
        {children}
      </button>
    );
  }

  function StatCard({ label, value, icon, color, lightColor }) {
    const { C } = useTheme();
    return (
      <div className="med-stat" style={{ background: C.surface, borderRadius: 16, padding: "18px 20px", boxShadow: `0 2px 12px ${C.shadow}`, border: `1px solid ${C.border}`, transition: "transform .2s" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: lightColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{icon}</div>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: value > 0 ? color : C.border, marginTop: 4 }} />
        </div>
        <div style={{ fontSize: 32, fontWeight: 800, color: C.text, lineHeight: 1, marginBottom: 4 }}>{value}</div>
        <div style={{ fontSize: 12, color: C.textSoft, fontWeight: 600 }}>{label}</div>
      </div>
    );
  }

  function CallNextCard({ queue }) {
    const { C } = useTheme();
    const navigate = useNavigate();
    const [calling, setCalling]     = useState(false);
    const [callError, setCallError] = useState(null);

    const user     = JSON.parse(localStorage.getItem("user") || "{}");
    const doctorId = user.id;

    const waiting    = queue.filter(p => p.statut === "en_attente");
    const next       = waiting[0] ?? null;
    const hasWaiting = waiting.length > 0;

    const handleCall = async () => {
      if (calling || !hasWaiting) return;
      setCalling(true);
      setCallError(null);
      try {
        const res = await axios.post(`${API}/suivant`, {}, { headers: auth() });
        // Navigate to the patient dossier with the consultation ID in router state.
        // PatientDossier reads this to auto-open the form in edit mode (PATCH).
        // res.data is the file_attente row spread, so res.data.id = file_attente.id
        navigate(`/patient/${res.data.patient_id}`, {
          state: {
            id_consultation: res.data.id_consultation,
            file_id: res.data.id,
          }
        });
      } catch (e) {
        setCallError(e.response?.status === 404 ? "Aucun patient en attente." : "Une erreur est survenue.");
        setCalling(false);
      }
    };

    return (
      <div style={{ borderRadius: 20, overflow: "hidden", position: "relative", background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyCard} 100%)`, boxShadow: `0 8px 32px ${C.shadowMd}`, padding: "32px 36px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 32, animation: "fadeUp .25s ease" }}>
        <div style={{ position: "absolute", top: -40, right: 220, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.03)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -30, right: 80, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.03)", pointerEvents: "none" }} />

        <div style={{ position: "relative", minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: 10 }}>Prochain patient</div>

          {hasWaiting ? (
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: 15, flexShrink: 0, background: C.tealLight, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18, color: C.teal }}>
                {next.nom?.[0]}{next.prenom?.[0]}
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>{next.prenom} {next.nom}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>#{next.ordre}</span>
                  {next.est_urgent && <span style={{ background: C.redLight, color: C.red, fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 20, border: `1px solid ${C.red}55` }}>URGENT</span>}
                  {waiting.length > 1 && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>+ {waiting.length - 1} en attente</span>}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 16, color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>Aucun patient en attente</div>
          )}

          {callError && (
            <div style={{ marginTop: 14, fontSize: 12, color: C.red, background: C.redLight, padding: "8px 14px", borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 6 }}>
              {callError}
            </div>
          )}
        </div>

        <button onClick={handleCall} disabled={!hasWaiting || calling}
          style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 12, padding: "17px 34px", borderRadius: 14, border: "none", background: hasWaiting ? C.teal : "rgba(255,255,255,0.08)", color: hasWaiting ? "#fff" : "rgba(255,255,255,0.25)", fontSize: 15, fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: hasWaiting && !calling ? "pointer" : "not-allowed", transition: "background .2s, transform .12s", animation: hasWaiting && !calling ? "callPulse 2s ease-in-out infinite" : "none", letterSpacing: "-0.01em" }}
          onMouseOver={e => { if (hasWaiting && !calling) e.currentTarget.style.transform = "translateY(-2px)"; }}
          onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; }}
        >
          {calling
            ? <><span style={{ width: 18, height: 18, border: "2.5px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite", flexShrink: 0 }} />Chargement...</>
            : <><span style={{ fontSize: 18 }}>&#9658;</span>Appeler le prochain patient</>
          }
        </button>
      </div>
    );
  }

  function QueueTable({ queue, onOpenConsultation }) {
    const { C } = useTheme();
    return (
      <div style={{ background: C.surface, borderRadius: 18, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: `0 2px 12px ${C.shadow}` }}>
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>File d'attente du jour</div>
            <div style={{ fontSize: 11, color: C.textSoft, marginTop: 1 }}>{new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</div>
          </div>
          <span style={{ marginLeft: "auto", background: C.slateLight, color: C.textSoft, borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 700 }}>
            {queue.length} patient{queue.length !== 1 ? "s" : ""}
          </span>
        </div>

        {queue.length === 0 ? (
          <div style={{ padding: "60px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🎉</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: C.text, marginBottom: 6 }}>File d'attente vide</div>
            <div style={{ fontSize: 13, color: C.textSoft, maxWidth: 280, margin: "0 auto" }}>Aucun patient enregistre pour aujourd'hui.</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: C.theadBg }}>
                {["N", "Patient", "Statut", "Urgence", "Action"].map(h => (
                  <th key={h} style={{ padding: "11px 22px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.textSoft, letterSpacing: "0.07em", textTransform: "uppercase", borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {queue.map((p, i) => (
                <tr key={p.id}
                  style={{ borderBottom: i < queue.length - 1 ? `1px solid ${C.borderSoft}` : "none", animation: `rowSlide .22s ease ${i * 0.04}s both`, transition: "background .12s" }}
                  onMouseOver={e => e.currentTarget.style.background = C.rowHover}
                  onMouseOut={e => e.currentTarget.style.background = "transparent"}
                >
                  <td style={{ padding: "15px 22px", width: 52 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: C.slateLight, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, color: C.textSoft }}>{p.ordre}</div>
                  </td>
                  <td style={{ padding: "15px 22px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: C.avatarBg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, color: C.avatarColor }}>{p.nom?.[0]}{p.prenom?.[0]}</div>
                      <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{p.nom} {p.prenom}</span>
                    </div>
                  </td>
                  <td style={{ padding: "15px 22px" }}><Badge status={p.statut} /></td>
                  <td style={{ padding: "15px 22px" }}>
                    {p.est_urgent
                      ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: C.redLight, color: C.red, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>URGENT</span>
                      : <span style={{ color: C.border, fontSize: 16 }}>-</span>
                    }
                  </td>
                  <td style={{ padding: "15px 22px" }}>
                    {p.statut === "en_consultation" && p.id_consultation
                      ? <Btn variant="soft" size="sm" onClick={() => onOpenConsultation(p)}>Ouvrir</Btn>
                      : <span style={{ color: C.border }}>-</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  export default function DoctorDashboard() {
    useMedGlobals();
    const navigate = useNavigate();

    const [dark, setDark]       = useState(() => localStorage.getItem("med-theme") === "dark");
    const [queue, setQueue]     = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState(null);

    const C = dark ? DARK : LIGHT;

    useEffect(() => {
      document.body.style.background = C.bg;
      document.body.style.transition = "background .3s";
    }, [dark]);

    useEffect(() => {
      const handler = (e) => setDark(e.detail);
      window.addEventListener("med-theme-change", handler);
      return () => window.removeEventListener("med-theme-change", handler);
    }, []);

    // silent=true skips the loading spinner so background polling doesn't flicker the UI
    const fetchQueue = async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const r = await axios.get(API, { headers: auth() });
        setQueue(r.data);
        setError(null);
      } catch {
        setError("Impossible de charger la file d'attente.");
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      fetchQueue();
      const interval = setInterval(() => fetchQueue(true), 5000);
      return () => clearInterval(interval);
    }, []);

    const stats = {
      attente:      queue.filter(p => p.statut === "en_attente").length,
      consultation: queue.filter(p => p.statut === "en_consultation").length,
      paiement:     queue.filter(p => p.statut === "en_paiement").length,
      termine:      queue.filter(p => p.statut === "termine").length,
    };

    const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    return (
      <ThemeCtx.Provider value={{ C, dark }}>
        <div style={{ display: "flex", minHeight: "100vh", background: C.bg, transition: "background .3s", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

          {/* Drop your <Sidebar /> here */}

          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>

            {/* Drop your <Header /> here */}

            <main style={{ flex: 1, padding: "28px 24px", display: "flex", flexDirection: "column", gap: 24, overflowY: "auto" }}>

              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: "-0.02em" }}>Espace Medecin</div>
                  <div style={{ fontSize: 13, color: C.textSoft, marginTop: 3, textTransform: "capitalize" }}>{today}</div>
                </div>
                <button onClick={() => fetchQueue()} disabled={loading}
                  style={{ display: "flex", alignItems: "center", gap: 8, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 16px", cursor: loading ? "not-allowed" : "pointer", color: C.textSoft, fontSize: 13, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", boxShadow: `0 1px 4px ${C.shadow}`, opacity: loading ? 0.6 : 1, transition: "opacity .15s" }}>
                  <span style={{ display: "inline-block", animation: loading ? "spin .8s linear infinite" : "none" }}>&#8635;</span>
                  Actualiser
                </button>
              </div>

              {error && (
                <div style={{ background: C.redLight, border: `1px solid ${C.red}44`, borderRadius: 12, padding: "12px 18px", color: C.red, fontSize: 13, fontWeight: 600 }}>
                  {error}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
                <StatCard label="En attente"   value={stats.attente}      icon="⏳" color={C.slate} lightColor={C.slateLight} />
                <StatCard label="Consultation" value={stats.consultation}  icon="🩺" color={C.teal}  lightColor={C.tealLight}  />
                <StatCard label="En caisse"    value={stats.paiement}      icon="💳" color={C.amber} lightColor={C.amberLight} />
                <StatCard label="Termines"     value={stats.termine}       icon="✅" color={C.green} lightColor={C.greenLight} />
              </div>

              <CallNextCard queue={queue} />

              <QueueTable queue={queue} onOpenConsultation={(p) => navigate(`/patient/${p.patient_id}`, { state: { id_consultation: p.id_consultation, file_id: p.id } })} />

            </main>
          </div>
        </div>
      </ThemeCtx.Provider>
    );
  }