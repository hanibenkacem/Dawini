import { useState, useEffect, useCallback, useRef } from "react";
import { API_BASE } from '../config/api';

const API = import.meta.env.VITE_API_URL || `${API_BASE}`;
const PAGE_SIZE = 20;

// Maps the UI's sort keys to the backend's allowed sortBy columns
const SORT_MAP = { date: "date_paiement", amount: "montant", method: "mode_paiement", status: "statut" };

// ─── PALETTES ─────────────────────────────────────────────────────────────────
const LIGHT = {
  bg: "#F0F4F8", surface: "#FFFFFF", surfaceAlt: "#FAFBFC",
  border: "#E2E8F0", text: "#0F2942", textSoft: "#64748B",
  teal: "#0E7490", tealLight: "#CFFAFE", tealMid: "#06B6D4",
  slateLight: "#F1F5F9", red: "#DC2626", redLight: "#FEF2F2",
  green: "#16A34A", greenLight: "#F0FDF4",
  shadow: "rgba(15,41,66,0.07)", shadowMd: "rgba(15,41,66,0.12)",
};
const DARK = {
  bg: "#0D1520", surface: "#141E2E", surfaceAlt: "#1A2539",
  border: "#253047", text: "#E2EAF4", textSoft: "#7B93B8",
  teal: "#22D3EE", tealLight: "#083344", tealMid: "#06B6D4",
  slateLight: "#1E2B3E", red: "#F87171", redLight: "#2D1515",
  green: "#4ADE80", greenLight: "#0F2D1A",
  shadow: "rgba(0,0,0,0.3)", shadowMd: "rgba(0,0,0,0.45)",
};

// ─── RESPONSIVE HOOK ──────────────────────────────────────────────────────────
function useWindowWidth() {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return w;
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
function StatusBadge({ statut, C }) {
  const cfg = statut === "paid"
    ? { bg: C.greenLight, color: C.green, label: "✓ Payé" }
    : { bg: C.redLight,   color: C.red,   label: "✕ Impayé" };
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      borderRadius: 20, padding: "3px 10px",
      fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
    }}>
      {cfg.label}
    </span>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, accent, C }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 16, padding: "18px 20px",
      boxShadow: `0 2px 8px ${C.shadow}`,
      flex: "1 1 140px", position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 0, right: 0,
        width: 70, height: 70, borderRadius: "0 16px 0 70px",
        background: accent, opacity: 0.08,
      }} />
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: C.text, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: C.textSoft, marginTop: 4, fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: accent, marginTop: 3, fontWeight: 600 }}>{sub}</div>}
    </div>
  );
}

