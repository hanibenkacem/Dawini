import { useEffect, useState, useRef, createContext, useContext } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { API_BASE } from '../../config/api';

const API_BASEE       = window.electronAPI?.apiBaseUrl || `${API_BASE}`;
const RDV_API         = `${API_BASEE}/rendez-vous`;
const PAT_SEARCH_API  = `${API_BASEE}/file-attente/patient-search`;
const PAT_CREATE_API  = `${API_BASEE}/patient/add`;
const DOCTORS_API     = `${API_BASEE}/me/doctors`;

const token       = () => localStorage.getItem("token");
const auth        = () => ({ Authorization: `Bearer ${token()}` });
const currentUser = () => { try { return jwtDecode(token()); } catch { return {}; } };

const ThemeCtx = createContext({ C: null, dark: false, toggle: () => {} });
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
function Btn({ children, variant = "primary", size = "md", fullWidth, style: ex = {}, ...rest }) {
  const { C } = useTheme();
  const V = {
    primary: { background: C.teal,        color: "#fff", border: "none",                    boxShadow: `0 2px 8px ${C.shadow}` },
    success: { background: C.green,       color: "#fff", border: "none",                    boxShadow: `0 2px 8px ${C.shadow}` },
    danger:  { background: C.red,         color: "#fff", border: "none",                    boxShadow: "none" },
    ghost:   { background: "transparent", color: C.text, border: `1.5px solid ${C.border}`, boxShadow: "none" },
    soft:    { background: C.tealLight,   color: C.teal, border: "none",                    boxShadow: "none" },
  };
  const S = {
    sm: { padding: "6px 14px",  fontSize: 12, borderRadius: 8  },
    md: { padding: "9px 20px",  fontSize: 13, borderRadius: 10 },
  };
  return (
    <button className="med-btn" style={{ ...V[variant], ...S[size], fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7, transition: "filter .15s, transform .12s", fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: "nowrap", width: fullWidth ? "100%" : undefined, justifyContent: fullWidth ? "center" : undefined, ...ex }} {...rest}>
      {children}
    </button>
  );
}

function Badge({ status }) {
  const { C } = useTheme();
  const MAP = {
    planifie:      { label: "Planifié",       fg: C.teal,  bg: C.tealLight,  dot: C.tealMid },
    arrive:        { label: "Arrivé",         fg: C.amber, bg: C.amberLight, dot: C.amber   },
    non_presente:  { label: "Non présenté",   fg: C.red,   bg: C.redLight,   dot: C.red     },
    termine:       { label: "Terminé",        fg: C.green, bg: C.greenLight, dot: C.green   },
    annule:        { label: "Annulé",         fg: C.red,   bg: C.redLight,   dot: C.red     },
  };
  const s = MAP[status] || { label: status, fg: C.slate, bg: C.slateLight, dot: C.slate };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, background: s.bg, color: s.fg, fontSize: 12, fontWeight: 700 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

function FInput({ label, half, span2, ...props }) {
  const { C } = useTheme();
  const [f, setF] = useState(false);
  return (
    <div style={{ marginBottom: 14, gridColumn: span2 ? "1 / -1" : undefined }}>
      {label && <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textSoft, marginBottom: 5, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</label>}
      <input
        style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${f ? C.teal : C.border}`, borderRadius: 10, fontSize: 13, color: C.text, background: f ? C.inputFocus : C.inputBg, outline: "none", fontFamily: "'Plus Jakarta Sans', sans-serif", transition: "all .15s", boxShadow: f ? `0 0 0 3px ${C.tealLight}` : "none", boxSizing: "border-box" }}
        onFocus={() => setF(true)}
        onBlur={() => setF(false)}
        {...props}
      />
    </div>
  );
}

function FSelect({ label, children, ...props }) {
  const { C } = useTheme();
  const [f, setF] = useState(false);
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textSoft, marginBottom: 5, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</label>}
      <select
        style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${f ? C.teal : C.border}`, borderRadius: 10, fontSize: 13, color: C.text, background: f ? C.inputFocus : C.inputBg, outline: "none", fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: "pointer", transition: "all .15s", boxShadow: f ? `0 0 0 3px ${C.tealLight}` : "none", boxSizing: "border-box" }}
        onFocus={() => setF(true)}
        onBlur={() => setF(false)}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

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
          <button onClick={onClose}
            style={{ background: C.slateLight, border: "none", width: 30, height: 30, borderRadius: 8, cursor: "pointer", fontSize: 16, color: C.textSoft, display: "flex", alignItems: "center", justifyContent: "center" }}
            onMouseOver={e => e.currentTarget.style.background = C.border}
            onMouseOut={e => e.currentTarget.style.background = C.slateLight}>×</button>
        </div>
        <div style={{ padding: "24px 26px" }}>{children}</div>
      </div>
    </div>
  );
}

