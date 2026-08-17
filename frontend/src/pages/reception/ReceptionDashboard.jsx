import { useEffect, useState, useRef, createContext, useContext } from "react";
import axios from "axios";
import { API_BASE } from '../../config/api';
import { useQueueAlert } from '../../context/QueueAlertContext'; // Update this path if needed


const API_BASEE  = `${API_BASE}`;
const API       = `${API_BASEE}/file-attente`;
const AJOUT_API = `${API_BASEE}/patient/add`;
const EDIT_API  = `${API_BASEE}/patient/edit`;
const PAT_API   = `${API_BASEE}/file-attente/patient-search`;
const RDV_API   = `${API_BASEE}/rendez-vous`;

const token = () => localStorage.getItem("token");
const auth  = () => ({ Authorization: `Bearer ${token()}` });

// ─── PALETTES ─────────────────────────────────────────────────────────────────
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
  sand: "#FDF6EC", sandBorder: "#F0E4CC",
  shadow: "rgba(15,41,66,0.07)", shadowMd: "rgba(15,41,66,0.12)",
  inputBg: "#FFFFFF", inputFocus: "#FAFFFE",
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
  sand: "#1C2233", sandBorder: "#253047",
  shadow: "rgba(0,0,0,0.3)", shadowMd: "rgba(0,0,0,0.45)",
  inputBg: "#0D1520", inputFocus: "#111D2E",
  rowHover: "#1A2539",
  avatarBg: "linear-gradient(135deg,#083344 0%,#0C4A6E 100%)", avatarColor: "#22D3EE",
  theadBg: "#111C2C",
};

// ─── CONTEXT ──────────────────────────────────────────────────────────────────
const ThemeCtx = createContext({ C: LIGHT, dark: false, toggle: () => {} });
const useTheme = () => useContext(ThemeCtx);

// ─── GLOBALS ──────────────────────────────────────────────────────────────────
// Scoped page CSS. Injected into <head> via useEffect and REMOVED on unmount,
// so it never leaks into Login.jsx (or any other page) after logout.
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

// ─── BADGE ────────────────────────────────────────────────────────────────────
function Badge({ status }) {
  const { C } = useTheme();
  const MAP = {
    en_attente:      { label: "En attente",   fg: C.slate, bg: C.slateLight, dot: C.slate   },
    en_consultation: { label: "Consultation", fg: C.teal,  bg: C.tealLight,  dot: C.tealMid },
    en_paiement:     { label: "En caisse",    fg: C.amber, bg: C.amberLight, dot: C.amber   },
    termine:         { label: "Terminé",      fg: C.green, bg: C.greenLight, dot: C.green   },
  };
  const s = MAP[status] || { label: status, fg: C.slate, bg: C.slateLight, dot: C.slate };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, background: s.bg, color: s.fg, fontSize: 12, fontWeight: 700 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.dot, flexShrink: 0,
        animation: status === "en_consultation" ? "livePulse 1.6s ease-in-out infinite"
                 : status === "en_paiement"     ? "alertPulse 1.4s ease-in-out infinite"
                 : "none" }} />
      {s.label}
    </span>
  );
}

// ─── BUTTON ───────────────────────────────────────────────────────────────────
function Btn({ children, variant = "primary", size = "md", fullWidth, style: ex = {}, ...rest }) {
  const { C } = useTheme();
  const V = {
    primary: { background: C.teal,        color: "#fff", border: "none",                    boxShadow: `0 2px 8px ${C.shadow}` },
    success: { background: C.green,       color: "#fff", border: "none",                    boxShadow: `0 2px 8px ${C.shadow}` },
    amber:   { background: C.amber,       color: "#fff", border: "none",                    boxShadow: `0 2px 8px ${C.shadow}` },
    danger:  { background: C.red,         color: "#fff", border: "none",                    boxShadow: "none" },
    ghost:   { background: "transparent", color: C.text, border: `1.5px solid ${C.border}`, boxShadow: "none" },
    soft:    { background: C.tealLight,   color: C.teal, border: "none",                    boxShadow: "none" },
  };
  const S = {
    sm: { padding: "6px 14px",  fontSize: 12, borderRadius: 8  },
    md: { padding: "9px 20px",  fontSize: 13, borderRadius: 10 },
    lg: { padding: "12px 26px", fontSize: 14, borderRadius: 12 },
  };
  return (
    <button className="med-btn" style={{ ...V[variant], ...S[size], fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7, transition: "filter .15s, transform .12s", fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: "nowrap", width: fullWidth ? "100%" : undefined, justifyContent: fullWidth ? "center" : undefined, ...ex }} {...rest}>
      {children}
    </button>
  );
}

