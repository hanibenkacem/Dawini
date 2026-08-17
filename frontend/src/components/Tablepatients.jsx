import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../config/api";

const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

const labelStyle = {
  display: "block", fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 4,
};
const inputStyle = {
  width: "100%", border: "1px solid #d1d5db", borderRadius: 6,
  padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box",
};

// Self-contained so it doesn't depend on ModalPatient's internals (which are
// used for creation) — same field set as InsertPatient/UpdatePatient on the
// backend, prefilled from the row being edited.
function EditPatientModal({ patient, onClose, onSaved }) {
  const [form, setForm] = useState({
    nom: patient.nom || "",
    prenom: patient.prenom || "",
    date_naissance: patient.date_naissance ? patient.date_naissance.slice(0, 10) : "",
    sexe: patient.sexe || "M",
    telephone: patient.telephone || "",
    adresse: patient.adresse || "",
    maladies_chroniques: patient.maladies_chroniques || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!form.nom.trim() || !form.prenom.trim()) {
      setError("Nom et prénom sont obligatoires.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await axios.put(`${API_BASE}/patient/edit/${patient.id}`, form, { headers: auth() });
      onSaved();
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || "Erreur lors de la mise à jour du patient.");
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
    }}>
      <div style={{
        background: "white", borderRadius: 12, padding: "1.5rem",
        width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
      }}>
        <p style={{ fontSize: 11, color: "#6b7280", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Modifier le patient
        </p>
        <p style={{ fontWeight: 700, fontSize: 16, marginBottom: "1rem", color: "#111827" }}>
          #{patient.id} — {patient.nom} {patient.prenom}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={labelStyle}>Nom *</label>
            <input value={form.nom} onChange={(e) => handleChange("nom", e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Prénom *</label>
            <input value={form.prenom} onChange={(e) => handleChange("prenom", e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={labelStyle}>Date de naissance</label>
            <input type="date" value={form.date_naissance}
              onChange={(e) => handleChange("date_naissance", e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Sexe</label>
            <select value={form.sexe} onChange={(e) => handleChange("sexe", e.target.value)} style={inputStyle}>
              <option value="M">Masculin</option>
              <option value="F">Féminin</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>Téléphone</label>
          <input value={form.telephone} onChange={(e) => handleChange("telephone", e.target.value)} style={inputStyle} />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>Adresse</label>
          <input value={form.adresse} onChange={(e) => handleChange("adresse", e.target.value)} style={inputStyle} />
        </div>

        <div style={{ marginBottom: "1.25rem" }}>
          <label style={labelStyle}>Maladies chroniques</label>
          <input value={form.maladies_chroniques}
            onChange={(e) => handleChange("maladies_chroniques", e.target.value)} style={inputStyle} />
        </div>

        {error && (
          <div style={{
            background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8,
            padding: "8px 12px", fontSize: 13, color: "#dc2626", marginBottom: 14,
          }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={onClose}
            style={{ flex: 1, padding: "9px", borderRadius: 8, border: "1px solid #d1d5db", background: "white", cursor: "pointer", fontSize: 14, color: "#374151" }}>
            Annuler
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            style={{
              flex: 2, padding: "9px", borderRadius: 8, border: "none",
              background: "#2563eb", color: "white", cursor: saving ? "not-allowed" : "pointer",
              fontSize: 14, fontWeight: 600, opacity: saving ? 0.7 : 1,
            }}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TablePatients({
  patients,
  isDark,
  themeColors,
  canEdit = false,
  canDelete = false,
  onDeletePatient,
  onPatientUpdated,
}) {
  const navigate = useNavigate();
  const [editingPatient, setEditingPatient] = useState(null);

  // Fallback defaults if themeColors isn't passed for some reason
  const C = themeColors || {
    surface: "#FFFFFF",
    border: "#E2E8F0",
    text: "#0F2942",
    textSoft: "#64748B",
    teal: "#0E7490",
    shadow: "rgba(15,41,66,0.07)",
  };

  // Extra context colors specifically for rows and headers
  const headerBg = isDark ? "#1E2B3E" : "#F8FAFC";
  const rowHoverBg = isDark ? "#1A2539" : "#F1F5F9";

  if (!patients || patients.length === 0) {
    return (
      <div
        style={{
          background: C.surface,
          borderRadius: "12px",
          padding: "32px",
          textAlign: "center",
          color: C.textSoft,
          fontSize: "15px",
          fontWeight: 500,
          border: `1px dashed ${C.border}`,
        }}
      >
        Aucun patient trouvé.
      </div>
    );
  }

  return (
    <>
      {/* Dynamic CSS Injection for Hover Rules inside the React loop */}
      <style>{`
        .patient-row {
          transition: background 0.15s ease-in-out;
        }
        .patient-row:hover {
          background: ${rowHoverBg} !important;
        }
      `}</style>

      {editingPatient && (
        <EditPatientModal
          patient={editingPatient}
          onClose={() => setEditingPatient(null)}
          onSaved={() => onPatientUpdated?.()}
        />
      )}

      <div
        style={{
          overflowX: "auto",
          background: C.surface,
          borderRadius: "12px",
          transition: "background 0.3s ease",
        }}
      >
        <table
          style={{
            minWidth: "100%",
            borderCollapse: "collapse",
            textAlign: "left",
          }}
        >
          <thead>
            <tr
              style={{
                background: headerBg,
                borderBottom: `1px solid ${C.border}`,
                transition: "background 0.3s ease, border-color 0.3s ease",
              }}
            >
              <th style={{ padding: "14px 24px", fontSize: "11px", fontWeight: 700, color: C.textSoft, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                ID Patient
              </th>
              <th style={{ padding: "14px 24px", fontSize: "11px", fontWeight: 700, color: C.textSoft, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Nom Prénom
              </th>
              <th style={{ padding: "14px 24px", fontSize: "11px", fontWeight: 700, color: C.textSoft, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Dernière visite
              </th>
              <th style={{ padding: "14px 24px", fontSize: "11px", fontWeight: 700, color: C.textSoft, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Action
              </th>
            </tr>
          </thead>

          <tbody style={{ color: C.text }}>
            {patients.map((patient) => (
              <tr
                key={patient.id}
                className="patient-row"
                style={{
                  borderBottom: `1px solid ${C.border}`,
                  transition: "border-color 0.3s ease",
                }}
              >
                {/* ID Column */}
                <td style={{ padding: "16px 24px", fontSize: "14px", fontWeight: 600, color: C.text }}>
                  #{patient.id}
                </td>

                {/* Patient Name Column */}
                <td style={{ padding: "16px 24px", fontSize: "14px", fontWeight: 500, color: C.text }}>
                  {patient.nom} {patient.prenom}
                </td>

                {/* Last Visit Column */}
                <td style={{ padding: "16px 24px", fontSize: "14px", color: C.textSoft }}>
                  {patient.last_visit 
                    ? patient.last_visit.replace("T", " ").slice(0, 16) 
                    : "Aucune"}
                </td>

                {/* Action CTA Button Column */}
                <td style={{ padding: "16px 24px" }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      onClick={() => navigate(`/patient/${patient.id}`)}
                      style={{
                        background: isDark ? "#1E2B3E" : "#EFF6FF",
                        color: isDark ? "#38BDF8" : "#2563EB",
                        fontSize: "13px",
                        fontWeight: 600,
                        padding: "8px 16px",
                        borderRadius: "8px",
                        border: "none",
                        cursor: "pointer",
                        transition: "opacity 0.15s ease, transform 0.1s ease",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                    >
                      Accéder au dossier
                    </button>

                    {canEdit && (
                      <button
                        onClick={() => setEditingPatient(patient)}
                        style={{
                          background: isDark ? "#1E2B3E" : "#FFF7ED",
                          color: isDark ? "#FDBA74" : "#C2410C",
                          fontSize: "13px",
                          fontWeight: 600,
                          padding: "8px 16px",
                          borderRadius: "8px",
                          border: "none",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                      >
                        ✏️ Modifier
                      </button>
                    )}

                    {canDelete && (
                      <button
                        onClick={() => onDeletePatient?.(patient.id, `${patient.nom} ${patient.prenom}`)}
                        style={{
                          background: isDark ? "#2E1A1F" : "#FEF2F2",
                          color: isDark ? "#FCA5A5" : "#DC2626",
                          fontSize: "13px",
                          fontWeight: 600,
                          padding: "8px 16px",
                          borderRadius: "8px",
                          border: "none",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                      >
                        🗑 Supprimer
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}