// ─── EDIT MODAL ───────────────────────────────────────────────────────────────
function EditModal({ C, onClose, onSave, editData, saving }) {
  const [form, setForm] = useState({
    montant:       editData.montant,
    mode_paiement: editData.mode_paiement ?? "Espèces",
    statut:        editData.statut,
    date:          editData.date ?? new Date().toISOString().split("T")[0],
    insurance:     "",
  });

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 200, backdropFilter: "blur(3px)", padding: "16px",
      }}
      onClick={e => e.target === e.currentTarget && !saving && onClose()}
    >
      <div style={{
        background: C.surface, borderRadius: 20, padding: "28px 24px",
        width: "100%", maxWidth: 460,
        boxShadow: `0 20px 60px ${C.shadowMd}`,
        border: `1px solid ${C.border}`,
        animation: "modalIn .2s cubic-bezier(.34,1.56,.64,1)",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.text }}>Modifier le paiement</h2>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: C.textSoft }}>
              REC-{String(editData.id).padStart(4, "0")}
            </p>
          </div>
          <button onClick={onClose} disabled={saving} style={{
            background: C.slateLight, border: "none", borderRadius: 8,
            width: 30, height: 30, cursor: "pointer", color: C.textSoft,
            fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>×</button>
        </div>

        {/* Read-only patient + diagnostic block */}
        <div style={{
          background: C.slateLight, borderRadius: 12, padding: "12px 14px",
          marginBottom: 20, display: "flex", flexDirection: "column", gap: 8,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
              background: `linear-gradient(135deg, ${C.teal}, ${C.tealMid})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 800, fontSize: 13,
            }}>
              {editData.patient?.charAt(0) ?? "?"}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{editData.patient ?? "—"}</div>
              <div style={{ fontSize: 11, color: C.textSoft, marginTop: 1 }}>Patient</div>
            </div>
          </div>
          {editData.diagnostic && (
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8, fontSize: 12, color: C.textSoft }}>
              <span style={{ fontWeight: 600, color: C.text }}>Diagnostic : </span>
              {editData.diagnostic}
            </div>
          )}
        </div>

        {/* Editable fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Montant (DA)</label>
              <input type="number" value={form.montant}
                onChange={e => setForm(f => ({ ...f, montant: Number(e.target.value) }))}
                style={inputStyle(C)} />
            </div>
            <div>
              <label style={labelStyle}>Date</label>
              <input type="date" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                style={inputStyle(C)} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Mode de paiement</label>
            <select value={form.mode_paiement}
              onChange={e => setForm(f => ({ ...f, mode_paiement: e.target.value }))}
              style={inputStyle(C)}>
              {["Espèces", "Carte", "CNAS", "CASNOS", "Mixte"].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>

          {(form.mode_paiement === "CNAS" || form.mode_paiement === "CASNOS") && (
            <div>
              <label style={labelStyle}>N° Assurance</label>
              <input value={form.insurance}
                onChange={e => setForm(f => ({ ...f, insurance: e.target.value }))}
                placeholder="Numéro de dossier assurance"
                style={inputStyle(C)} />
            </div>
          )}

          <div>
            <label style={labelStyle}>Statut</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ value: "paid", label: "✓ Payé" }, { value: "pending", label: "✕ Impayé" }].map(s => (
                <button key={s.value} onClick={() => setForm(f => ({ ...f, statut: s.value }))}
                  style={{
                    flex: 1, padding: "9px 0", borderRadius: 10, border: "2px solid",
                    borderColor: form.statut === s.value ? C.teal : C.border,
                    background: form.statut === s.value ? C.tealLight : "transparent",
                    color: form.statut === s.value ? C.teal : C.textSoft,
                    fontWeight: 700, fontSize: 12, cursor: "pointer",
                    fontFamily: "'Plus Jakarta Sans', sans-serif", transition: "all .15s",
                  }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button onClick={onClose} disabled={saving} style={{
            flex: 1, padding: "11px 0", borderRadius: 10,
            border: `1px solid ${C.border}`, background: "transparent",
            color: C.textSoft, fontWeight: 600, fontSize: 14,
            cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>Annuler</button>
          <button onClick={() => onSave(form)} disabled={saving} style={{
            flex: 2, padding: "11px 0", borderRadius: 10, border: "none",
            background: saving ? C.border : `linear-gradient(135deg, ${C.teal}, ${C.tealMid})`,
            color: "#fff", fontWeight: 700, fontSize: 14,
            cursor: saving ? "not-allowed" : "pointer",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            transition: "background .2s",
          }}>
            {saving ? "⏳ Enregistrement..." : "💾 Mettre à jour"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── RECEIPT MODAL ────────────────────────────────────────────────────────────
function ReceiptModal({ payment, C, onClose }) {
  const today = new Date().toLocaleDateString("fr-DZ", { day: "2-digit", month: "long", year: "numeric" });
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 300, backdropFilter: "blur(4px)", padding: "16px",
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: "#fff", borderRadius: 16, width: "100%", maxWidth: 360,
        boxShadow: "0 25px 60px rgba(0,0,0,0.3)", overflow: "hidden",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        animation: "modalIn .2s cubic-bezier(.34,1.56,.64,1)",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ background: "linear-gradient(135deg, #0E7490, #06B6D4)", padding: "22px", textAlign: "center", color: "#fff" }}>
          <div style={{ fontSize: 26, marginBottom: 6 }}>🏥</div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>DAWINI</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>Reçu de paiement</div>
        </div>
        <div style={{ padding: "20px", color: "#0F2942" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, paddingBottom: 14, borderBottom: "1px dashed #E2E8F0" }}>
            <span style={{ fontSize: 12, color: "#64748B" }}>N° Reçu</span>
            <span style={{ fontWeight: 700, fontSize: 13 }}>REC-{String(payment.id).padStart(4, "0")}</span>
          </div>
          {[
            ["Patient",    payment.patient ?? "—"],
            ["Date",       payment.date],
            ["Diagnostic", payment.diagnostic ?? "—"],
            ["Méthode",    payment.mode_paiement],
            ["Statut",     payment.statut === "paid" ? "✓ Payé intégralement" : "✕ Impayé"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 9, gap: 12 }}>
              <span style={{ fontSize: 12, color: "#64748B", flexShrink: 0 }}>{k}</span>
              <span style={{ fontSize: 13, fontWeight: 600, textAlign: "right" }}>{v}</span>
            </div>
          ))}
          <div style={{ background: "#F0F4F8", borderRadius: 12, padding: "12px 14px", marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Montant total</span>
            <span style={{ fontWeight: 800, fontSize: 18, color: "#0E7490" }}>{payment.montant.toLocaleString()} DA</span>
          </div>
          <div style={{ textAlign: "center", marginTop: 14, fontSize: 11, color: "#94A3B8" }}>
            Émis le {today} · Merci de votre confiance
          </div>
        </div>
        <div style={{ padding: "0 20px 20px", display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid #E2E8F0", background: "transparent", color: "#64748B", fontWeight: 600, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Fermer</button>
          <button onClick={() => window.print()} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #0E7490, #06B6D4)", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>🖨️ Imprimer</button>
        </div>
      </div>
    </div>
  );
}

// ─── PAYMENT CARD (mobile only) ───────────────────────────────────────────────
function PaymentCard({ p, C, onEdit, onReceipt, onDelete }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 14, padding: "14px 16px",
      boxShadow: `0 1px 4px ${C.shadow}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
            background: `linear-gradient(135deg, ${C.teal}, ${C.tealMid})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 800, fontSize: 13,
          }}>
            {p.patient?.charAt(0) ?? "?"}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{p.patient ?? "—"}</div>
            <div style={{ fontSize: 11, color: C.textSoft, marginTop: 1 }}>
              {p.date ? new Date(p.date).toLocaleDateString("fr-DZ", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: p.statut === "pending" ? C.red : C.text }}>
            {p.montant?.toLocaleString() ?? "—"}&nbsp;<span style={{ fontSize: 11, fontWeight: 500, color: C.textSoft }}>DA</span>
          </div>
          <div style={{ marginTop: 4 }}>
            <StatusBadge statut={p.statut} C={C} />
          </div>
        </div>
      </div>

      {p.diagnostic && (
        <div style={{
          fontSize: 12, color: C.textSoft, background: C.slateLight,
          borderRadius: 8, padding: "6px 10px", marginBottom: 10,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }} title={p.diagnostic}>
          📋 {p.diagnostic}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ padding: "3px 9px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: C.slateLight, color: C.textSoft }}>
          {p.mode_paiement ?? "—"}
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => onReceipt(p)} style={{ background: C.tealLight,  color: C.teal,     border: "none", borderRadius: 7, padding: "6px 10px", cursor: "pointer", fontSize: 14 }}>🧾</button>
          <button onClick={() => onEdit(p)}    style={{ background: C.slateLight, color: C.textSoft, border: "none", borderRadius: 7, padding: "6px 10px", cursor: "pointer", fontSize: 14 }}>✏️</button>
          <button onClick={() => onDelete(p.id)} style={{ background: C.redLight, color: C.red,      border: "none", borderRadius: 7, padding: "6px 10px", cursor: "pointer", fontSize: 14 }}>🗑️</button>
        </div>
      </div>
    </div>
  );
}

// ─── PAGINATION BAR ───────────────────────────────────────────────────────────
function navBtnStyle(C, disabled) {
  return {
    padding: "7px 14px", borderRadius: 8, border: `1.5px solid ${C.border}`,
    background: disabled ? C.slateLight : C.surface, color: disabled ? C.textSoft : C.text,
    fontWeight: 600, fontSize: 12, cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "'Plus Jakarta Sans', sans-serif", opacity: disabled ? 0.5 : 1,
  };
}

function PaginationBar({ pagination, page, setPage, C }) {
  const { total, totalPages, limit } = pagination;

  if (total === 0) return null;

  const start = (page - 1) * limit + 1;
  const end   = Math.min(page * limit, total);

  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      flexWrap: "wrap", gap: 10, padding: "14px 4px",
    }}>
      <span style={{ fontSize: 12, color: C.textSoft }}>
        {start}–{end} sur {total} résultat{total !== 1 ? "s" : ""}
      </span>
      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            style={navBtnStyle(C, page <= 1)}>← Précédent</button>
          <span style={{ fontSize: 12, color: C.textSoft, padding: "0 6px", whiteSpace: "nowrap" }}>
            Page {page} / {totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            style={navBtnStyle(C, page >= totalPages)}>Suivant →</button>
        </div>
      )}
    </div>
  );
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const labelStyle = {
  fontSize: 11, fontWeight: 700, color: "#64748B",
  display: "block", marginBottom: 5,
  letterSpacing: "0.05em", textTransform: "uppercase",
};
function inputStyle(C) {
  return {
    width: "100%", boxSizing: "border-box",
    padding: "9px 12px", borderRadius: 10,
    border: `1.5px solid ${C.border}`,
    background: C.surfaceAlt, color: C.text,
    fontSize: 13, fontWeight: 500,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    outline: "none",
  };
}

// ─── SKELETON ─────────────────────────────────────────────────────────────────
function SkeletonRow({ C, colCount }) {
  return (
    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
      <td style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.border, flexShrink: 0 }} />
          <div style={{ height: 13, borderRadius: 6, background: C.border, width: 120, animation: "skeletonPulse 1.4s ease-in-out infinite" }} />
        </div>
      </td>
      {Array.from({ length: colCount - 2 }).map((_, i) => (
        <td key={i} style={{ padding: "14px 16px" }}>
          <div style={{ height: 13, borderRadius: 6, background: C.border, width: [80,180,60,70,70][i] || 70, animation: "skeletonPulse 1.4s ease-in-out infinite" }} />
        </td>
      ))}
      <td style={{ padding: "14px 16px" }} />
    </tr>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function ReceptionPaiements() {
  const [dark, setDark] = useState(() => localStorage.getItem("med-theme") === "dark");
  const C     = dark ? DARK : LIGHT;
  const width = useWindowWidth();

  const isMobile  = width <= 480;
  const isTablet  = width > 480 && width <= 768;
  const isDesktop = width > 768;

  const [payments, setPayments]     = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 });
  const [page, setPage]             = useState(1);
  const [stats, setStats]           = useState(null);

  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [saving, setSaving]     = useState(false);

  const [searchInput, setSearchInput]   = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("tous");
  const [filterMethod, setFilterMethod] = useState("tous");
  const [showReceipt, setShowReceipt]   = useState(null);
  const [editData, setEditData]         = useState(null);
  const [sortKey, setSortKey]           = useState("date");
  const [sortDir, setSortDir]           = useState("desc");

  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    const fn = e => setDark(e.detail);
    window.addEventListener("med-theme-change", fn);
    return () => window.removeEventListener("med-theme-change", fn);
  }, []);

  // Debounce the search box — only re-query the server 350ms after typing stops
  useEffect(() => {
    clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(searchTimeoutRef.current);
  }, [searchInput]);

  const fetchPayments = useCallback(() => {
    setLoading(true); setError(null);
    const params = new URLSearchParams({
      search:        debouncedSearch,
      statut:        filterStatus,
      mode_paiement: filterMethod,
      sortBy:        SORT_MAP[sortKey] || "date_paiement",
      sortDir:       sortDir.toUpperCase(),
      page:          String(page),
      limit:         String(PAGE_SIZE),
    });
    fetch(`${API}/paiements?${params}`)
      .then(r => { if (!r.ok) throw new Error(`Erreur ${r.status}`); return r.json(); })
      .then(j => {
        setPayments(j.data || []);
        setPagination(j.pagination || { total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 });
        setLoading(false);
      })
      .catch(e => { console.error(e); setError("Impossible de charger les paiements."); setLoading(false); });
  }, [debouncedSearch, filterStatus, filterMethod, sortKey, sortDir, page]);

  const fetchStats = useCallback(() => {
    fetch(`${API}/paiements/stats`)
      .then(r => { if (!r.ok) throw new Error(`Erreur ${r.status}`); return r.json(); })
      .then(j => setStats(j.data))
      .catch(e => console.error("Erreur stats:", e));
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  function handleFilterStatus(v) { setFilterStatus(v); setPage(1); }
  function handleFilterMethod(v) { setFilterMethod(v); setPage(1); }
  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
    setPage(1);
  }

  function handleSave(form) {
    setSaving(true);
    fetch(`${API}/paiements/${editData.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_consultation: editData.id_consultation,
        montant:         form.montant,
        mode_paiement:   form.mode_paiement,
        statut:          form.statut,
        date_paiement:   form.date,
      }),
    })
      .then(r => { if (!r.ok) throw new Error(`Erreur ${r.status}`); return r.json(); })
      .then(() => { fetchPayments(); fetchStats(); setEditData(null); setSaving(false); })
      .catch(e => { console.error(e); alert("Erreur lors de l'enregistrement."); setSaving(false); });
  }

  function handleDelete(id) {
    if (!window.confirm("Supprimer ce paiement ?")) return;
    fetch(`${API}/paiements/${id}`, { method: "DELETE" })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(() => { fetchPayments(); fetchStats(); })
      .catch(() => alert("Erreur lors de la suppression."));
  }

  const SortIcon = ({ col }) => (
    <span style={{ fontSize: 10, marginLeft: 4, opacity: sortKey === col ? 1 : 0.3 }}>
      {sortKey === col ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
    </span>
  );

  // Tablet shows fewer columns than desktop
  const tableCols = isDesktop
    ? ["patient","date","diagnostic","amount","method","status","actions"]
    : ["patient","date","amount","status","actions"];

  const colDefs = {
    patient:    { label:"Patient",    align:"left"  },
    date:       { label:"Date",       align:"left"  },
    diagnostic: { label:"Diagnostic", align:"left"  },
    amount:     { label:"Montant",    align:"right" },
    method:     { label:"Méthode",    align:"left"  },
    status:     { label:"Statut",     align:"left"  },
    actions:    { label:"",           align:"right" },
  };

  // patient/diagnostic have no sortable DB column on the backend (they come from a JOIN)
  const noSort  = new Set(["actions","diagnostic","patient"]);
  const outerPad = isMobile ? "16px" : isTablet ? "20px 24px" : "32px";

  const totalToday   = stats?.today?.total ?? 0;
  const todayCount    = stats?.today?.count ?? 0;
  const totalMonth   = stats?.month?.total ?? 0;
  const pendingCount = stats?.pending ?? 0;
  const consultationsThisMonth = stats?.consultationsThisMonth ?? 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes fadeUp   { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes modalIn  { from{opacity:0;transform:scale(.94) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes skeletonPulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        .pay-row { transition:background .12s; }
        .pay-row:hover { background:${C.slateLight} !important; }
        .pay-action-btn { opacity:0; transition:opacity .12s; }
        .pay-row:hover .pay-action-btn { opacity:1; }
        @media(hover:none){ .pay-action-btn{ opacity:1 !important; } }
      `}</style>

      <div style={{
        flex:1, background:C.bg, minHeight:"100vh",
        padding:outerPad, paddingBottom:"48px",
        fontFamily:"'Plus Jakarta Sans',sans-serif",
        color:C.text, boxSizing:"border-box",
        overflowY:"auto", transition:"background .3s",
      }}>

        {/* HEADER */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: isMobile?16:24, animation:"fadeUp .3s ease", flexWrap:"wrap", gap:10 }}>
          <div>
            <h1 style={{ margin:0, fontSize:isMobile?20:24, fontWeight:800, color:C.text, letterSpacing:"-0.5px" }}>
              💳 Paiements
            </h1>
            {!isMobile && <p style={{ margin:"3px 0 0", color:C.textSoft, fontSize:13 }}>Gestion des paiements et suivi financier</p>}
          </div>
          <button onClick={() => { fetchPayments(); fetchStats(); }} disabled={loading} title="Actualiser" style={{
            padding:"9px 13px", background:C.surface,
            border:`1px solid ${C.border}`, borderRadius:12,
            color:C.textSoft, fontSize:15, cursor:loading?"not-allowed":"pointer",
          }}>🔄</button>
        </div>

        {/* ERROR */}
        {error && (
          <div style={{ background:C.redLight, border:`1px solid ${C.red}`, borderRadius:12, padding:"11px 14px", marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, animation:"fadeUp .3s ease", flexWrap:"wrap" }}>
            <span style={{ color:C.red, fontWeight:600, fontSize:13 }}>⚠️ {error}</span>
            <button onClick={fetchPayments} style={{ background:C.red, color:"#fff", border:"none", borderRadius:8, padding:"5px 12px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Réessayer</button>
          </div>
        )}

        {/* STAT CARDS */}
        <div style={{ display:"flex", gap:12, marginBottom:isMobile?16:22, flexWrap:"wrap", animation:"fadeUp .35s ease" }}>
          <StatCard icon="💰" label="Recettes aujourd'hui" value={`${totalToday.toLocaleString()} DA`} sub={`${todayCount} paiement(s)`} accent={C.teal}    C={C} />
          <StatCard icon="📈" label="Total du mois"        value={`${totalMonth.toLocaleString()} DA`} sub="Paiements reçus"                accent={C.green}   C={C} />
          <StatCard icon="⏳" label="Impayés"              value={pendingCount}                        sub="En attente"                      accent={C.red}     C={C} />
          {!isMobile && <StatCard icon="🏥" label="Consultations" value={consultationsThisMonth} sub="Ce mois-ci" accent={C.tealMid} C={C} />}
        </div>

        {/* FILTERS */}
        <div style={{
          background:C.surface, borderRadius:14, border:`1px solid ${C.border}`,
          padding:isMobile?"12px 14px":"14px 18px", marginBottom:isMobile?14:18,
          display:"flex", flexDirection:isMobile?"column":"row",
          gap:10, flexWrap:"wrap", alignItems:isMobile?"stretch":"center",
          boxShadow:`0 2px 8px ${C.shadow}`, animation:"fadeUp .4s ease",
        }}>
          <div style={{ flex:1, minWidth:180, position:"relative" }}>
            <span style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", fontSize:13, color:C.textSoft }}>🔍</span>
            <input value={searchInput} onChange={e=>setSearchInput(e.target.value)}
              placeholder="Patient ou diagnostic…"
              style={{ ...inputStyle(C), paddingLeft:32 }} />
          </div>
          <div style={{ display:"flex", gap:6 }}>
            {[{value:"tous",label:"Tous"},{value:"paid",label:"✓ Payé"},{value:"pending",label:"✕ Impayé"}].map(s=>(
              <button key={s.value} onClick={()=>handleFilterStatus(s.value)} style={{
                flex:isMobile?1:"none", padding:"7px 12px", borderRadius:8,
                border:`1.5px solid ${filterStatus===s.value?C.teal:C.border}`,
                background:filterStatus===s.value?C.tealLight:"transparent",
                color:filterStatus===s.value?C.teal:C.textSoft,
                fontWeight:600, fontSize:12, cursor:"pointer",
                fontFamily:"'Plus Jakarta Sans',sans-serif", whiteSpace:"nowrap",
              }}>{s.label}</button>
            ))}
          </div>
          {!isMobile && (
            <select value={filterMethod} onChange={e=>handleFilterMethod(e.target.value)}
              style={{ ...inputStyle(C), width:"auto" }}>
              <option value="tous">Toutes méthodes</option>
              {["Espèces","Carte","CNAS","CASNOS","Mixte"].map(m=><option key={m}>{m}</option>)}
            </select>
          )}
        </div>

        {/* MOBILE — card list */}
        {isMobile && (
          <>
            <div style={{ display:"flex", flexDirection:"column", gap:10, animation:"fadeUp .45s ease" }}>
              {loading && Array.from({length:4}).map((_,i)=>(
                <div key={i} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, height:116, animation:"skeletonPulse 1.4s ease-in-out infinite" }} />
              ))}
              {!loading && payments.length===0 && (
                <div style={{ textAlign:"center", padding:"40px 0", color:C.textSoft }}>
                  <div style={{ fontSize:28, marginBottom:8 }}>🔍</div>
                  <div style={{ fontWeight:600 }}>Aucun paiement trouvé</div>
                </div>
              )}
              {!loading && payments.map(p=>(
                <PaymentCard key={p.id} p={p} C={C}
                  onEdit={setEditData} onReceipt={setShowReceipt} onDelete={handleDelete} />
              ))}
            </div>
            {!loading && <PaginationBar pagination={pagination} page={page} setPage={setPage} C={C} />}
          </>
        )}

        {/* TABLET + DESKTOP — table */}
        {!isMobile && (
          <div style={{ background:C.surface, borderRadius:16, border:`1px solid ${C.border}`, boxShadow:`0 2px 8px ${C.shadow}`, overflow:"hidden", animation:"fadeUp .45s ease" }}>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background:C.surfaceAlt, borderBottom:`1px solid ${C.border}` }}>
                    {tableCols.map(key=>(
                      <th key={key}
                        onClick={()=>!noSort.has(key)&&handleSort(key)}
                        style={{
                          padding:"12px 16px",
                          textAlign:colDefs[key].align,
                          fontWeight:700, fontSize:11, color:C.textSoft,
                          letterSpacing:"0.07em", textTransform:"uppercase",
                          cursor:noSort.has(key)?"default":"pointer",
                          whiteSpace:"nowrap", userSelect:"none",
                        }}>
                        {colDefs[key].label}
                        {!noSort.has(key) && <SortIcon col={key} />}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading && Array.from({length:5}).map((_,i)=>(
                    <SkeletonRow key={i} C={C} colCount={tableCols.length} />
                  ))}
                  {!loading && payments.length===0 && (
                    <tr><td colSpan={tableCols.length} style={{ padding:"48px 0", textAlign:"center", color:C.textSoft }}>
                      <div style={{ fontSize:28, marginBottom:8 }}>🔍</div>
                      <div style={{ fontWeight:600 }}>Aucun paiement trouvé</div>
                    </td></tr>
                  )}
                  {!loading && payments.map((p,i)=>(
                    <tr key={p.id} className="pay-row"
                      style={{ borderBottom: i<payments.length-1?`1px solid ${C.border}`:"none", background:"transparent" }}>
                      {tableCols.map(key=>{
                        switch(key){
                          case "patient": return (
                            <td key="patient" style={{ padding:"12px 16px" }}>
                              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                                <div style={{ width:32, height:32, borderRadius:"50%", background:`linear-gradient(135deg,${C.teal},${C.tealMid})`, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:800, fontSize:12, flexShrink:0 }}>
                                  {p.patient?.charAt(0)??"?"}
                                </div>
                                <span style={{ fontWeight:600, color:C.text }}>{p.patient??"—"}</span>
                              </div>
                            </td>
                          );
                          case "date": return (
                            <td key="date" style={{ padding:"12px 16px", color:C.textSoft, whiteSpace:"nowrap" }}>
                              {p.date?new Date(p.date).toLocaleDateString("fr-DZ",{day:"2-digit",month:"short",year:"numeric"}):"—"}
                            </td>
                          );
                          case "diagnostic": return (
                            <td key="diagnostic" style={{ padding:"12px 16px", maxWidth:200 }}>
                              <span style={{ display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:C.textSoft, fontSize:12 }} title={p.diagnostic??""}>
                                {p.diagnostic??<span style={{ opacity:.35, fontStyle:"italic" }}>—</span>}
                              </span>
                            </td>
                          );
                          case "amount": return (
                            <td key="amount" style={{ padding:"12px 16px", textAlign:"right" }}>
                              <span style={{ fontWeight:800, fontSize:14, color:p.statut==="pending"?C.red:C.text }}>{p.montant?.toLocaleString()??"—"}</span>
                              <span style={{ color:C.textSoft, fontSize:11, marginLeft:3 }}>DA</span>
                            </td>
                          );
                          case "method": return (
                            <td key="method" style={{ padding:"12px 16px" }}>
                              <span style={{ padding:"3px 9px", borderRadius:6, fontSize:12, fontWeight:600, background:C.slateLight, color:C.textSoft }}>{p.mode_paiement??"—"}</span>
                            </td>
                          );
                          case "status": return (
                            <td key="status" style={{ padding:"12px 16px" }}>
                              <StatusBadge statut={p.statut} C={C} />
                            </td>
                          );
                          case "actions": return (
                            <td key="actions" style={{ padding:"12px 16px" }}>
                              <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
                                <button className="pay-action-btn" onClick={()=>setShowReceipt(p)} style={{ background:C.tealLight, color:C.teal, border:"none", borderRadius:7, padding:"5px 9px", cursor:"pointer", fontSize:13 }}>🧾</button>
                                <button className="pay-action-btn" onClick={()=>setEditData(p)}    style={{ background:C.slateLight, color:C.textSoft, border:"none", borderRadius:7, padding:"5px 9px", cursor:"pointer", fontSize:13 }}>✏️</button>
                                <button className="pay-action-btn" onClick={()=>handleDelete(p.id)} style={{ background:C.redLight, color:C.red, border:"none", borderRadius:7, padding:"5px 9px", cursor:"pointer", fontSize:13 }}>🗑️</button>
                              </div>
                            </td>
                          );
                          default: return null;
                        }
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!loading && (
              <div style={{ borderTop:`1px solid ${C.border}`, background:C.surfaceAlt, padding:"0 14px" }}>
                <PaginationBar pagination={pagination} page={page} setPage={setPage} C={C} />
              </div>
            )}
          </div>
        )}
      </div>

      {editData && (
        <EditModal C={C} editData={editData} saving={saving}
          onClose={()=>{ if(!saving) setEditData(null); }}
          onSave={handleSave} />
      )}
      {showReceipt && (
        <ReceiptModal payment={showReceipt} C={C} onClose={()=>setShowReceipt(null)} />
      )}
    </>
  );
}