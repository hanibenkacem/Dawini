import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { API_BASE } from '../config/api';

const FREQUENCIES = [
  "1x/jour", "2x/jour", "3x/jour", "4x/jour",
  "Matin et soir", "Matin, midi et soir", "Si besoin", "Autre",
];
const DURATIONS = [
  "3 jours", "5 jours", "7 jours", "10 jours", "14 jours",
  "1 mois", "3 mois", "Traitement continu", "Autre",
];
const MEAL_RELATIONS = ["Avant le repas", "Pendant le repas", "Après le repas", "Sans rapport"];

// Pharmaceutical form of the medication — drives the unit word used in the
// generated posology line ("2 cp" vs "2 ml" vs "1 inj", etc.) instead of
// always assuming "cp" like before.
const MEDICATION_FORMS = [
  { value: "comprime", label: "Comprimé", icon: "💊", unit: "cp" },
  { value: "gelule", label: "Gélule", icon: "💊", unit: "gél" },
  { value: "sirop", label: "Sirop", icon: "🍯", unit: "ml" },
  { value: "injection", label: "Injection", icon: "💉", unit: "inj" },
  { value: "sachet", label: "Sachet", icon: "🧂", unit: "sachet" },
  { value: "gouttes", label: "Gouttes", icon: "💧", unit: "gttes" },
  { value: "pommade", label: "Pommade / Crème", icon: "🧴", unit: "application" },
  { value: "suppositoire", label: "Suppositoire", icon: "🔹", unit: "supp" },
];

const DOC_TYPES = [
  { value: "analyse", label: "Analyse biologique", icon: "🧪" },
  { value: "radio", label: "Radiologie / Imagerie", icon: "🩻" },
  { value: "compte_rendu", label: "Compte rendu", icon: "📋" },
  { value: "ordonnance_externe", label: "Ordonnance externe", icon: "💊" },
  { value: "autre", label: "Autre document", icon: "📎" },
];

// ─── Document Scanner Modal ────────────────────────────────────────────────────