// ─── INPUT STYLE ──────────────────────────────────────────────────────────────
function useInputStyle(focused) {
  const { C } = useTheme();
  return { width: "100%", padding: "10px 14px", border: `1.5px solid ${focused ? C.teal : C.border}`, borderRadius: 10, fontSize: 13, color: C.text, background: focused ? C.inputFocus : C.inputBg, outline: "none", fontFamily: "'Plus Jakarta Sans', sans-serif", transition: "all .15s", boxShadow: focused ? `0 0 0 3px ${C.tealLight}` : "none" };
}

function FInput({ label, half, span2, ...props }) {
  const { C } = useTheme();
  const [f, setF] = useState(false);
  return (
    <div style={{ marginBottom: 14, gridColumn: span2 ? "1 / -1" : half ? "span 1" : undefined }}>
      {label && <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textSoft, marginBottom: 5, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</label>}
      <input style={useInputStyle(f)} onFocus={() => setF(true)} onBlur={() => setF(false)} {...props} />
    </div>
  );
}

function FSelect({ label, half, children, ...props }) {
  const { C } = useTheme();
  const [f, setF] = useState(false);
  return (
    <div style={{ marginBottom: 14, gridColumn: half ? "span 1" : undefined }}>
      {label && <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textSoft, marginBottom: 5, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</label>}
      <select style={{ ...useInputStyle(f), cursor: "pointer" }} onFocus={() => setF(true)} onBlur={() => setF(false)} {...props}>{children}</select>
    </div>
  );
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
function Modal({ title, subtitle, onClose, children }) {
  const { C } = useTheme();
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn .18s ease" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: 20, width: "min(580px,95vw)", border: `1px solid ${C.border}`, boxShadow: `0 24px 64px ${C.shadowMd}`, overflow: "hidden", animation: "fadeUp .2s ease" }}>
        <div style={{ padding: "20px 26px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: C.text }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: C.textSoft, marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} style={{ background: C.slateLight, border: "none", width: 30, height: 30, borderRadius: 8, cursor: "pointer", fontSize: 16, color: C.textSoft, display: "flex", alignItems: "center", justifyContent: "center" }}
            onMouseOver={e => e.currentTarget.style.background = C.border}
            onMouseOut={e => e.currentTarget.style.background = C.slateLight}>×</button>
        </div>
        <div style={{ padding: "24px 26px" }}>{children}</div>
      </div>
    </div>
  );
}

// ─── EDIT PATIENT MODAL ─────────────────────────────────────────────────────
// Lets reception fix a patient's info directly from the search results in
// the "Ajouter à la file" modal — e.g. a typo made when the dossier was
// first created. Same fields as the create form, prefilled from the row.
function EditPatientModal({ patient, onClose, onSaved }) {
  const { C } = useTheme();
  const [form, setForm] = useState({
    nom: patient.nom || "",
    prenom: patient.prenom || "",
    telephone: patient.telephone || "",
    date_naissance: patient.date_naissance ? String(patient.date_naissance).slice(0, 10) : "",
    sexe: patient.sexe || "homme",
    adresse: patient.adresse || "",
    maladies_chroniques: patient.maladies_chroniques || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const save = async () => {
    if (!form.nom || !form.prenom || !form.telephone) {
      setError("Nom, prénom et téléphone sont requis.");
      return;
    }
    setSaving(true); setError("");
    try {
      await axios.put(`${EDIT_API}/${patient.id}`, form, { headers: auth() });
      onSaved();
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || "Erreur lors de la modification.");
      setSaving(false);
    }
  };

  return (
    <Modal title="Modifier les informations" subtitle={`${patient.nom} ${patient.prenom} — dossier #${patient.id}`} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <FInput label="Nom de famille" half value={form.nom} onChange={e => set("nom", e.target.value)} />
        <FInput label="Prénom" half value={form.prenom} onChange={e => set("prenom", e.target.value)} />
        <FInput label="Téléphone" half value={form.telephone} onChange={e => set("telephone", e.target.value)} />
        <FInput label="Date de naissance" half type="date" value={form.date_naissance} onChange={e => set("date_naissance", e.target.value)} />
        <FSelect label="Sexe" half value={form.sexe} onChange={e => set("sexe", e.target.value)}>
          <option value="homme">Homme</option>
          <option value="femme">Femme</option>
        </FSelect>
        <FInput label="Adresse" half value={form.adresse} onChange={e => set("adresse", e.target.value)} />
        <div style={{ gridColumn: "1 / -1", marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textSoft, marginBottom: 5, letterSpacing: "0.06em", textTransform: "uppercase" }}>Antécédents médicaux</label>
          <textarea value={form.maladies_chroniques} onChange={e => set("maladies_chroniques", e.target.value)} rows={2}
            style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 13, color: C.text, background: C.inputBg, outline: "none", fontFamily: "'Plus Jakarta Sans', sans-serif", resize: "vertical", lineHeight: 1.5 }} />
        </div>
      </div>
      {error && <p style={{ color: C.red, fontSize: 12, marginBottom: 12, padding: "8px 12px", background: C.redLight, borderRadius: 8 }}>{error}</p>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <Btn variant="ghost" onClick={onClose}>Annuler</Btn>
        <Btn variant="primary" disabled={saving} onClick={save}>{saving ? "Enregistrement…" : "Enregistrer"}</Btn>
      </div>
    </Modal>
  );
}

// ─── ADD MODAL ────────────────────────────────────────────────────────────────
function AddModal({ onClose, onAdded }) {
  const { C } = useTheme();
  const [query, setQuery]         = useState("");
  const [results, setResults]     = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected]   = useState(null);
  const [urgent, setUrgent]       = useState(false);
  const [view, setView]           = useState("search");
  const [newPt, setNewPt]         = useState({ nom: "", prenom: "", telephone: "", date_naissance: "", sexe: "homme", adresse: "", maladies_chroniques: "" });
  const [adding, setAdding]       = useState(false);
  const [error, setError]         = useState("");
  const [sfocus, setSfocus]       = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const deb = useRef();

  const doSearch = async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try { const r = await axios.get(`${PAT_API}?q=${encodeURIComponent(q)}`, { headers: auth() }); setResults(r.data); }
    catch { setResults([]); }
    setSearching(false);
  };
  const handleQ = v => { setQuery(v); clearTimeout(deb.current); deb.current = setTimeout(() => doSearch(v), 350); };

  const addToQueue = async (id) => {
    setAdding(true); setError("");
    try { await axios.post(`${API}/ajouter`, { patient_id: id, urgent }, { headers: auth() }); onAdded(); onClose(); }
    catch (e) { setError(e.response?.data?.message || "Erreur lors de l'ajout."); setAdding(false); }
  };
  const createAndAdd = async () => {
    if (!newPt.nom || !newPt.prenom || !newPt.telephone) { setError("Nom, prénom et téléphone sont requis."); return; }
    setAdding(true); setError("");
    try { const r = await axios.post(AJOUT_API, newPt, { headers: auth() }); await addToQueue(r.data.id); }
    catch (e) { setError(e.response?.data?.message || "Erreur création."); setAdding(false); }
  };

  const UrgentBox = () => (
    <div onClick={() => setUrgent(u => !u)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12, cursor: "pointer", marginBottom: 20, background: urgent ? C.redLight : C.slateLight, border: `1.5px solid ${urgent ? C.red + "55" : C.border}`, transition: "all .15s" }}>
      <div style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, background: urgent ? C.red : "transparent", border: `2px solid ${urgent ? C.red : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }}>
        {urgent && <span style={{ color: "#fff", fontSize: 12, fontWeight: 900, lineHeight: 1 }}>✓</span>}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: urgent ? C.red : C.text }}>Cas urgent</div>
        <div style={{ fontSize: 11, color: C.textSoft, marginTop: 1 }}>Ce patient sera placé en tête de file d'attente</div>
      </div>
    </div>
  );

  return (
    <>
      <Modal title={view === "search" ? "Ajouter un patient" : "Nouveau dossier patient"} subtitle={view === "search" ? "Recherchez un dossier existant" : "Remplissez les informations du patient"} onClose={onClose}>
        {view === "search" ? (
          <>
            <div style={{ position: "relative", marginBottom: 16 }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: C.textSoft, fontSize: 15, pointerEvents: "none" }}>🔍</span>
              <input autoFocus placeholder="Rechercher par nom ou numéro de téléphone…" value={query} onChange={e => handleQ(e.target.value)}
                style={{ width: "100%", padding: "10px 14px 10px 40px", border: `1.5px solid ${sfocus ? C.teal : C.border}`, borderRadius: 10, fontSize: 13, color: C.text, background: sfocus ? C.inputFocus : C.inputBg, outline: "none", fontFamily: "'Plus Jakarta Sans', sans-serif", boxShadow: sfocus ? `0 0 0 3px ${C.tealLight}` : "none", transition: "all .15s" }}
                onFocus={() => setSfocus(true)} onBlur={() => setSfocus(false)} />
            </div>
            {searching && <p style={{ color: C.textSoft, fontSize: 13, textAlign: "center", marginBottom: 12 }}>Recherche en cours…</p>}
            {results.length > 0 && (
              <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                {results.map(p => (
                  <div key={p.id} onClick={() => setSelected(s => s?.id === p.id ? null : p)}
                    style={{ padding: "12px 16px", borderRadius: 12, cursor: "pointer", border: `1.5px solid ${selected?.id === p.id ? C.teal : C.border}`, background: selected?.id === p.id ? C.tealLight : C.surfaceAlt, display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all .15s" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: selected?.id === p.id ? C.teal : C.slateLight, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: selected?.id === p.id ? "#fff" : C.textSoft, transition: "all .15s" }}>{p.nom?.[0]}{p.prenom?.[0]}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{p.nom} {p.prenom}</div>
                        <div style={{ fontSize: 12, color: C.textSoft, marginTop: 2 }}>📞 {p.telephone} · {p.date_naissance}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingPatient(p); }}
                        title="Modifier les informations"
                        style={{ background: C.slateLight, border: "none", width: 30, height: 30, borderRadius: 8, cursor: "pointer", fontSize: 13, color: C.textSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background .12s" }}
                        onMouseOver={e => e.currentTarget.style.background = C.border}
                        onMouseOut={e => e.currentTarget.style.background = C.slateLight}
                      >
                        ✏️
                      </button>
                      {selected?.id === p.id && <span style={{ color: C.teal, fontSize: 18, fontWeight: 900 }}>✓</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {query && !searching && results.length === 0 && (
              <div style={{ textAlign: "center", padding: "28px 0 20px", borderRadius: 12, background: C.sand, border: `1px dashed ${C.sandBorder}`, marginBottom: 16 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🔎</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 4 }}>Aucun dossier trouvé</div>
                <div style={{ fontSize: 12, color: C.textSoft, marginBottom: 16 }}>Ce patient n'est pas encore enregistré</div>
                <Btn variant="soft" size="sm" onClick={() => setView("create")}>+ Créer un dossier</Btn>
              </div>
            )}
            {results.length > 0 && (
              <div style={{ textAlign: "right", marginBottom: 12 }}>
                <button onClick={() => setView("create")} style={{ background: "none", border: "none", color: C.teal, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>+ Créer un nouveau dossier</button>
              </div>
            )}
            <UrgentBox />
            {error && <p style={{ color: C.red, fontSize: 12, marginBottom: 12, padding: "8px 12px", background: C.redLight, borderRadius: 8 }}>{error}</p>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <Btn variant="ghost" onClick={onClose}>Annuler</Btn>
              <Btn variant="primary" disabled={!selected || adding} onClick={() => addToQueue(selected.id)}>{adding ? "Ajout en cours…" : "Ajouter à la file →"}</Btn>
            </div>
          </>
        ) : (
          <>
            <button onClick={() => setView("search")} style={{ background: "none", border: "none", color: C.teal, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", display: "flex", alignItems: "center", gap: 6, marginBottom: 20 }}>← Retour à la recherche</button>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
              <FInput label="Nom de famille" half placeholder="Ex: Benkacem" value={newPt.nom} onChange={e => setNewPt(p => ({ ...p, nom: e.target.value }))} />
              <FInput label="Prénom" half placeholder="Ex: Amira" value={newPt.prenom} onChange={e => setNewPt(p => ({ ...p, prenom: e.target.value }))} />
              <FInput label="Téléphone" half placeholder="0771234567" value={newPt.telephone} onChange={e => setNewPt(p => ({ ...p, telephone: e.target.value }))} />
              <FInput label="Date de naissance" half type="date" value={newPt.date_naissance} onChange={e => setNewPt(p => ({ ...p, date_naissance: e.target.value }))} />
              <FSelect label="Sexe" half value={newPt.sexe} onChange={e => setNewPt(p => ({ ...p, sexe: e.target.value }))}>
                <option value="homme">Homme</option>
                <option value="femme">Femme</option>
              </FSelect>
              <FInput label="Adresse" half placeholder="Rue, Wilaya" value={newPt.adresse} onChange={e => setNewPt(p => ({ ...p, adresse: e.target.value }))} />
              <div style={{ gridColumn: "1 / -1", marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textSoft, marginBottom: 5, letterSpacing: "0.06em", textTransform: "uppercase" }}>Antécédents médicaux</label>
                <textarea value={newPt.maladies_chroniques} onChange={e => setNewPt(p => ({ ...p, maladies_chroniques: e.target.value }))} rows={2} placeholder="Diabète, hypertension, allergies…" style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 13, color: C.text, background: C.inputBg, outline: "none", fontFamily: "'Plus Jakarta Sans', sans-serif", resize: "vertical", lineHeight: 1.5 }} />
              </div>
            </div>
            <UrgentBox />
            {error && <p style={{ color: C.red, fontSize: 12, marginBottom: 12, padding: "8px 12px", background: C.redLight, borderRadius: 8 }}>{error}</p>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <Btn variant="ghost" onClick={onClose}>Annuler</Btn>
              <Btn variant="success" disabled={adding} onClick={createAndAdd}>{adding ? "Création…" : "✓ Créer le dossier et ajouter"}</Btn>
            </div>
          </>
        )}
      </Modal>

      {editingPatient && (
        <EditPatientModal
          patient={editingPatient}
          onClose={() => setEditingPatient(null)}
          onSaved={() => doSearch(query)}
        />
      )}
    </>
  );
}

// ─── RDV PANEL ────────────────────────────────────────────────────────────────
function RdvPanel({ onCheckedIn }) {
  const { C } = useTheme();
  const [rdvs, setRdvs]                 = useState([]);
  const [loading, setLoading]           = useState(true);
  const [checkInError, setCheckInError] = useState(null);

  const fetchRdv = async () => {
    try { const r = await axios.get(`${RDV_API}/gettoday`, { headers: auth() }); setRdvs(r.data); }
    catch { setRdvs([]); }
    setLoading(false);
  };
  useEffect(() => { fetchRdv(); }, []);

  const checkIn = async (id) => {
    setCheckInError(null);
    try {
      await axios.post(`${RDV_API}/arrived/${id}`, {}, { headers: auth() });
      fetchRdv(); onCheckedIn();
    } catch (e) {
      setCheckInError({ id, message: e.response?.data?.message || "Erreur check-in" });
    }
  };

  const pending = rdvs.filter(r => r.statut === "planifie").length;

  return (
    <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: `0 2px 12px ${C.shadow}` }}>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: C.tealLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📅</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: C.text }}>Rendez-vous</div>
          <div style={{ fontSize: 11, color: C.textSoft }}>Aujourd'hui</div>
        </div>
        {pending > 0 && <span style={{ marginLeft: "auto", background: C.teal, color: "#fff", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>{pending} attendu{pending > 1 ? "s" : ""}</span>}
      </div>
      <div style={{ maxHeight: 300, overflowY: "auto" }}>
        {loading ? (
          <p style={{ padding: 24, color: C.textSoft, textAlign: "center", fontSize: 13 }}>Chargement…</p>
        ) : rdvs.length === 0 ? (
          <div style={{ padding: "32px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🗓️</div>
            <div style={{ fontSize: 13, color: C.textSoft }}>Aucun rendez-vous aujourd'hui</div>
          </div>
        ) : rdvs.map((r, i) => (
          <div key={r.id}>
            <div style={{ padding: "13px 20px", borderBottom: i < rdvs.length - 1 ? `1px solid ${C.border}` : "none", display: "flex", alignItems: "center", justifyContent: "space-between", opacity: r.statut !== "planifie" ? 0.45 : 1, transition: "background .12s" }}
              onMouseOver={e => e.currentTarget.style.background = C.rowHover}
              onMouseOut={e => e.currentTarget.style.background = "transparent"}>
              <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: r.statut === "planifie" ? C.tealLight : C.slateLight, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, color: r.statut === "planifie" ? C.teal : C.textSoft }}>{r.nom?.[0]}{r.prenom?.[0]}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{r.nom} {r.prenom}</div>
                  <div style={{ fontSize: 11, color: C.textSoft, marginTop: 2 }}>🕐 {new Date(r.date_rdv).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}{r.motif ? ` · ${r.motif}` : ""}</div>
                </div>
              </div>
              {r.statut === "planifie"
                ? <Btn variant="soft" size="sm" onClick={() => checkIn(r.id)}>✓ Arrivé</Btn>
                : <span style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>Enregistré ✓</span>}
            </div>
            {checkInError?.id === r.id && (
              <div style={{ margin: "0 16px 10px", padding: "8px 12px", background: C.redLight, border: `1px solid ${C.red}44`, borderRadius: 8, fontSize: 12, color: C.red }}>
                ⚠ {checkInError.message}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, lightColor }) {
  const { C } = useTheme();
  return (
    <div className="med-stat" style={{ background: C.surface, borderRadius: 16, padding: "18px 20px", boxShadow: `0 2px 12px ${C.shadow}`, border: `1px solid ${C.border}`, transition: "transform .2s, box-shadow .2s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: lightColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{icon}</div>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: value > 0 ? color : C.border, marginTop: 4 }} />
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, color: C.text, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: C.textSoft, fontWeight: 600 }}>{label}</div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function ReceptionDashboard() {
  useMedGlobals();

  const [dark, setDark]       = useState(() => localStorage.getItem("med-theme") === "dark");
  const [showAdd, setShowAdd] = useState(false);

  // Queue data, polling, sounds, and the payment alert modal are all owned by
  // QueueAlertProvider now (mounted in MainLayout) — this component just
  // reads the shared state so it survives navigating away and back.
  const { queue, fetchQueue, openPaymentModal } = useQueueAlert();

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

  const handleDelete = async (id) => {
    if (!window.confirm("Retirer ce patient de la file d'attente ?")) return;
    try {
      await axios.delete(`${API}/${id}`, { headers: auth() });
      fetchQueue();
    } catch (e) {
      console.error("Erreur suppression:", e);
    }
  };

  const stats = {
    attente:      queue.filter(p => p.statut === "en_attente").length,
    consultation: queue.filter(p => p.statut === "en_consultation").length,
    paiement:     queue.filter(p => p.statut === "en_paiement").length,
    termine:      queue.filter(p => p.statut === "termine").length,
  };

  const toggleDark = () => {
    setDark(d => {
      const next = !d;
      localStorage.setItem("med-theme", next ? "dark" : "light");
      window.dispatchEvent(new CustomEvent("med-theme-change", { detail: next }));
      return next;
    });
  };

  return (
    <ThemeCtx.Provider value={{ C, dark, toggle: toggleDark }}>
      <div style={{ display: "flex", minHeight: "100vh", background: C.bg, transition: "background .3s" }}>

        {/* SIDEBAR */}

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>

          {/* HEADER */}

          <main style={{ flex: 1, padding: "28px 24px", display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "start", overflowY: "auto" }}>

            {/* LEFT COLUMN */}
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

              {/* STATS */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
                <StatCard label="En attente"   value={stats.attente}      icon="⏳" color={C.slate} lightColor={C.slateLight} />
                <StatCard label="Consultation" value={stats.consultation}  icon="🩺" color={C.teal}  lightColor={C.tealLight}  />
                <StatCard label="En caisse"    value={stats.paiement}      icon="💳" color={C.amber} lightColor={C.amberLight} />
                <StatCard label="Terminés"     value={stats.termine}       icon="✅" color={C.green} lightColor={C.greenLight} />
              </div>

              {/* TABLE */}
              <div style={{ background: C.surface, borderRadius: 18, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: `0 2px 12px ${C.shadow}`, transition: "background .3s, border-color .3s" }}>
                <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>File d'attente</div>
                    <div style={{ fontSize: 11, color: C.textSoft, marginTop: 1 }}>
                      {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                    </div>
                  </div>
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ background: C.slateLight, color: C.textSoft, borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 700 }}>
                      {queue.length} patient{queue.length !== 1 ? "s" : ""}
                    </span>
                    <Btn variant="soft" size="sm" onClick={() => setShowAdd(true)}>+ Ajouter</Btn>
                  </div>
                </div>

                {queue.length === 0 ? (
                  <div style={{ padding: "60px 24px", textAlign: "center" }}>
                    <div style={{ fontSize: 44, marginBottom: 12 }}>🎉</div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: C.text, marginBottom: 6 }}>File d'attente vide</div>
                    <div style={{ fontSize: 13, color: C.textSoft, maxWidth: 280, margin: "0 auto" }}>
                      Aucun patient enregistré pour l'instant.
                    </div>
                  </div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: C.theadBg }}>
                        {["N°", "Patient", "Statut", "Urgence", "Actions"].map(h => (
                          <th key={h} style={{ padding: "11px 22px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.textSoft, letterSpacing: "0.07em", textTransform: "uppercase", borderBottom: `1px solid ${C.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {queue.map((p, i) => (
                        <tr key={p.id}
                          style={{ borderBottom: i < queue.length - 1 ? `1px solid ${C.borderSoft}` : "none", animation: `rowSlide .22s ease ${i * 0.04}s both`, transition: "background .12s", background: p.statut === "en_paiement" ? C.amberLight : "transparent" }}
                          onMouseOver={e => e.currentTarget.style.background = p.statut === "en_paiement" ? C.amberLight : C.rowHover}
                          onMouseOut={e => e.currentTarget.style.background = p.statut === "en_paiement" ? C.amberLight : "transparent"}>
                          <td style={{ padding: "15px 22px", width: 52 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 9, background: C.slateLight, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, color: C.textSoft }}>{p.ordre}</div>
                          </td>
                          <td style={{ padding: "15px 22px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                              <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: C.avatarBg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, color: C.avatarColor }}>{p.nom?.[0]}{p.prenom?.[0]}</div>
                              <div>
                                <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{p.nom} {p.prenom}</span>
                                {p.statut === "en_paiement" && p.montant_prevu && (
                                  <div style={{ fontSize: 11, color: C.amber, fontWeight: 700, marginTop: 2 }}>
                                    💊 {p.montant_prevu} دج · {p.mode_prevu === "cash" ? "Espèces" : "Carte Chifa"}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "15px 22px" }}><Badge status={p.statut} /></td>
                          <td style={{ padding: "15px 22px" }}>
                            {p.est_urgent
                              ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: C.redLight, color: C.red, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>⚠ URGENT</span>
                              : <span style={{ color: C.border, fontSize: 16 }}>—</span>}
                          </td>
                          <td style={{ padding: "15px 22px" }}>
                            {p.statut === "en_paiement" && (
                              <Btn variant="amber" size="sm" onClick={() => openPaymentModal(p)}>
                                💳 Encaisser
                              </Btn>
                            )}
                            {p.statut === "termine" && (
                              <span style={{ fontSize: 13, color: C.green, fontWeight: 700 }}>✓ Payé</span>
                            )}
                            {(p.statut === "en_attente" || p.statut === "en_consultation") && (
                              <span style={{ color: C.border }}>—</span>
                            )}
                             {(p.statut === "en_attente") && (
      <Btn
        variant="danger"
        size="sm"
        onClick={() => handleDelete(p.id)}
        style={{ padding: "6px 10px" }}
      >
        🗑
      </Btn>
    )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <RdvPanel onCheckedIn={fetchQueue} />

              {/* CTA card */}
              <div style={{ borderRadius: 16, padding: 22, overflow: "hidden", position: "relative", background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyCard} 100%)`, boxShadow: `0 8px 24px ${C.shadowMd}` }}>
                <div style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
                <div style={{ position: "relative" }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>👤</div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "#fff", marginBottom: 6 }}>Nouveau patient</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 20, lineHeight: 1.6 }}>Recherchez un dossier existant ou créez-en un nouveau.</div>
                  <button onClick={() => setShowAdd(true)} style={{ width: "100%", padding: "11px 0", background: "#fff", color: C.navy, border: "none", borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", transition: "opacity .15s" }}
                    onMouseOver={e => e.currentTarget.style.opacity = "0.9"}
                    onMouseOut={e => e.currentTarget.style.opacity = "1"}>+ Ajouter à la file</button>
                </div>
              </div>

              {/* Live note */}
              <div style={{ padding: "10px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.teal, animation: "livePulse 1.6s ease-in-out infinite", flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: C.textSoft }}>Actualisation automatique toutes les <strong style={{ color: C.text }}>3 secondes</strong></span>
              </div>
            </div>

          </main>
        </div>
      </div>

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onAdded={fetchQueue} />}

    </ThemeCtx.Provider>
  );
}