// ─── CREATE APPOINTMENT MODAL ─────────────────────────────────────────────────
// Steps: "search" → "create" (new patient form) → "details" (RDV form)
function CreateAppointmentModal({ onClose, onCreated }) {
  const { C } = useTheme();

  const user     = currentUser();
  const isDoctor = user?.role === "medecin";

  // step: "search" | "create" | "details"
  const [step, setStep]                       = useState("search");
  const [query, setQuery]                     = useState("");
  const [results, setResults]                 = useState([]);
  const [searching, setSearching]             = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [doctors, setDoctors]                 = useState([]);
  const [loadingDoctors, setLoadingDoctors]   = useState(false);
  const [form, setForm]                       = useState({ date_rdv: "", motif: "", id_medecin: "" });
  const [submitting, setSubmitting]           = useState(false);
  const [error, setError]                     = useState("");

  // New patient form state
  const [newPt, setNewPt] = useState({
    nom: "", prenom: "", telephone: "", date_naissance: "",
    sexe: "homme", adresse: "", maladies_chroniques: "",
  });
  const [creating, setCreating] = useState(false);

  const debRef = useRef();

  const minDateTime = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString().slice(0, 16);

  useEffect(() => {
    if (!isDoctor) {
      setLoadingDoctors(true);
      axios.get(DOCTORS_API, { headers: auth() })
        .then(res => setDoctors(Array.isArray(res.data) ? res.data : []))
        .catch(() => setDoctors([]))
        .finally(() => setLoadingDoctors(false));
    }
  }, [isDoctor]);

  const doSearch = async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await axios.get(`${PAT_SEARCH_API}?q=${encodeURIComponent(q)}`, { headers: auth() });
      setResults(res.data);
    } catch { setResults([]); }
    setSearching(false);
  };

  const handleQuery = val => {
    setQuery(val);
    clearTimeout(debRef.current);
    debRef.current = setTimeout(() => doSearch(val), 350);
  };

  // Create new patient then go straight to RDV details
  const handleCreatePatient = async () => {
    if (!newPt.nom || !newPt.prenom || !newPt.telephone) {
      setError("Nom, prénom et téléphone sont requis.");
      return;
    }
    setCreating(true); setError("");
    try {
      const res = await axios.post(PAT_CREATE_API, newPt, { headers: auth() });
      // res.data should contain the new patient's id
      setSelectedPatient({ ...newPt, id: res.data.id });
      setStep("details");
    } catch (e) {
      setError(e.response?.data?.message || "Erreur lors de la création du dossier.");
    } finally {
      setCreating(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedPatient) return;
    if (!form.date_rdv) { setError("La date et l'heure sont requises."); return; }
    if (!isDoctor && !form.id_medecin) { setError("Veuillez sélectionner un médecin."); return; }

    setSubmitting(true); setError("");
    try {
      const body = {
        patient_id: selectedPatient.id,
        date_rdv:   new Date(form.date_rdv).toISOString(),
        motif:      form.motif,
      };
      if (!isDoctor) body.id_medecin = Number(form.id_medecin);
      await axios.post(`${RDV_API}/add`, body, { headers: auth() });
      onCreated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de la création.");
    } finally {
      setSubmitting(false);
    }
  };

  const goBackToSearch = () => { setStep("search"); setSelectedPatient(null); setError(""); };

  // ── STEP: search ──────────────────────────────────────────────────────────
  if (step === "search") {
    return (
      <Modal title="Nouveau rendez-vous" subtitle="Recherchez le patient" onClose={onClose}>
        <div style={{ position: "relative", marginBottom: 16 }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: C.textSoft, fontSize: 15, pointerEvents: "none" }}>🔍</span>
          <input
            autoFocus
            placeholder="Rechercher par nom ou téléphone..."
            value={query}
            onChange={e => handleQuery(e.target.value)}
            style={{ width: "100%", padding: "10px 14px 10px 40px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 13, color: C.text, background: C.inputBg, outline: "none", fontFamily: "'Plus Jakarta Sans', sans-serif", boxSizing: "border-box" }}
          />
        </div>

        {searching && <p style={{ color: C.textSoft, fontSize: 13, textAlign: "center", marginBottom: 12 }}>Recherche...</p>}

        {results.length > 0 && (
          <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {results.map(p => (
              <div key={p.id} onClick={() => { setSelectedPatient(p); setStep("details"); }}
                style={{ padding: "12px 16px", borderRadius: 12, cursor: "pointer", border: `1.5px solid ${C.border}`, background: C.surfaceAlt, display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all .15s" }}
                onMouseOver={e => { e.currentTarget.style.borderColor = C.teal; e.currentTarget.style.background = C.tealLight; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.surfaceAlt; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: C.slateLight, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: C.textSoft }}>
                    {p.nom?.[0]}{p.prenom?.[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{p.nom} {p.prenom}</div>
                    <div style={{ fontSize: 12, color: C.textSoft }}>📞 {p.telephone}</div>
                  </div>
                </div>
                <span style={{ color: C.teal, fontSize: 18 }}>→</span>
              </div>
            ))}
            {/* Allow creating even when results exist */}
            <button onClick={() => { setError(""); setStep("create"); }}
              style={{ background: "none", border: "none", color: C.teal, cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif", textAlign: "right", padding: "4px 0" }}>
              + Créer un nouveau dossier
            </button>
          </div>
        )}

        {/* No results state — prominent create button */}
        {query && !searching && results.length === 0 && (
          <div style={{ textAlign: "center", padding: "28px 20px", background: C.sand, borderRadius: 12, marginBottom: 16, border: `1px dashed ${C.sandBorder}` }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🔎</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 4 }}>Aucun patient trouvé</div>
            <div style={{ fontSize: 12, color: C.textSoft, marginBottom: 16 }}>Ce patient n'est pas encore enregistré dans le système</div>
            <Btn variant="soft" size="sm" onClick={() => { setError(""); setStep("create"); }}>
              + Créer un nouveau dossier patient
            </Btn>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <Btn variant="ghost" onClick={onClose}>Annuler</Btn>
        </div>
      </Modal>
    );
  }

  // ── STEP: create new patient ───────────────────────────────────────────────
  if (step === "create") {
    return (
      <Modal title="Nouveau dossier patient" subtitle="Créez le dossier puis planifiez le rendez-vous" onClose={onClose}>
        <button onClick={goBackToSearch}
          style={{ background: "none", border: "none", color: C.teal, cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif", display: "flex", alignItems: "center", gap: 6, marginBottom: 20 }}>
          ← Retour à la recherche
        </button>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <FInput label="Nom de famille" placeholder="Ex: Benkacem" value={newPt.nom}
            onChange={e => setNewPt(p => ({ ...p, nom: e.target.value }))} />
          <FInput label="Prénom" placeholder="Ex: Amira" value={newPt.prenom}
            onChange={e => setNewPt(p => ({ ...p, prenom: e.target.value }))} />
          <FInput label="Téléphone" placeholder="0771234567" value={newPt.telephone}
            onChange={e => setNewPt(p => ({ ...p, telephone: e.target.value }))} />
          <FInput label="Date de naissance" type="date" value={newPt.date_naissance}
            onChange={e => setNewPt(p => ({ ...p, date_naissance: e.target.value }))} />
          <FSelect label="Sexe" value={newPt.sexe}
            onChange={e => setNewPt(p => ({ ...p, sexe: e.target.value }))}>
            <option value="homme">Homme</option>
            <option value="femme">Femme</option>
          </FSelect>
          <FInput label="Adresse" placeholder="Rue, Wilaya" value={newPt.adresse}
            onChange={e => setNewPt(p => ({ ...p, adresse: e.target.value }))} />
          <div style={{ gridColumn: "1 / -1", marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textSoft, marginBottom: 5, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Antécédents médicaux
            </label>
            <textarea value={newPt.maladies_chroniques}
              onChange={e => setNewPt(p => ({ ...p, maladies_chroniques: e.target.value }))}
              rows={2} placeholder="Diabète, hypertension, allergies…"
              style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 13, color: C.text, background: C.inputBg, outline: "none", fontFamily: "'Plus Jakarta Sans', sans-serif", resize: "vertical", lineHeight: 1.5, boxSizing: "border-box" }} />
          </div>
        </div>

        {error && (
          <div style={{ color: C.red, fontSize: 12, marginBottom: 14, padding: "8px 12px", background: C.redLight, borderRadius: 8 }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="ghost" onClick={goBackToSearch}>Retour</Btn>
          <Btn variant="success" disabled={creating} onClick={handleCreatePatient}>
            {creating ? "Création..." : "✓ Créer le dossier →"}
          </Btn>
        </div>
      </Modal>
    );
  }

  // ── STEP: details (RDV form) ───────────────────────────────────────────────
  return (
    <Modal title="Nouveau rendez-vous" subtitle="Définissez les détails" onClose={onClose}>
      <div style={{ marginBottom: 20, padding: "10px 14px", background: C.slateLight, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: C.tealLight, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, color: C.teal }}>
            {selectedPatient?.nom?.[0]}{selectedPatient?.prenom?.[0]}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{selectedPatient?.nom} {selectedPatient?.prenom}</div>
            <div style={{ fontSize: 11, color: C.textSoft }}>{selectedPatient?.telephone}</div>
          </div>
        </div>
        <button onClick={goBackToSearch} style={{ background: "none", border: "none", color: C.teal, cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Changer
        </button>
      </div>

      {!isDoctor && (
        <FSelect label="Médecin" value={form.id_medecin}
          onChange={e => setForm({ ...form, id_medecin: e.target.value })}>
          <option value="">{loadingDoctors ? "Chargement des médecins..." : "— Sélectionner un médecin —"}</option>
          {doctors.map(d => (
            <option key={d.id} value={d.id}>Dr. {d.prenom} {d.nom}</option>
          ))}
        </FSelect>
      )}

      <FInput label="Date et heure" type="datetime-local" min={minDateTime}
        value={form.date_rdv} onChange={e => setForm({ ...form, date_rdv: e.target.value })} />

      <FInput label="Motif (optionnel)" placeholder="Consultation, suivi, urgence..."
        value={form.motif} onChange={e => setForm({ ...form, motif: e.target.value })} />

      {isDoctor && (
        <div style={{ marginBottom: 14, padding: "10px 14px", background: C.tealLight, borderRadius: 10, display: "flex", alignItems: "center", gap: 8, border: `1px solid ${C.tealMid}` }}>
          <span style={{ fontSize: 15 }}>🩺</span>
          <span style={{ fontSize: 13, color: C.teal, fontWeight: 600 }}>
            Assigné à vous — Dr. {user?.prenom || ""} {user?.nom || ""}
          </span>
        </div>
      )}

      {error && (
        <div style={{ color: C.red, fontSize: 12, marginBottom: 14, padding: "8px 12px", background: C.redLight, borderRadius: 8 }}>
          ⚠ {error}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <Btn variant="ghost" onClick={goBackToSearch}>Retour</Btn>
        <Btn variant="primary" disabled={submitting} onClick={handleCreate}>
          {submitting ? "Création..." : "Planifier →"}
        </Btn>
      </div>
    </Modal>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function RendezvousPage() {
  useMedGlobals();
  const [dark, setDark]                       = useState(() => localStorage.getItem("med-theme") === "dark");
  const [appointments, setAppointments]       = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [filter, setFilter]                   = useState("upcoming");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoading, setActionLoading]     = useState(false);

  const [pastOffset, setPastOffset]   = useState(0);
  const [pastHasMore, setPastHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const knownIdsRef = useRef(new Set());
  const [newIds, setNewIds] = useState(new Set());

  const C = dark ? DARK : LIGHT;

  useEffect(() => {
    document.body.style.background = C.bg;
    document.body.style.transition = "background .3s";
  }, [dark, C.bg]);

  useEffect(() => {
    const handler = e => setDark(e.detail);
    window.addEventListener("med-theme-change", handler);
    return () => window.removeEventListener("med-theme-change", handler);
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("med-theme", next ? "dark" : "light");
    window.dispatchEvent(new CustomEvent("med-theme-change", { detail: next }));
  };

  const markNew = (rows) => {
    const fresh = new Set(rows.filter(r => !knownIdsRef.current.has(r.id)).map(r => r.id));
    rows.forEach(r => knownIdsRef.current.add(r.id));
    setNewIds(fresh);
  };

  const fetchUpcoming = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res  = await axios.get(`${RDV_API}/upcoming`, { headers: auth() });
      const rows = Array.isArray(res.data) ? res.data : [];
      markNew(rows);
      setAppointments(rows);
    } catch (err) {
      console.error("Failed to fetch appointments", err);
      if (!silent) setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPast = async (offset = 0, append = false) => {
    append ? setLoadingMore(true) : setLoading(true);
    try {
      const res = await axios.get(`${RDV_API}/past?limit=20&offset=${offset}`, { headers: auth() });
      const { rows, hasMore } = res.data;
      markNew(rows);
      setAppointments(prev => append ? [...prev, ...rows] : rows);
      setPastOffset(offset + rows.length);
      setPastHasMore(hasMore);
    } catch (err) {
      console.error("Failed to fetch past appointments", err);
      if (!append) setAppointments([]);
    } finally {
      append ? setLoadingMore(false) : setLoading(false);
    }
  };

  const refresh = () => filter === "upcoming" ? fetchUpcoming() : fetchPast(0, false);

  useEffect(() => {
    knownIdsRef.current = new Set();
    if (filter === "upcoming") {
      fetchUpcoming();
      const interval = setInterval(() => fetchUpcoming(true), 15000);
      return () => clearInterval(interval);
    } else {
      setPastOffset(0);
      fetchPast(0, false);
    }
  }, [filter]);

  const isToday = (dateStr) => new Date(dateStr).toDateString() === new Date().toDateString();

  const cancelAppointment = async (id) => {
    if (!window.confirm("Annuler ce rendez-vous ?")) return;
    setActionLoading(true);
    try {
      await axios.delete(`${RDV_API}/${id}`, { headers: auth() });
      refresh();
    } catch (err) {
      alert(err.response?.data?.message || "Erreur lors de l'annulation");
    } finally { setActionLoading(false); }
  };

  const checkInAppointment = async (id) => {
    setActionLoading(true);
    try {
      await axios.post(`${RDV_API}/arrived/${id}`, {}, { headers: auth() });
      refresh();
    } catch (err) {
      alert(err.response?.data?.message || "Erreur lors de l'enregistrement");
    } finally { setActionLoading(false); }
  };

  return (
    <ThemeCtx.Provider value={{ C, dark, toggle: toggleDark }}>
      <div style={{ display: "flex", minHeight: "100vh", background: C.bg, transition: "background .3s" }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <main style={{ flex: 1, padding: "28px 24px", overflowY: "auto" }}>
            <div style={{ maxWidth: 1400, margin: "0 auto" }}>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
                <div>
                  <h1 style={{ fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: "-0.3px" }}>Rendez-vous</h1>
                  <p style={{ fontSize: 13, color: C.textSoft, marginTop: 4 }}>Gérez les consultations planifiées</p>
                </div>
                <Btn variant="primary" onClick={() => setShowCreateModal(true)}>+ Nouveau rendez-vous</Btn>
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: `1px solid ${C.border}`, paddingBottom: 12 }}>
                {[{ key: "upcoming", label: "À venir" }, { key: "past", label: "Passés / Annulés" }].map(tab => (
                  <button key={tab.key} onClick={() => setFilter(tab.key)}
                    style={{ background: "none", border: "none", padding: "8px 20px", fontSize: 14, fontWeight: filter === tab.key ? 800 : 600, color: filter === tab.key ? C.teal : C.textSoft, borderBottom: filter === tab.key ? `2px solid ${C.teal}` : "2px solid transparent", cursor: "pointer", transition: "all .15s", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {loading ? (
                <div style={{ textAlign: "center", padding: 48, color: C.textSoft }}>Chargement des rendez-vous...</div>
              ) : appointments.length === 0 ? (
                <div style={{ textAlign: "center", padding: 64, background: C.surface, borderRadius: 20, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 44, marginBottom: 12 }}>📅</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Aucun rendez-vous</div>
                  <div style={{ fontSize: 13, color: C.textSoft, marginTop: 6 }}>Cliquez sur "Nouveau rendez-vous" pour en créer un.</div>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {appointments.map((apt, idx) => (
                      <div key={apt.id}
                        style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, animation: newIds.has(apt.id) ? `rowSlide .22s ease ${idx * 0.03}s both` : "none" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 16, flex: "2 1 240px" }}>
                          <div style={{ width: 48, height: 48, borderRadius: 14, background: C.avatarBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: C.avatarColor }}>
                            {apt.nom?.[0]}{apt.prenom?.[0]}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>{apt.nom} {apt.prenom}</div>
                            <div style={{ fontSize: 12, color: C.textSoft, marginTop: 4, display: "flex", gap: 12, flexWrap: "wrap" }}>
                              <span>🕐 {new Date(apt.date_rdv).toLocaleString("fr-FR")}</span>
                              {apt.motif && <span>📋 {apt.motif}</span>}
                              {apt.medecin_nom && <span>🩺 Dr. {apt.medecin_prenom} {apt.medecin_nom}</span>}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                          <Badge status={apt.statut} />
                          {apt.statut === "planifie" && isToday(apt.date_rdv) && (
                            <Btn variant="success" size="sm" onClick={() => checkInAppointment(apt.id)} disabled={actionLoading}>Marquer arrivé</Btn>
                          )}
                          {apt.statut === "planifie" && (
                            <Btn variant="danger" size="sm" onClick={() => cancelAppointment(apt.id)} disabled={actionLoading}>Annuler</Btn>
                          )}
                          {apt.statut === "arrive"       && <span style={{ fontSize: 12, color: C.amber, fontWeight: 600 }}>En attente de consultation</span>}
                          {apt.statut === "termine"      && <span style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>✓ Consulté</span>}
                          {apt.statut === "annule"       && <span style={{ fontSize: 12, color: C.red,   fontWeight: 600 }}>Annulé manuellement</span>}
                          {apt.statut === "non_presente" && <span style={{ fontSize: 12, color: C.red,   fontWeight: 600 }}>Absent — annulé automatiquement</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  {filter === "past" && pastHasMore && (
                    <div style={{ textAlign: "center", marginTop: 16 }}>
                      <Btn variant="ghost" onClick={() => fetchPast(pastOffset, true)} disabled={loadingMore}>
                        {loadingMore ? "Chargement..." : "Charger plus"}
                      </Btn>
                    </div>
                  )}
                </>
              )}
            </div>
          </main>
        </div>
      </div>

      {showCreateModal && (
        <CreateAppointmentModal
          onClose={() => setShowCreateModal(false)}
          onCreated={refresh}
        />
      )}
    </ThemeCtx.Provider>
  );
}

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