const ScanModal = ({ onConfirm, onCancel, existingDocs }) => {
  const [files, setFiles] = useState([]);
  const [docType, setDocType] = useState("analyse");
  const [docLabel, setDocLabel] = useState("");
  const [dragging, setDragging] = useState(false);
  const [previewing, setPreviewing] = useState(null); // index to preview
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const acceptedTypes = "image/jpeg,image/png,image/webp,application/pdf";

  const addFiles = (incoming) => {
    const mapped = Array.from(incoming).map((file) => ({
      file,
      id: Math.random().toString(36).slice(2),
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      name: file.name,
      size: file.size,
      type: file.type,
    }));
    setFiles((prev) => [...prev, ...mapped]);
  };

  const handleFileInput = (e) => addFiles(e.target.files);
  const handleCameraInput = (e) => addFiles(e.target.files);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const removeFile = (id) => {
    setFiles((prev) => {
      const f = prev.find((f) => f.id === id);
      if (f?.previewUrl) URL.revokeObjectURL(f.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleConfirm = () => {
    if (files.length === 0) return;
    const selectedType = DOC_TYPES.find((d) => d.value === docType);
    const docs = files.map((f) => ({
      id: f.id,
      file: f.file,
      previewUrl: f.previewUrl,
      name: f.name,
      size: f.size,
      mimeType: f.type,
      docType,
      docTypeLabel: selectedType?.label,
      docTypeIcon: selectedType?.icon,
      label: docLabel.trim() || selectedType?.label,
      addedAt: new Date().toISOString(),
    }));
    onConfirm(docs);
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.55)",
      zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1rem",
    }}>
      <div style={{
        background: "white", borderRadius: 14,
        width: "100%", maxWidth: 520,
        maxHeight: "92vh", overflowY: "auto",
        boxShadow: "0 12px 48px rgba(0,0,0,0.22)",
      }}>
        {/* Header */}
        <div style={{
          padding: "1.25rem 1.5rem 1rem",
          borderBottom: "1px solid #f3f4f6",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <p style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
              Scanner / Importer
            </p>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "#111827", margin: "2px 0 0" }}>
              Documents du patient
            </h2>
          </div>
          <button onClick={onCancel} style={{
            background: "#f3f4f6", border: "none", borderRadius: 8,
            width: 32, height: 32, cursor: "pointer", fontSize: 16, color: "#6b7280",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>✕</button>
        </div>

        <div style={{ padding: "1.25rem 1.5rem" }}>
          {/* Document type */}
          <div style={{ marginBottom: "1.1rem" }}>
            <label style={labelStyle}>Type de document</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
              {DOC_TYPES.map((t) => (
                <button key={t.value} type="button"
                  onClick={() => setDocType(t.value)}
                  style={{
                    ...chipStyle(docType === t.value),
                    display: "flex", alignItems: "center", gap: 4,
                  }}
                >
                  <span>{t.icon}</span> {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Optional label */}
          <div style={{ marginBottom: "1.1rem" }}>
            <label style={labelStyle}>Description (optionnel)</label>
            <input
              placeholder="Ex: NFS du 24/04/2026, Echo abdominal..."
              value={docLabel}
              onChange={(e) => setDocLabel(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragging ? "#2563eb" : "#d1d5db"}`,
              borderRadius: 10,
              padding: "1.5rem",
              textAlign: "center",
              background: dragging ? "#eff6ff" : "#f9fafb",
              transition: "all 0.15s",
              marginBottom: "1rem",
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
            <p style={{ fontSize: 14, color: "#374151", fontWeight: 500, margin: "0 0 4px" }}>
              Glissez vos fichiers ici
            </p>
            <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 12px" }}>
              JPG, PNG, PDF · Max 20 Mo par fichier
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <button type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: "7px 14px", borderRadius: 7,
                  background: "#2563eb", color: "white",
                  border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                }}
              >
                📂 Choisir un fichier
              </button>
              <button type="button"
                onClick={() => cameraInputRef.current?.click()}
                style={{
                  padding: "7px 14px", borderRadius: 7,
                  background: "white", color: "#374151",
                  border: "1px solid #d1d5db", cursor: "pointer", fontSize: 13, fontWeight: 500,
                }}
              >
                📷 Appareil photo
              </button>
            </div>
          </div>

          <input ref={fileInputRef} type="file" multiple accept={acceptedTypes}
            onChange={handleFileInput} style={{ display: "none" }} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment"
            onChange={handleCameraInput} style={{ display: "none" }} />

          {/* File list */}
          {files.length > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              <p style={{ ...labelStyle, marginBottom: 8 }}>
                {files.length} fichier{files.length > 1 ? "s" : ""} sélectionné{files.length > 1 ? "s" : ""}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {files.map((f, i) => (
                  <div key={f.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    background: "#f9fafb", borderRadius: 8, padding: "8px 10px",
                    border: "1px solid #e5e7eb",
                  }}>
                    {/* Thumbnail */}
                    {f.previewUrl ? (
                      <img
                        src={f.previewUrl} alt={f.name}
                        onClick={() => setPreviewing(i)}
                        style={{
                          width: 44, height: 44, objectFit: "cover",
                          borderRadius: 6, cursor: "pointer", flexShrink: 0,
                          border: "1px solid #e5e7eb",
                        }}
                      />
                    ) : (
                      <div style={{
                        width: 44, height: 44, borderRadius: 6,
                        background: "#fee2e2", display: "flex",
                        alignItems: "center", justifyContent: "center",
                        fontSize: 22, flexShrink: 0,
                      }}>📄</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#111827",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {f.name}
                      </p>
                      <p style={{ margin: 0, fontSize: 11, color: "#6b7280" }}>
                        {formatSize(f.size)} · {f.type.includes("pdf") ? "PDF" : "Image"}
                      </p>
                    </div>
                    <button type="button" onClick={() => removeFile(f.id)}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "#ef4444", fontSize: 16, padding: "2px 4px", flexShrink: 0,
                      }}
                    >🗑</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Already saved docs count */}
          {existingDocs?.length > 0 && (
            <p style={{ fontSize: 12, color: "#6b7280", marginBottom: "1rem" }}>
              📎 {existingDocs.length} document{existingDocs.length > 1 ? "s" : ""} déjà joint{existingDocs.length > 1 ? "s" : ""} à cette consultation
            </p>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={onCancel} style={cancelBtnStyle}>
              Annuler
            </button>
            <button type="button" onClick={handleConfirm}
              disabled={files.length === 0}
              style={{ ...confirmBtnStyle, opacity: files.length === 0 ? 0.45 : 1 }}
            >
              Joindre {files.length > 0 ? `(${files.length})` : ""} à la consultation
            </button>
          </div>
        </div>
      </div>

      {/* Full-screen image preview */}
      {previewing !== null && files[previewing]?.previewUrl && (
        <div
          onClick={() => setPreviewing(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
            zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "zoom-out",
          }}
        >
          <img src={files[previewing].previewUrl}
            alt="aperçu"
            style={{ maxWidth: "92vw", maxHeight: "90vh", borderRadius: 10, boxShadow: "0 4px 32px rgba(0,0,0,0.5)" }}
          />
        </div>
      )}
    </div>
  );
};

// ─── Attached Docs Strip ───────────────────────────────────────────────────────

const AttachedDocs = ({ docs, onRemove }) => {
  const [lightbox, setLightbox] = useState(null);
  if (!docs || docs.length === 0) return null;

  return (
    <div style={{ marginTop: 10 }}>
      <p style={{ ...labelStyle, marginBottom: 6 }}>
        Documents joints ({docs.length})
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {docs.map((doc) => (
          <div key={doc.id} style={{
            position: "relative",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            overflow: "hidden",
            background: "#f9fafb",
            display: "flex", flexDirection: "column",
            width: 90,
          }}>
            {/* Thumbnail / icon */}
            {doc.previewUrl ? (
              <img
                src={doc.previewUrl} alt={doc.label}
                onClick={() => setLightbox(doc)}
                style={{ width: "100%", height: 66, objectFit: "cover", cursor: "zoom-in" }}
              />
            ) : (
              <div style={{
                height: 66, display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 28, background: "#fef3c7",
              }}>
                {doc.docTypeIcon || "📄"}
              </div>
            )}
            {/* Label */}
            <div style={{ padding: "4px 6px" }}>
              <p style={{
                margin: 0, fontSize: 10, fontWeight: 600, color: "#374151",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {doc.docTypeIcon} {doc.label}
              </p>
            </div>
            {/* Remove */}
            <button type="button" onClick={() => onRemove(doc.id)}
              style={{
                position: "absolute", top: 3, right: 3,
                background: "rgba(0,0,0,0.55)", color: "white",
                border: "none", borderRadius: "50%",
                width: 18, height: 18, cursor: "pointer",
                fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center",
                lineHeight: 1,
              }}
            >✕</button>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox?.previewUrl && (
        <div onClick={() => setLightbox(null)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
          zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "zoom-out",
        }}>
          <img src={lightbox.previewUrl} alt={lightbox.label}
            style={{ maxWidth: "92vw", maxHeight: "90vh", borderRadius: 10 }} />
        </div>
      )}
    </div>
  );
};

// ─── Dosage Modal ──────────────────────────────────────────────────────────────

const DosageModal = ({ med, onConfirm, onCancel }) => {
  const [manualName, setManualName] = useState(med.NOM_DE_MARQUE || "");
  const [manualDCI, setManualDCI] = useState(med.DENOMINATION_COMMUNE_INTERNATIONALE || "");
  const [manualDosage, setManualDosage] = useState(med.DOSAGE || "");
  const [dosage, setDosage] = useState({
    form: MEDICATION_FORMS[0].value,
    quantity: "1", frequency: FREQUENCIES[0], customFrequency: "",
    duration: DURATIONS[2], customDuration: "",
    mealRelation: MEAL_RELATIONS[3], note: "",
  });

  const handleChange = (field, value) => setDosage((prev) => ({ ...prev, [field]: value }));

  const selectedForm = MEDICATION_FORMS.find((f) => f.value === dosage.form) || MEDICATION_FORMS[0];

  const handleConfirm = () => {
    const freq = dosage.frequency === "Autre" ? dosage.customFrequency : dosage.frequency;
    const dur = dosage.duration === "Autre" ? dosage.customDuration : dosage.duration;
    const name = med.manual ? manualName : med.NOM_DE_MARQUE;
    const dci = med.manual ? manualDCI : med.DENOMINATION_COMMUNE_INTERNATIONALE;
    const dos = med.manual ? manualDosage : med.DOSAGE;

    let line = name;
    if (dci) line += ` (${dci})`;
    if (dos) line += ` ${dos}`;
    line += ` — ${dosage.quantity} ${selectedForm.unit}, ${freq}, ${dur}`;
    if (dosage.mealRelation !== MEAL_RELATIONS[3]) line += `, ${dosage.mealRelation.toLowerCase()}`;
    if (dosage.note.trim()) line += `. ${dosage.note.trim()}`;
    onConfirm(line);
  };

  const displayName = med.manual ? manualName || "Nouveau médicament" : med.NOM_DE_MARQUE;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: "white", borderRadius: 12, padding: "1.5rem",
        width: "100%", maxWidth: 440, maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
        <p style={{ fontSize: 11, color: "#6b7280", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Posologie
        </p>
        {med.manual ? (
          <div style={{ marginBottom: "1.25rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              <div>
                <label style={labelStyle}>Nom commercial *</label>
                <input autoFocus placeholder="Ex: Augmentin" value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  style={{ ...inputStyle, borderColor: manualName ? "#d1d5db" : "#f87171" }} />
              </div>
              <div>
                <label style={labelStyle}>DCI</label>
                <input placeholder="Ex: Amoxicilline" value={manualDCI}
                  onChange={(e) => setManualDCI(e.target.value)} style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Dosage</label>
              <input placeholder="Ex: 1g, 500mg…" value={manualDosage}
                onChange={(e) => setManualDosage(e.target.value)} style={inputStyle} />
            </div>
          </div>
        ) : (
          <p style={{ fontWeight: 600, fontSize: 16, marginBottom: "1.25rem", color: "#111827" }}>
            {med.NOM_DE_MARQUE}{" "}
            <span style={{ fontWeight: 400, color: "#6b7280", fontSize: 13 }}>
              ({med.DENOMINATION_COMMUNE_INTERNATIONALE}{med.DOSAGE ? ` · ${med.DOSAGE}` : ""})
            </span>
          </p>
        )}

        {/* Forme pharmaceutique */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Forme</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            {MEDICATION_FORMS.map((f) => (
              <button key={f.value} type="button" onClick={() => handleChange("form", f.value)}
                style={{ ...chipStyle(dosage.form === f.value), display: "flex", alignItems: "center", gap: 4 }}>
                <span>{f.icon}</span> {f.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Quantité ({selectedForm.unit})</label>
            <input type="number" min="0.5" step="0.5" value={dosage.quantity}
              onChange={(e) => handleChange("quantity", e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Par rapport au repas</label>
            <select value={dosage.mealRelation}
              onChange={(e) => handleChange("mealRelation", e.target.value)} style={inputStyle}>
              {MEAL_RELATIONS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Fréquence</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            {FREQUENCIES.map((f) => (
              <button key={f} type="button" onClick={() => handleChange("frequency", f)}
                style={chipStyle(dosage.frequency === f)}>{f}</button>
            ))}
          </div>
          {dosage.frequency === "Autre" && (
            <input placeholder="Ex: 1 cp toutes les 8h" value={dosage.customFrequency}
              onChange={(e) => handleChange("customFrequency", e.target.value)}
              style={{ ...inputStyle, marginTop: 8 }} />
          )}
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Durée</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            {DURATIONS.map((d) => (
              <button key={d} type="button" onClick={() => handleChange("duration", d)}
                style={chipStyle(dosage.duration === d)}>{d}</button>
            ))}
          </div>
          {dosage.duration === "Autre" && (
            <input placeholder="Ex: 6 semaines" value={dosage.customDuration}
              onChange={(e) => handleChange("customDuration", e.target.value)}
              style={{ ...inputStyle, marginTop: 8 }} />
          )}
        </div>

        <div style={{ marginBottom: "1.25rem" }}>
          <label style={labelStyle}>Note (optionnel)</label>
          <input placeholder="Ex: Avaler avec un grand verre d'eau" value={dosage.note}
            onChange={(e) => handleChange("note", e.target.value)} style={inputStyle} />
        </div>

        <div style={{
          background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8,
          padding: "10px 12px", marginBottom: "1.25rem",
          fontSize: 13, color: "#0c4a6e", fontFamily: "monospace",
        }}>
          {displayName} — {dosage.quantity} {selectedForm.unit},{" "}
          {dosage.frequency === "Autre" ? dosage.customFrequency || "..." : dosage.frequency},{" "}
          {dosage.duration === "Autre" ? dosage.customDuration || "..." : dosage.duration}
          {dosage.mealRelation !== MEAL_RELATIONS[3] && `, ${dosage.mealRelation.toLowerCase()}`}
          {dosage.note && `. ${dosage.note}`}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={onCancel} style={cancelBtnStyle}>Annuler</button>
          <button type="button" onClick={handleConfirm}
            style={{ ...confirmBtnStyle, opacity: med.manual && !manualName ? 0.5 : 1 }}
            disabled={med.manual && !manualName}>
            Ajouter à l'ordonnance
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Certificate Dates Modal ────────────────────────────────────────────────────

const CERT_CONFIG = {
  maladie:       { title: "Certificat de maladie",    needsRange: true,  needsArretType: false },
  arret_travail: { title: "Arrêt de travail",          needsRange: true,  needsArretType: true  },
  bonne_sante:   { title: "Certificat de bonne santé", needsRange: false, needsArretType: false },
  mariage:       { title: "Certificat de mariage",     needsRange: false, needsArretType: false },
};

const CertificateDatesModal = ({ docType, onConfirm, onCancel }) => {
  const today = new Date().toISOString().slice(0, 10);
  const [dateDebut, setDateDebut] = useState(today);
  const [dateFin, setDateFin] = useState(today);
  const [type, setType] = useState("premier"); // only relevant for arret_travail
  const [motif, setMotif] = useState("");

  const config = CERT_CONFIG[docType] || CERT_CONFIG.maladie;

  const invalid = config.needsRange
    ? !dateDebut || !dateFin || new Date(dateFin) < new Date(dateDebut)
    : !dateDebut;

  const nbJours = config.needsRange && !invalid
    ? Math.round((new Date(dateFin) - new Date(dateDebut)) / 86400000) + 1
    : null;

  const handleConfirm = () => {
    if (invalid) return;
    if (config.needsRange) {
      onConfirm({ dateDebut, dateFin, type, motif: motif.trim() });
    } else {
      onConfirm({ date: dateDebut, motif: motif.trim() });
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: "white", borderRadius: 12, padding: "1.5rem",
        width: "100%", maxWidth: 400, boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
        <p style={{ fontSize: 11, color: "#6b7280", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {config.title}
        </p>
        <p style={{ fontWeight: 600, fontSize: 15, marginBottom: "1rem", color: "#111827" }}>
          {config.needsRange ? "Période concernée" : "Date de l'examen"}
        </p>

        {config.needsArretType && (
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button type="button" onClick={() => setType("premier")} style={chipStyle(type === "premier")}>
              Premier arrêt
            </button>
            <button type="button" onClick={() => setType("prolongation")} style={chipStyle(type === "prolongation")}>
              Prolongation
            </button>
          </div>
        )}

        {config.needsRange ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Date de début</label>
              <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Date de fin</label>
              <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} style={inputStyle} />
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Date</label>
            <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} style={inputStyle} />
          </div>
        )}

        {nbJours && (
          <p style={{ fontSize: 12, color: "#0c4a6e", background: "#f0f9ff", border: "1px solid #bae6fd",
            borderRadius: 8, padding: "6px 10px", marginBottom: 12 }}>
            Durée : {nbJours} jour{nbJours > 1 ? "s" : ""}
          </p>
        )}
        {config.needsRange && invalid && dateDebut && dateFin && (
          <p style={{ fontSize: 12, color: "#dc2626", marginBottom: 12 }}>
            La date de fin doit être après la date de début.
          </p>
        )}

        <div style={{ marginBottom: "1.25rem" }}>
          <label style={labelStyle}>Motif (optionnel — n'apparaît que si rempli)</label>
          <input placeholder="Ex: syndrome grippal" value={motif}
            onChange={(e) => setMotif(e.target.value)} style={inputStyle} />
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={onCancel} style={cancelBtnStyle}>Annuler</button>
          <button type="button" onClick={handleConfirm}
            disabled={invalid}
            style={{ ...confirmBtnStyle, opacity: invalid ? 0.5 : 1 }}>
            Générer l'aperçu
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Shared styles ─────────────────────────────────────────────────────────────

const labelStyle = {
  display: "block", fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 4,
};
const inputStyle = {
  width: "100%", border: "1px solid #d1d5db", borderRadius: 6,
  padding: "7px 10px", fontSize: 13, outline: "none", boxSizing: "border-box",
};
const chipStyle = (active) => ({
  padding: "4px 10px", borderRadius: 20, fontSize: 12, cursor: "pointer",
  border: active ? "1.5px solid #2563eb" : "1px solid #d1d5db",
  background: active ? "#eff6ff" : "white",
  color: active ? "#1d4ed8" : "#374151",
  fontWeight: active ? 600 : 400, transition: "all 0.1s",
});
const cancelBtnStyle = {
  flex: 1, padding: "9px", borderRadius: 8, border: "1px solid #d1d5db",
  background: "white", cursor: "pointer", fontSize: 14, color: "#374151",
};
const confirmBtnStyle = {
  flex: 2, padding: "9px", borderRadius: 8, border: "none",
  background: "#2563eb", color: "white", cursor: "pointer", fontSize: 14, fontWeight: 600,
};

// ─── Main Form ─────────────────────────────────────────────────────────────────

const ConsultationForm = ({ form, onChange, onSubmit, onOpenPreview, submitting, setForm }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [pendingMed, setPendingMed] = useState(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const [attachedDocs, setAttachedDocs] = useState([]);
  const [pendingCert, setPendingCert] = useState(null); // "maladie" | "arret_travail" | "bonne_sante" | "mariage" | null

  const timeoutRef = useRef(null);

  useEffect(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      if (!query.trim()) { setResults([]); setShowDropdown(false); return; }
      try {
        const res = await axios.get(`${API_BASE}/medicaments/search?q=${query}`);
        setResults(res.data);
        setShowDropdown(true);
      } catch {
        setShowDropdown(true);
      }
    }, 300);
    return () => clearTimeout(timeoutRef.current);
  }, [query]);

  const handleSelect = (med) => {
    setQuery(""); setResults([]); setShowDropdown(false);
    setPendingMed(med);
  };

  const handleDosageConfirm = (line) => {
    setForm((prev) => ({
      ...prev,
      medicaments: prev.medicaments ? prev.medicaments + "\n" + line : line,
    }));
    setPendingMed(null);
  };

  const handleScanConfirm = (docs) => {
    setAttachedDocs((prev) => [...prev, ...docs]);
    setShowScanModal(false);
  };

  const handleRemoveDoc = (id) => {
    setAttachedDocs((prev) => {
      const doc = prev.find((d) => d.id === id);
      if (doc?.previewUrl) URL.revokeObjectURL(doc.previewUrl);
      return prev.filter((d) => d.id !== id);
    });
  };

  const handleCertConfirm = (certData) => {
    onOpenPreview(pendingCert, certData);
    setPendingCert(null);
  };

  const handleSubmit = (e) => {
    onSubmit(e, attachedDocs);
  };

  return (
    <>
      {pendingMed && (
        <DosageModal med={pendingMed} onConfirm={handleDosageConfirm} onCancel={() => setPendingMed(null)} />
      )}
      {showScanModal && (
        <ScanModal
          existingDocs={attachedDocs}
          onConfirm={handleScanConfirm}
          onCancel={() => setShowScanModal(false)}
        />
      )}
      {pendingCert && (
        <CertificateDatesModal
          docType={pendingCert}
          onConfirm={handleCertConfirm}
          onCancel={() => setPendingCert(null)}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Diagnostic *
          </label>
          <textarea
            name="diagnostic"
            rows={2}
            value={form.diagnostic}
            onChange={onChange}
            required
            className="med-input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Notes cliniques
          </label>
          <textarea name="notes" rows={2} value={form.notes} onChange={onChange}
            className="med-input" />
        </div>

        {/* ── Documents Section ── */}
        <div className="border border-gray-200 dark:border-gray-600 rounded-[10px] px-4 py-3.5 bg-gray-50 dark:bg-gray-800/60">
          <div className="flex items-center justify-between mb-1">
            <div>
              <span className="text-[13px] font-semibold text-gray-700 dark:text-gray-100">
                📎 Documents joints
              </span>
              {attachedDocs.length > 0 && (
                <span className="ml-2 bg-blue-600 text-white rounded-full text-[11px] font-bold px-[7px] py-[1px]">
                  {attachedDocs.length}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowScanModal(true)}
              className="flex items-center gap-1.5 bg-white dark:bg-gray-700 border-[1.5px] border-blue-600 dark:border-blue-400 rounded-lg text-blue-600 dark:text-blue-300 cursor-pointer text-[13px] font-semibold px-3 py-1.5 transition-colors hover:bg-blue-50 dark:hover:bg-gray-600"
            >
              <span style={{ fontSize: 16 }}>📷</span>
              Scanner / Importer
            </button>
          </div>

          {attachedDocs.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-400 mt-1.5 mb-0">
              Analyses, radios, comptes rendus… — cliquez sur le bouton pour ajouter
            </p>
          ) : (
            <AttachedDocs docs={attachedDocs} onRemove={handleRemoveDoc} />
          )}
        </div>

        {/* ── Ordonnance ── */}
        <div className="relative">
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Ordonnance
            </label>
            <div className="flex items-center gap-3 flex-wrap justify-end">
              <button type="button" onClick={() => setPendingCert("maladie")}
                className="text-xs text-orange-600 dark:text-orange-400 font-semibold hover:underline">
                🤒 Certificat de maladie
              </button>
              <button type="button" onClick={() => setPendingCert("arret_travail")}
                className="text-xs text-rose-600 dark:text-rose-400 font-semibold hover:underline">
                🛌 Arrêt de travail
              </button>
              <button type="button" onClick={() => setPendingCert("bonne_sante")}
                className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">
                ✅ Certificat de bonne santé
              </button>
              <button type="button" onClick={() => setPendingCert("mariage")}
                className="text-xs text-pink-600 dark:text-pink-400 font-semibold hover:underline">
                💍 Certificat de mariage
              </button>
              <button type="button" onClick={() => onOpenPreview("ordonnance")}
                className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                👁️ Aperçu impression
              </button>
            </div>
          </div>

          {/* Search input gets its own relative wrapper so the dropdown
              anchors directly under it, not under the textarea below */}
          <div className="relative">
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un médicament..."
              className="med-input" />

            {showDropdown && (results.length > 0 || query.trim()) && (
              <div className="absolute z-50 top-full left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 w-full mt-1 rounded-md shadow-2xl max-h-48 overflow-y-auto">
                {results.map((med) => (
                  <div key={med.id} onClick={() => handleSelect(med)}
                    className="px-3 py-3 hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer text-sm border-b border-gray-100 dark:border-gray-700 last:border-none text-gray-900 dark:text-gray-100">
                    <span className="font-bold">{med.NOM_DE_MARQUE} ({med.DENOMINATION_COMMUNE_INTERNATIONALE})</span>
                    <span className="text-gray-500 dark:text-gray-400 ml-2">{med.dosage || med.DOSAGE}</span>
                  </div>
                ))}
                <div onClick={() => handleSelect({ manual: true, NOM_DE_MARQUE: query, DENOMINATION_COMMUNE_INTERNATIONALE: "", DOSAGE: "" })}
                  className="px-3 py-3 hover:bg-orange-50 dark:hover:bg-gray-700 cursor-pointer text-sm flex items-center gap-2"
                  style={{ borderTop: results.length > 0 ? "1px dashed #e5e7eb" : "none" }}>
                  <span style={{ fontSize: 16 }}>✏️</span>
                  <span>
                    <span className="font-semibold text-orange-700 dark:text-orange-400">Ajouter manuellement</span>
                    {query && <span className="text-gray-500 dark:text-gray-400"> — "{query}"</span>}
                  </span>
                </div>
              </div>
            )}
          </div>

          <textarea name="medicaments" rows={5} value={form.medicaments} onChange={onChange}
            placeholder="Médicaments et posologie..."
            className="med-input mt-2"/>
        </div>

        <button type="submit" disabled={submitting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50">
          {submitting ? "Enregistrement..." : "Valider la Consultation"}
        </button>
      </form>
    </>
  );
};

export default ConsultationForm;