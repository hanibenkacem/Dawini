// pages/PatientDossier.jsx
import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { API_BASE } from '../config/api';
import axios from "axios";
import OrdonnanceModal from "../components/OrdonnanceModal";
import ConsultationForm from "../components/ConsultationForm";

const BASE = `${API_BASE}`;
const tkn  = () => localStorage.getItem("token");
const hdr  = () => ({ Authorization: `Bearer ${tkn()}` });

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display:ital@0;1&display=swap');

  .dossier-root {
    --teal:    #0d9488; --teal-lt: #f0fdfa; --teal-md: #99f6e4; --teal-dk: #0f766e;
    --navy:    #0f172a; --slate:   #475569;  --mist:    #f8fafc; --line:    #e2e8f0;
    --red:     #f43f5e; --amber:   #f59e0b;  --green:   #10b981; --white:   #ffffff;
    font-family: 'DM Sans', sans-serif;
  }
  .med-field { display:flex; flex-direction:column; gap:4px; }
  .med-label { font-size:10px; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; color:var(--teal-dk); }
  .med-input {
    background:var(--teal-lt); border:1.5px solid var(--teal-md); border-radius:8px;
    padding:9px 14px; font-size:14px; font-weight:500; color:var(--navy);
    cursor:default; outline:none; font-family:'DM Sans',sans-serif;
    width:100%; box-sizing:border-box; transition:border-color 0.15s;
  }
  .med-input:focus { border-color:var(--teal); }
  .med-input.empty { color:var(--slate); font-style:italic; font-weight:400; }
  .ecg-bar { height:36px; width:100%; overflow:hidden; opacity:0.18; }
  @keyframes pulse-ring {
    0%   { transform:scale(1); opacity:0.6; }
    100% { transform:scale(2.2); opacity:0; }
  }
  .pulse-dot { position:relative; width:10px; height:10px; border-radius:50%; background:var(--green); display:inline-block; }
  .pulse-dot::after { content:''; position:absolute; inset:0; border-radius:50%; background:var(--green); animation:pulse-ring 1.6s ease-out infinite; }
  .tab-btn { padding:10px 20px; font-size:13px; font-weight:500; border:none; background:transparent; cursor:pointer; color:var(--slate); border-bottom:2.5px solid transparent; transition:all 0.15s; font-family:'DM Sans',sans-serif; }
  .tab-btn.active { color:var(--teal-dk); border-bottom-color:var(--teal); background:var(--white); }
  .tab-btn:hover:not(.active) { color:var(--navy); background:var(--mist); }
  .timeline-item { position:relative; padding-left:28px; padding-bottom:24px; }
  .timeline-item::before { content:''; position:absolute; left:7px; top:22px; width:2px; height:calc(100% - 12px); background:var(--line); }
  .timeline-item:last-child::before { display:none; }
  .timeline-dot { position:absolute; left:0; top:4px; width:16px; height:16px; border-radius:50%; background:var(--white); border:2.5px solid var(--teal); display:flex; align-items:center; justify-content:center; }
  .timeline-dot-inner { width:6px; height:6px; border-radius:50%; background:var(--teal); }
  .timeline-dot.active-dot { border-color:var(--green); animation:pulse-ring 1.6s ease-out infinite; background:var(--green); }
  .med-card { background:var(--white); border:1.5px solid var(--line); border-radius:16px; overflow:hidden; }
  .med-card-header { padding:14px 20px; background:linear-gradient(135deg,#f0fdfa 0%,#f8fafc 100%); border-bottom:1.5px solid var(--line); display:flex; align-items:center; gap:10px; }
  .med-card-header-icon { width:32px; height:32px; border-radius:8px; background:var(--teal); display:flex; align-items:center; justify-content:center; font-size:15px; flex-shrink:0; }
  .med-card-body { padding:20px; }
  .patient-avatar { width:64px; height:64px; border-radius:50%; background:linear-gradient(135deg,var(--teal) 0%,var(--teal-dk) 100%); display:flex; align-items:center; justify-content:center; font-size:22px; font-weight:600; color:white; font-family:'DM Serif Display',serif; flex-shrink:0; letter-spacing:1px; box-shadow:0 4px 12px rgba(13,148,136,0.3); }
  .ordo-badge { background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:10px 14px; margin-top:10px; }
  @keyframes bannerPulse { 0%,100% { opacity:1; } 50% { opacity:0.85; } }
  .active-consult-banner { display:flex; align-items:center; gap:12px; background:linear-gradient(135deg,#0f766e,#0d9488); border-radius:12px; padding:14px 20px; animation:bannerPulse 2.5s ease-in-out infinite; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes spin { to { transform:rotate(360deg); } }
  .spinner { width:36px; height:36px; border:3px solid var(--teal-md); border-top-color:var(--teal); border-radius:50%; animation:spin 0.7s linear infinite; }
  .doc-thumb { display:flex; flex-direction:column; width:80px; border-radius:8px; overflow:hidden; border:1px solid #e5e7eb; background:#f9fafb; text-decoration:none; cursor:pointer; transition:box-shadow 0.15s, transform 0.15s; }
  .doc-thumb:hover { box-shadow:0 4px 12px rgba(0,0,0,0.12); transform:translateY(-2px); }

  /* Payment modal */
  .pay-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.55); backdrop-filter:blur(8px); z-index:200; display:flex; align-items:center; justify-content:center; padding:1rem; animation:fadeUp .18s ease; }
  .pay-modal { background:white; border-radius:20px; width:min(480px,95vw); overflow:hidden; box-shadow:0 24px 64px rgba(0,0,0,0.25); animation:fadeUp .2s ease; }
  .pay-modal-header { background:linear-gradient(135deg,#0f172a 0%,#134e4a 100%); padding:24px 28px 20px; }
  .pay-input { width:100%; border:1.5px solid #e2e8f0; border-radius:10px; padding:11px 14px; font-size:14px; outline:none; box-sizing:border-box; font-family:'DM Sans',sans-serif; transition:border-color .15s, box-shadow .15s; }
  .pay-input:focus { border-color:#0d9488; box-shadow:0 0 0 3px #ccfbf1; }
  .pay-btn { display:flex; align-items:center; justify-content:center; gap:8px; padding:13px 20px; border-radius:12px; border:none; font-size:14px; font-weight:700; cursor:pointer; transition:all .15s; font-family:'DM Sans',sans-serif; width:100%; }
  .pay-btn:disabled { opacity:0.5; cursor:not-allowed; }
  .pay-btn-reception { background:#f0fdf4; color:#166534; border:2px solid #86efac; }
  .pay-btn-reception:hover:not(:disabled) { background:#dcfce7; border-color:#4ade80; }
  .pay-btn-direct { background:linear-gradient(135deg,#0d9488,#0f766e); color:white; }
  .pay-btn-direct:hover:not(:disabled) { filter:brightness(1.08); transform:translateY(-1px); box-shadow:0 4px 16px rgba(13,148,136,0.4); }
  .pay-mode-chip { padding:8px 14px; border-radius:8px; border:1.5px solid #e2e8f0; background:white; font-size:13px; font-weight:500; cursor:pointer; transition:all .12s; font-family:'DM Sans',sans-serif; }
  .pay-mode-chip.active { border-color:#0d9488; background:#f0fdfa; color:#0f766e; font-weight:700; }
  .pay-success { display:flex; flex-direction:column; align-items:center; gap:12px; padding:40px 28px; text-align:center; }

  /* Lightbox */
  .lightbox-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.88); z-index:500; display:flex; align-items:center; justify-content:center; cursor:zoom-out; animation:fadeUp .15s ease; }

  /* dark mode */
  .dossier-root.dark { --teal:#22d3ee; --teal-lt:#083344; --teal-md:#164e63; --teal-dk:#67e8f9; --navy:#e2eaf4; --slate:#7b93b8; --mist:#0d1520; --line:#253047; --white:#141e2e; --green:#34d399; }
  .dossier-root.dark .med-card { background:#141e2e; border-color:#253047; }
  .dossier-root.dark .med-card-header { background:linear-gradient(135deg,#0d2535 0%,#141e2e 100%); border-color:#253047; }
  .dossier-root.dark .tab-btn.active { background:#141e2e; }
  .dossier-root.dark .tab-btn:hover:not(.active) { background:#1a2539; }
  .dossier-root.dark .timeline-item > div { background:#1a2539 !important; border-color:#253047 !important; }
  .dossier-root.dark .doc-thumb { background:#1a2539; border-color:#253047; }
`;

/* ─── ECG ── */
const EcgLine = () => (
  <svg viewBox="0 0 400 36" xmlns="http://www.w3.org/2000/svg" className="ecg-bar" preserveAspectRatio="none">
    <polyline points="0,18 40,18 50,18 60,4 68,32 76,4 84,18 120,18 130,18 140,4 148,32 156,4 164,18 200,18 210,18 220,4 228,32 236,4 244,18 280,18 290,18 300,4 308,32 316,4 324,18 360,18 400,18"
      fill="none" stroke="#0d9488" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

/* ─── Field ── */
const Field = ({ label, value, icon }) => (
  <div className="med-field">
    <span className="med-label">{label}</span>
    <div style={{ position: "relative" }}>
      {icon && <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, opacity: 0.5 }}>{icon}</span>}
      <input readOnly className={`med-input${!value ? " empty" : ""}`} value={value || "Non renseigné"} style={icon ? { paddingLeft: 32 } : {}} />
    </div>
  </div>
);

/* ─── Documents strip shown inside each timeline card ── */
const ConsultDocs = ({ docs }) => {
  const [lightbox, setLightbox] = useState(null);
  if (!docs || docs.length === 0) return null;

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #f1f5f9" }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
        📎 Documents joints
        <span style={{ background: "#e0f2fe", color: "#0369a1", borderRadius: 20, fontSize: 10, padding: "1px 7px", fontWeight: 700 }}>
          {docs.length}
        </span>
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {docs.map((doc) => {
          const isImage = doc.mime_type?.startsWith("image/");
          const url = `${BASE}/uploads/consultations/${doc.id_consultation}/${doc.filename}`;
          const isPdf = doc.mime_type === "application/pdf";

          return (
            <a
              key={doc.id}
              href={isPdf ? url : undefined}
              target={isPdf ? "_blank" : undefined}
              rel="noopener noreferrer"
              onClick={isImage ? (e) => { e.preventDefault(); setLightbox(url); } : undefined}
              className="doc-thumb"
              title={doc.label || doc.original_name}
            >
              {isImage ? (
                <img src={url} alt={doc.label} style={{ width: "100%", height: 60, objectFit: "cover" }} />
              ) : (
                <div style={{ height: 60, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, background: "#fef3c7" }}>
                  📄
                </div>
              )}
              <div style={{ padding: "4px 6px" }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {doc.doc_type_label || doc.label || doc.original_name}
                </p>
              </div>
            </a>
          );
        })}
      </div>

      {/* Lightbox for images */}
      {lightbox && (
        <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
          <img
            src={lightbox}
            alt="aperçu"
            style={{ maxWidth: "90vw", maxHeight: "88vh", borderRadius: 10, boxShadow: "0 8px 48px rgba(0,0,0,0.6)" }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            style={{ position: "fixed", top: 20, right: 24, background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 40, height: 40, fontSize: 20, color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >✕</button>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   PAYMENT MODAL
═══════════════════════════════════════════════════════════════════ */
const MODES = [
  { value: "cash",  label: "Espèces",     icon: "💵" },
  { value: "carte", label: "Carte Chifaa", icon: "💳" },
];

function PaymentModal({ fileId, consultationId, patientName, onClose, onDone }) {
  const [montant, setMontant] = useState("");
  const [mode, setMode]       = useState("cash");
  const [isFree, setIsFree]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError]     = useState(null);

  const sendToReception = async () => {
    if (!montant || isNaN(Number(montant)) || Number(montant) <= 0) {
      setError("Veuillez entrer le montant avant d'envoyer à la caisse.");
      return;
    }
    setLoading(true); setError(null);
    try {
      await axios.post(`${BASE}/file-attente/passer-en-paiement`, {
        file_id: fileId, montant: Number(montant), mode_paiement: mode,
      }, { headers: hdr() });
      setSuccess("reception");
      setTimeout(() => { onDone("reception"); onClose(); }, 1800);
    } catch (e) {
      setError(e.response?.data?.error || "Erreur lors de l'envoi à la caisse.");
      setLoading(false);
    }
  };

  const payDirect = async () => {
    if (!montant || isNaN(Number(montant)) || Number(montant) <= 0) {
      setError("Veuillez entrer un montant valide.");
      return;
    }
    setLoading(true); setError(null);
    try {
      if (fileId) {
        await axios.post(`${BASE}/file-attente/confirmer-paiement`, {
          file_id: fileId, id_consultation: consultationId,
          montant: Number(montant), mode_paiement: mode,
        }, { headers: hdr() });
      } else {
        // No file d'attente entry — consultation was added directly from the
        // dossier (statut is already 'terminee' by default). Just record the
        // payment via the generic paiements endpoint.
        await axios.post(`${BASE}/paiements`, {
          id_consultation: consultationId,
          montant: Number(montant),
          mode_paiement: mode,
          statut: "paid",
        }, { headers: hdr() });
      }
      setSuccess("direct");
      setTimeout(() => { onDone("direct"); onClose(); }, 1800);
    } catch (e) {
      setError(e.response?.data?.message || e.response?.data?.error || "Erreur lors du paiement.");
      setLoading(false);
    }
  };

  // Free consultation — same endpoint as a direct payment (it already closes
  // file_attente + rendez_vous), just with montant forced to 0 and a distinct
  // mode_paiement so reporting can tell "free" apart from a real 0-DA entry.
  const finishFree = async () => {
    setLoading(true); setError(null);
    try {
      if (fileId) {
        await axios.post(`${BASE}/file-attente/confirmer-paiement`, {
          file_id: fileId, id_consultation: consultationId,
          montant: 0, mode_paiement: "gratuit",
        }, { headers: hdr() });
      } else {
        await axios.post(`${BASE}/paiements`, {
          id_consultation: consultationId,
          montant: 0,
          mode_paiement: "gratuit",
          statut: "paid",
        }, { headers: hdr() });
      }
      setSuccess("free");
      setTimeout(() => { onDone("free"); onClose(); }, 1800);
    } catch (e) {
      setError(e.response?.data?.message || e.response?.data?.error || "Erreur lors de la clôture.");
      setLoading(false);
    }
  };

  const toggleFree = () => { setIsFree(f => !f); setError(null); };

  return (
    <div className="pay-overlay" onClick={onClose}>
      <div className="pay-modal" onClick={e => e.stopPropagation()}>
        <div className="pay-modal-header">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.45)", marginBottom: 4 }}>Fin de consultation</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>Règlement des honoraires</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 3 }}>{patientName}</div>
            </div>
            <button onClick={onClose} disabled={loading} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 10, width: 34, height: 34, cursor: "pointer", fontSize: 18, color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>
        </div>

        {success ? (
          <div className="pay-success">
            <div style={{ fontSize: 56 }}>
              {success === "reception" ? "📋" : success === "free" ? "🎁" : "✅"}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
              {success === "reception" ? "Patient envoyé à la caisse"
                : success === "free" ? "Consultation clôturée — gratuite"
                : "Paiement enregistré"}
            </div>
            <div style={{ fontSize: 13, color: "#64748b" }}>
              {success === "reception" ? "La réceptionniste prendra en charge le règlement."
                : success === "free" ? "Aucun montant facturé à ce patient."
                : `${montant} دج encaissé — consultation terminée.`}
            </div>
          </div>
        ) : (
          <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Free toggle */}
            <button
              type="button"
              onClick={toggleFree}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                border: `1.5px solid ${isFree ? "#0d9488" : "#e2e8f0"}`,
                background: isFree ? "#f0fdfa" : "#fff",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: isFree ? "#0f766e" : "#475569" }}>
                🎁 Consultation gratuite
              </span>
              <span style={{ width: 38, height: 22, borderRadius: 20, position: "relative", background: isFree ? "#0d9488" : "#cbd5e1", transition: "background .15s", flexShrink: 0 }}>
                <span style={{ position: "absolute", top: 2, left: isFree ? 18 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .15s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
              </span>
            </button>

            {isFree ? (
              <div style={{ background: "#f0fdfa", border: "1px solid #99f6e4", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "#0f766e", lineHeight: 1.5 }}>
                Aucun montant ne sera facturé. La consultation sera clôturée directement, sans passage par la caisse.
              </div>
            ) : (
              <>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Montant des honoraires</label>
                  <div style={{ position: "relative" }}>
                    <input className="pay-input" type="number" min="0" placeholder="0" value={montant}
                      onChange={e => { setMontant(e.target.value); setError(null); }}
                      style={{ paddingRight: 48, fontSize: 22, fontWeight: 800, color: "#0f172a" }} />
                    <span style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", fontSize: 15, fontWeight: 700, color: "#0d9488" }}>دج</span>
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Mode de paiement</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {MODES.map(m => (
                      <button key={m.value} type="button" className={`pay-mode-chip${mode === m.value ? " active" : ""}`} onClick={() => setMode(m.value)} style={{ flex: 1 }}>
                        {m.icon} {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#dc2626", display: "flex", alignItems: "center", gap: 8 }}>
                ⚠ {error}
              </div>
            )}

            <div style={{ borderTop: "1px solid #f1f5f9", marginBottom: -4 }} />

            {isFree ? (
              <button className="pay-btn pay-btn-direct" onClick={finishFree} disabled={loading}>
                {loading
                  ? <span style={{ width: 18, height: 18, border: "2.5px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite", flexShrink: 0 }} />
                  : <span style={{ fontSize: 18 }}>🎁</span>}
                <div style={{ textAlign: "left" }}>
                  <div>Clôturer — consultation gratuite</div>
                  <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.8 }}>Aucun encaissement, dossier marqué terminé</div>
                </div>
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {fileId && (
                  <button className="pay-btn pay-btn-reception" onClick={sendToReception} disabled={loading}>
                    <span style={{ fontSize: 18 }}>📋</span>
                    <div style={{ textAlign: "left" }}>
                      <div>Envoyer à la caisse{montant ? ` — ${montant} دج` : ""}</div>
                      <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.7 }}>{montant ? "La réceptionniste confirmera ce montant" : "Entrez d'abord le montant"}</div>
                    </div>
                  </button>
                )}
                <button className="pay-btn pay-btn-direct" onClick={payDirect} disabled={loading || !montant}>
                  {loading
                    ? <span style={{ width: 18, height: 18, border: "2.5px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite", flexShrink: 0 }} />
                    : <span style={{ fontSize: 18 }}>💵</span>}
                  <div style={{ textAlign: "left" }}>
                    <div>Payer directement — {montant ? `${montant} دج` : "entrez un montant"}</div>
                    <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.8 }}>Le médecin encaisse et clôture la consultation</div>
                  </div>
                </button>
                {!fileId && (
                  <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", margin: 0 }}>
                    Consultation ajoutée directement au dossier — pas de passage par la caisse.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PATIENT DOSSIER
══════════════════════════════════════════════════════════════════ */
export default function PatientDossier() {
  const { id }    = useParams();
  const location  = useLocation();

  const incomingConsultId = location.state?.id_consultation ?? null;
  const incomingFileId    = location.state?.file_id         ?? null;

  const [patient, setPatient]               = useState(null);
  const [consultations, setConsultations]   = useState([]);
  const [activeTab, setActiveTab]           = useState(incomingConsultId ? "new" : "history");
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState(null);
  const [doctorSettings, setDoctorSettings] = useState(null);
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [dark, setDark]                     = useState(() => localStorage.getItem("med-theme") === "dark");
  const [activeConsultId, setActiveConsultId] = useState(incomingConsultId);
  const [activeFileId, setActiveFileId]       = useState(incomingFileId);
  const [showPayModal, setShowPayModal]       = useState(false);
  const [form, setForm]       = useState({ diagnostic: "", notes: "", medicaments: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handler = e => setDark(e.detail);
    window.addEventListener("med-theme-change", handler);
    return () => window.removeEventListener("med-theme-change", handler);
  }, []);

  useEffect(() => {
    if (!id) return;
    fetchPatient();
    fetchConsultations();
    fetchSettings();
  }, [id]);

  const fetchPatient = async () => {
    try {
      const res = await axios.get(`${BASE}/patient/get/${id}`, { headers: hdr() });
      setPatient(res.data[0]);
    } catch { setError("Impossible de charger le patient."); }
  };

  const fetchConsultations = async () => {
    try {
      const res = await axios.get(`${BASE}/consultation/patient/${id}`, { headers: hdr() });
      const consultationsData = res.data;

      const withDocs = await Promise.all(
        consultationsData.map(async (c) => {
          try {
            const docsRes = await axios.get(`${BASE}/consultation/${c.id}/documents`, { headers: hdr() });
            return { ...c, documents: docsRes.data };
          } catch {
            return { ...c, documents: [] };
          }
        })
      );

      setConsultations(withDocs);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${BASE}/ordonnance-settings/me`, { headers: hdr() });
      setDoctorSettings(Array.isArray(res.data) ? res.data[0] : res.data);
    } catch {}
  };

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e, attachedDocs = []) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let consultationId = activeConsultId;

      if (activeConsultId) {
        await axios.put(
          `${BASE}/consultation/${activeConsultId}`,
          { diagnostic: form.diagnostic, notes: form.notes },
          { headers: hdr() }
        );
      } else {
        const res = await axios.post(
          `${BASE}/consultation`,
          { id_patient: id, diagnostic: form.diagnostic, notes: form.notes },
          { headers: hdr() }
        );
        consultationId = res.data.id;
      }

      if (form.medicaments) {
        await axios.post(
          `${BASE}/consultation/ordonnance`,
          { id_consultation: consultationId, instructions: form.medicaments },
          { headers: hdr() }
        );
      }

      if (attachedDocs.length > 0) {
        await Promise.all(
          attachedDocs.map((doc) => {
            const fd = new FormData();
            fd.append("file",         doc.file);
            fd.append("docType",      doc.docType);
            fd.append("docTypeLabel", doc.docTypeLabel);
            fd.append("label",        doc.label);
            return axios.post(
              `${BASE}/consultation/${consultationId}/documents`,
              fd,
              { headers: { Authorization: `Bearer ${tkn()}`, "Content-Type": "multipart/form-data" } }
            );
          })
        );
      }

      // Mark this consultation as "active" regardless of how it was created —
      // this is what makes the "Terminer la consultation" / payment button
      // appear even for a consultation added directly from the dossier
      // (i.e. not routed through file d'attente, so activeFileId stays null).
      setActiveConsultId(consultationId);
      setForm({ diagnostic: "", notes: "", medicaments: "" });
      await fetchConsultations();
      setActiveTab("history");

    } catch (err) {
      console.error("Submit error:", err.response?.data || err.message);
      alert("Erreur lors de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentDone = () => {
    setActiveConsultId(null);
    setActiveFileId(null);
    fetchConsultations();
  };

  const getInitials = (nom, prenom) =>
    `${(prenom?.[0] || "").toUpperCase()}${(nom?.[0] || "").toUpperCase()}`;

  const calcAge = dob =>
    !dob ? "—" : Math.floor((Date.now() - new Date(dob).getTime()) / (1000*60*60*24*365.25));

  const fmt  = d => d ? new Date(d).toLocaleDateString("fr-FR", { year:"numeric", month:"long", day:"numeric" }) : "—";
  const fmts = d => d ? new Date(d).toLocaleDateString("fr-FR", { day:"numeric", month:"short", year:"numeric" }) : "—";

  const patientName = patient ? `${patient.prenom} ${patient.nom}` : "";

  if (loading) return (
    <div className="dossier-root flex h-screen" style={{ background:"#f8fafc", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12 }}>
      <style>{css}</style>
      <div className="spinner" /><p style={{ fontSize:13, color:"#64748b" }}>Chargement du dossier…</p>
    </div>
  );

  if (error || !patient) return (
    <div className="dossier-root flex h-screen" style={{ background:"#f8fafc", alignItems:"center", justifyContent:"center" }}>
      <style>{css}</style>
      <div style={{ background:"white", borderRadius:16, padding:"2rem", maxWidth:380, textAlign:"center", border:"1.5px solid #e2e8f0" }}>
        <div style={{ fontSize:40, marginBottom:12 }}>⚠️</div>
        <h3 style={{ fontFamily:"'DM Serif Display',serif", fontSize:20, color:"#0f172a", marginBottom:8 }}>Erreur de chargement</h3>
        <p style={{ fontSize:14, color:"#64748b", marginBottom:20 }}>{error || "Patient introuvable."}</p>
        <button onClick={() => window.location.reload()} style={{ padding:"9px 24px", background:"#0d9488", color:"white", border:"none", borderRadius:8, fontSize:14, cursor:"pointer" }}>Réessayer</button>
      </div>
    </div>
  );

  const age       = calcAge(patient.date_naissance);
  const lastVisit = consultations.length > 0 ? fmts(consultations[0].date_consultation) : null;

  return (
    <div className={`dossier-root flex h-screen${dark ? " dark" : ""}`} style={{ background:"var(--mist)" }}>
      <style>{css}</style>

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto" style={{ padding:"24px 28px" }}>
          <div style={{ maxWidth:1100, margin:"0 auto", display:"flex", flexDirection:"column", gap:20 }}>

            {/* Active consultation banner */}
            {activeConsultId && (
              <div className="active-consult-banner">
                <div style={{ width:36, height:36, borderRadius:10, background:"rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>🩺</div>
                <div>
                  <div style={{ fontWeight:700, fontSize:14, color:"#fff" }}>Consultation en cours</div>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,0.7)", marginTop:2 }}>Remplissez le diagnostic et les notes, puis terminez la consultation.</div>
                </div>
                <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6, background:"rgba(255,255,255,0.15)", borderRadius:20, padding:"4px 12px" }}>
                  <span className="pulse-dot" style={{ width:8, height:8 }} />
                  <span style={{ fontSize:12, color:"#6ee7b7", fontWeight:600 }}>Active</span>
                </div>
              </div>
            )}

            {/* HERO BANNER */}
            <div className="med-card" style={{ background:"linear-gradient(135deg,#0f172a 0%,#134e4a 100%)", border:"none", overflow:"hidden", position:"relative" }}>
              <div style={{ position:"absolute", bottom:0, left:0, right:0 }}><EcgLine /></div>
              <div style={{ padding:"24px 28px", position:"relative", zIndex:1 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:16 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:18 }}>
                    <div className="patient-avatar">{getInitials(patient.nom, patient.prenom)}</div>
                    <div>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                        <span style={{ fontSize:10, fontWeight:600, letterSpacing:"0.12em", textTransform:"uppercase", color:"#99f6e4" }}>Dossier patient</span>
                        <div style={{ display:"flex", alignItems:"center", gap:5, background:"rgba(16,185,129,0.15)", border:"1px solid rgba(16,185,129,0.3)", borderRadius:20, padding:"2px 8px" }}>
                          <span className="pulse-dot" style={{ width:7, height:7 }} />
                          <span style={{ fontSize:10, color:"#6ee7b7", fontWeight:500 }}>Actif</span>
                        </div>
                      </div>
                      <h1 style={{ fontFamily:"'DM Serif Display',serif", fontSize:28, color:"white", margin:0, lineHeight:1.1 }}>
                        {patient.prenom} <span style={{ fontStyle:"italic", opacity:0.85 }}>{patient.nom}</span>
                      </h1>
                      <div style={{ display:"flex", gap:16, marginTop:6, flexWrap:"wrap" }}>
                        {[{ icon:"🎂", label:fmt(patient.date_naissance) }, { icon:"⚥", label:patient.sexe === "M" ? "Masculin" : "Féminin" }, { icon:"📞", label:patient.telephone || "—" }].map(item => (
                          <span key={item.label} style={{ fontSize:13, color:"#94a3b8", display:"flex", alignItems:"center", gap:5 }}>
                            <span style={{ fontSize:12 }}>{item.icon}</span>{item.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:12 }}>
                    {[{ value:age, label:"Ans", sub:"Âge" }, { value:consultations.length, label:"Visites", sub:"Total" }, { value:lastVisit||"—", label:"", sub:"Dernière visite", small:true }].map(s => (
                      <div key={s.sub} style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:12, padding:"12px 16px", minWidth:80, textAlign:"center" }}>
                        <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:s.small?13:22, fontWeight:600, color:"#99f6e4", lineHeight:1.2 }}>
                          {s.value}{s.label && <span style={{ fontSize:11, marginLeft:2, opacity:0.7, fontFamily:"'DM Sans',sans-serif" }}>{s.label}</span>}
                        </div>
                        <div style={{ fontSize:10, color:"#64748b", marginTop:3, textTransform:"uppercase", letterSpacing:"0.08em" }}>{s.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* CONTENT GRID */}
            <div style={{ display:"grid", gridTemplateColumns:"300px 1fr", gap:20, alignItems:"start" }}>

              {/* LEFT: Info cards */}
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                <div className="med-card">
                  <div className="med-card-header">
                    <div className="med-card-header-icon">👤</div>
                    <span style={{ fontWeight:600, fontSize:13, color:"var(--navy)" }}>Informations personnelles</span>
                  </div>
                  <div className="med-card-body" style={{ display:"flex", flexDirection:"column", gap:12 }}>
                    <Field label="Prénom"            value={patient.prenom}                                icon="✦" />
                    <Field label="Nom de famille"    value={patient.nom}                                   icon="✦" />
                    <Field label="Date de naissance" value={fmt(patient.date_naissance)}                   icon="🗓" />
                    <Field label="Âge"               value={`${age} ans`}                                  icon="⏱" />
                    <Field label="Sexe"              value={patient.sexe === "M" ? "Masculin" : "Féminin"} icon="⚥" />
                    <div className="med-field">
                      <span className="med-label">Maladies Chroniques</span>
                      <div className={`med-input${!patient.maladies_chroniques ? " empty" : ""}`}
                        style={{ minHeight:60, whiteSpace:"pre-wrap", background:patient.maladies_chroniques?"#fff1f2":"var(--teal-lt)", borderColor:patient.maladies_chroniques?"#fecdd3":"var(--teal-md)", color:patient.maladies_chroniques?"#be123c":"inherit", fontWeight:patient.maladies_chroniques?"600":"500" }}>
                        {patient.maladies_chroniques || "Aucune signalée"}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="med-card">
                  <div className="med-card-header">
                    <div className="med-card-header-icon" style={{ background:"#0c4a6e" }}>📋</div>
                    <span style={{ fontWeight:600, fontSize:13, color:"var(--navy)" }}>Contact & adresse</span>
                  </div>
                  <div className="med-card-body" style={{ display:"flex", flexDirection:"column", gap:12 }}>
                    <Field label="Téléphone" value={patient.telephone} icon="📞" />
                    <Field label="Adresse"   value={patient.adresse}   icon="📍" />
                    <div className="med-field">
                      <span className="med-label">Dossier créé le</span>
                      <input readOnly className="med-input" value={fmt(patient.date_creation)} style={{ background:"#fff7ed", borderColor:"#fed7aa", color:"#9a3412" }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT: Tabs */}
              <div className="med-card" style={{ minHeight:520 }}>
                <div style={{ borderBottom:"1.5px solid var(--line)", background:"var(--mist)", display:"flex", alignItems:"center", justifyContent:"space-between", paddingRight:16 }}>
                  <div style={{ display:"flex" }}>
                    <button className={`tab-btn${activeTab==="history"?" active":""}`} onClick={() => setActiveTab("history")}>
                      📋 Historique
                      {consultations.length > 0 && (
                        <span style={{ marginLeft:6, background:"#f0fdfa", color:"#0d9488", border:"1px solid #99f6e4", borderRadius:20, fontSize:11, padding:"1px 7px", fontWeight:600 }}>
                          {consultations.length}
                        </span>
                      )}
                    </button>
                    <button
                      className={`tab-btn${activeTab==="new"?" active":""}`}
                      onClick={() => setActiveTab("new")}
                      style={activeConsultId ? { color:"#0d9488", fontWeight:700 } : {}}
                    >
                      {activeConsultId ? "🩺 Consultation en cours" : "✚ Nouvelle consultation"}
                    </button>
                  </div>
                  {activeConsultId && activeTab === "history" && (
                    <button
                      onClick={() => setShowPayModal(true)}
                      style={{ display:"flex", alignItems:"center", gap:8, background:"linear-gradient(135deg,#0d9488,#0f766e)", color:"white", border:"none", borderRadius:10, padding:"8px 18px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", boxShadow:"0 2px 10px rgba(13,148,136,0.35)", transition:"all .15s" }}
                      onMouseOver={e => { e.currentTarget.style.filter="brightness(1.08)"; e.currentTarget.style.transform="translateY(-1px)"; }}
                      onMouseOut={e => { e.currentTarget.style.filter="none"; e.currentTarget.style.transform="none"; }}
                    >
                      <span style={{ fontSize:16 }}>✓</span>
                      Terminer la consultation
                    </button>
                  )}
                </div>

                <div style={{ padding:24 }}>
                  {activeTab === "history" ? (
                    <div style={{ maxHeight:560, overflowY:"auto", paddingRight:4 }}>
                      {consultations.length === 0 ? (
                        <div style={{ textAlign:"center", padding:"60px 0", color:"#94a3b8" }}>
                          <div style={{ fontSize:48, marginBottom:12, opacity:0.4 }}>🗂</div>
                          <p style={{ fontFamily:"'DM Serif Display',serif", fontSize:18, color:"#64748b" }}>Aucune consultation</p>
                          <p style={{ fontSize:13, marginTop:4 }}>Le dossier est vide pour l'instant.</p>
                        </div>
                      ) : (
                        consultations.map((consult, idx) => {
                          const isActive = consult.id === activeConsultId;
                          return (
                            <div key={consult.id} className="timeline-item">
                              <div className={`timeline-dot${isActive ? " active-dot" : ""}`}>
                                {!isActive && <div className="timeline-dot-inner" />}
                              </div>

                              <div
                                style={{ background:"white", border:`1.5px solid ${isActive ? "#0d9488" : "#e2e8f0"}`, borderRadius:12, padding:"14px 16px", transition:"box-shadow 0.15s", boxShadow: isActive ? "0 0 0 3px rgba(13,148,136,0.12)" : "none" }}
                                onMouseEnter={e => { if (!isActive) e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.07)"; }}
                                onMouseLeave={e => { if (!isActive) e.currentTarget.style.boxShadow="none"; }}
                              >
                                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                    <span style={{ fontSize:11, fontWeight:600, letterSpacing:"0.06em", color:"#0d9488", background:"#f0fdfa", border:"1px solid #99f6e4", borderRadius:20, padding:"2px 10px" }}>
                                      Consultation #{consultations.length - idx}
                                    </span>
                                    {isActive && (
                                      <span style={{ display:"flex", alignItems:"center", gap:5, background:"rgba(13,148,136,0.1)", border:"1px solid rgba(13,148,136,0.3)", borderRadius:20, padding:"2px 8px", fontSize:11, fontWeight:600, color:"#0d9488" }}>
                                        <span className="pulse-dot" style={{ width:6, height:6 }} /> En cours
                                      </span>
                                    )}
                                  </div>
                                  <span style={{ fontSize:12, color:"#94a3b8" }}>🗓 {fmts(consult.date_consultation)}</span>
                                </div>

                                <h3 style={{ fontFamily:"'DM Serif Display',serif", fontSize:16, color:"var(--navy)", margin:"0 0 6px" }}>
                                  {consult.diagnostic || <span style={{ fontStyle:"italic", color:"#94a3b8" }}>Diagnostic non spécifié</span>}
                                </h3>

                                {consult.notes && (
                                  <p style={{ fontSize:13, color:"var(--slate)", lineHeight:1.6, margin:"0 0 8px" }}>{consult.notes}</p>
                                )}

                                {consult.medicaments && (
                                  <div className="ordo-badge">
                                    <p style={{ fontSize:11, fontWeight:600, color:"#1d4ed8", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6, display:"flex", alignItems:"center", gap:5 }}>
                                      💊 Ordonnance
                                    </p>
                                    <pre style={{ fontSize:12, color:"#1e40af", fontFamily:"'DM Sans',monospace", margin:0, whiteSpace:"pre-wrap", lineHeight:1.7 }}>
                                      {consult.medicaments}
                                    </pre>
                                  </div>
                                )}

                                {/* ── Documents ── */}
                                <ConsultDocs docs={consult.documents} />

                                {/* Row of actions */}
                                <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
                                  <button
                                    onClick={() => setSelectedConsultation(consult)}
                                    disabled={!consult.medicaments}
                                    style={{ background:consult.medicaments?"#0f172a":"#e2e8f0", color:consult.medicaments?"white":"#94a3b8", border:"none", padding:"6px 14px", borderRadius:6, fontSize:12, cursor:consult.medicaments?"pointer":"not-allowed", display:"flex", alignItems:"center", gap:5, fontFamily:"'DM Sans',sans-serif" }}
                                  >
                                    👁️ {consult.medicaments ? "Voir ordonnance" : "Pas d'ordonnance"}
                                  </button>
                                  {isActive && (
                                    <button
                                      onClick={() => setShowPayModal(true)}
                                      style={{ display:"flex", alignItems:"center", gap:6, background:"linear-gradient(135deg,#0d9488,#0f766e)", color:"white", border:"none", borderRadius:6, padding:"6px 16px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", boxShadow:"0 2px 8px rgba(13,148,136,0.3)" }}
                                    >
                                      <span>✓</span> Terminer la consultation
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  ) : (
                    <ConsultationForm
                      form={form}
                      setForm={setForm}
                      onChange={handleChange}
                      onSubmit={handleSubmit}
onOpenPreview={(docType = "ordonnance", certData = null) =>
  setSelectedConsultation({ docType, medicaments: form.medicaments, certData })
}                      submitting={submitting}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {showPayModal && (
        <PaymentModal
          fileId={activeFileId}
          consultationId={activeConsultId}
          patientName={patientName}
          onClose={() => setShowPayModal(false)}
          onDone={handlePaymentDone}
        />
      )}

      <OrdonnanceModal
  show={!!selectedConsultation}
  onClose={() => setSelectedConsultation(null)}
  doctorSettings={doctorSettings}
  patient={patient}
  docType={selectedConsultation?.docType || "ordonnance"}
  medicaments={selectedConsultation?.medicaments}
  certificate={selectedConsultation?.certData}
/>
    </div>
  );
}