import { useRef, useState } from "react";
import { API_BASE } from "../config/api";
const TITLES = {
  ordonnance:    "ORDONNANCE MÉDICALE",
  maladie:       "CERTIFICAT MÉDICAL",
  arret_travail: "CERTIFICAT D'ARRÊT DE TRAVAIL",
  bonne_sante:   "CERTIFICAT DE BONNE SANTÉ",
  mariage:       "CERTIFICAT MÉDICAL PRÉNUPTIAL",
};

const PRINT_LABELS = {
  ordonnance:    "Ordonnance",
  maladie:       "Certificat médical",
  arret_travail: "Arrêt de travail",
  bonne_sante:   "Certificat de bonne santé",
  mariage:       "Certificat de mariage",
};

const fmtLong = (d) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "___________";

// Each medicaments line is built by ConsultationForm as:
//   "Nom (DCI) dosage — quantité unité, fréquence, durée[, relation repas][. note]"
// Split on the em-dash separator so the drug name can be shown bold/prominent
// and the posology shown smaller/muted underneath, instead of one flat run-on
// line. Falls back gracefully to plain text if a line doesn't match the
// pattern (e.g. something typed by hand without the separator).
const parseMedLine = (line) => {
  const sepIdx = line.indexOf(" — ");
  if (sepIdx === -1) return { name: line.trim(), posology: "" };
  return {
    name: line.slice(0, sepIdx).trim(),
    posology: line.slice(sepIdx + 3).trim(),
  };
};

// The A5 page has fixed physical space, so a long medication list needs to
// shrink to keep fitting cleanly instead of spilling onto a near-empty
// second page. Three tiers, chosen by how many drugs are on the prescription.
const MED_LIST_SCALES = {
  normal:  { nameSize: "11pt", posoSize: "9.5pt", badge: 22, badgeFont: "9pt",   rowGap: "10px", rowPad: "10px" },
  compact: { nameSize: "10pt", posoSize: "8.5pt", badge: 19, badgeFont: "8pt",   rowGap: "7px",  rowPad: "7px"  },
  tight:   { nameSize: "9pt",  posoSize: "7.5pt", badge: 16, badgeFont: "7pt",   rowGap: "5px",  rowPad: "5px"  },
};
const scaleForCount = (count) => (count > 10 ? "tight" : count > 6 ? "compact" : "normal");

const OrdonnanceModal = ({ show, onClose, doctorSettings, medicaments, patient, docType = "ordonnance", certificate }) => {
  const previewRef = useRef(null);
  const [toast, setToast] = useState(null); // { type: 'success' | 'error' | 'info', message }
  const [printing, setPrinting] = useState(false);

  if (!show || !doctorSettings || !patient) return null;
  
const data = {
  nom_fr:     doctorSettings.nom_medecin?.split(" ")[0] || "",
  prenom_fr:  doctorSettings.nom_medecin?.split(" ").slice(1).join(" ") || "",
  nom_ar:     doctorSettings.nom_medecin_ar || "",
  specialite: doctorSettings.specialite || "",
  adresse:    doctorSettings.adresse || "",
  telephone:  doctorSettings.telephone || "",
  logo:       doctorSettings.logo       ? `${API_BASE}/uploads/${doctorSettings.logo}`       : null,
  background: doctorSettings.background ? `${API_BASE}/uploads/${doctorSettings.background}` : null,
};

  const patientData = {
    nom_fr:    patient.nom,
    prenom_fr: patient.prenom,
    nom_ar:    patient.nom_ar    || "",
    prenom_ar: patient.prenom_ar || "",
    age:  Math.floor((new Date() - new Date(patient.date_naissance)) / (1000 * 60 * 60 * 24 * 365.25)),
    date: new Date().toLocaleDateString("fr-FR"),
  };

  const cert    = certificate || {};
  const nbJours =
    cert.dateDebut && cert.dateFin
      ? Math.round((new Date(cert.dateFin) - new Date(cert.dateDebut)) / 86400000) + 1
      : null;

  const showToast = (type, message, duration = 4000) => {
    setToast({ type, message });
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => setToast(null), duration);
  };

  const handlePrint = async () => {
    const content = previewRef.current;
    if (!content) return;

    // Build a complete self-contained HTML document from the preview's innerHTML
    const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8"/>
    <title>${PRINT_LABELS[docType]} - ${patient.prenom} ${patient.nom}</title>
    <style>
      @page { size: A5; margin: 0; }
      html, body { margin: 0; padding: 0; background: white; }
      body {
        width: 496px;
        padding: 16px 20px;
        box-sizing: border-box;
        font-family: 'Times New Roman', Times, serif;
        font-size: 11pt;
        line-height: 1.35;
      }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    </style>
  </head>
  <body>${content.innerHTML}</body>
</html>`;

    // Use Electron's hidden-window print (most reliable, no popup).
    // Falls back to Save-as-PDF inside main.js if no printer is available.
    if (window.electronPrint?.printHtml) {
      setPrinting(true);
      try {
        const result = await window.electronPrint.printHtml(html);

        if (result?.success && result.method === "printer") {
          showToast("success", "Document envoyé à l'imprimante.");
        } else if (result?.success && result.method === "pdf") {
          showToast("success", "Aucune imprimante détectée — PDF enregistré avec succès.");
        } else if (result?.method === "pdf-cancelled") {
          showToast("info", "Enregistrement annulé.");
        } else {
          showToast("error", "Impossible d'imprimer ou d'enregistrer le document.");
        }
      } catch (err) {
        console.error("[print] error:", err);
        showToast("error", "Erreur lors de l'impression.");
      } finally {
        setPrinting(false);
      }
    } else {
      // Fallback for browser dev mode (no Electron bridge available)
      const w = window.open('', '_blank');
      if (w) { w.document.write(html); w.document.close(); w.print(); }
      else showToast("error", "Impossible d'ouvrir la fenêtre d'impression.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">

        {/* Toast */}
        {toast && (
          <div
            style={{
              position: "absolute",
              top: 16,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 50,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
              maxWidth: "90%",
              background:
                toast.type === "success" ? "#ecfdf5" :
                toast.type === "error"   ? "#fef2f2" : "#eff6ff",
              color:
                toast.type === "success" ? "#065f46" :
                toast.type === "error"   ? "#991b1b" : "#1e40af",
              border: `1px solid ${
                toast.type === "success" ? "#a7f3d0" :
                toast.type === "error"   ? "#fecaca" : "#bfdbfe"
              }`,
            }}
          >
            <span style={{ fontSize: 16 }}>
              {toast.type === "success" ? "✅" : toast.type === "error" ? "⚠️" : "ℹ️"}
            </span>
            {toast.message}
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b bg-white">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Aperçu {PRINT_LABELS[docType]}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {patientData.prenom_fr} {patientData.nom_fr} — {patientData.date}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              disabled={printing}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {printing ? "⏳ Impression..." : "🖨️ Imprimer"}
            </button>
            <button
              onClick={onClose}
              className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition"
            >
              ✕ Fermer
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-y-auto bg-gray-100 p-6 flex justify-center">
          <div
            ref={previewRef}
            style={{
              width: "496px", minHeight: "702px",
              backgroundColor: "white",
              boxShadow: "0 20px 35px -10px rgba(0,0,0,0.2)",
              borderRadius: "8px", padding: "16px 20px",
              fontFamily: "'Times New Roman', Times, serif",
              border: "1px solid #e2e8f0",
              position: "relative", boxSizing: "border-box",
              fontSize: "11pt", lineHeight: "1.35",
            }}
          >
            {data.background && (
              <img src={data.background} alt="watermark"
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "contain", opacity: 0.1, pointerEvents: "none", zIndex: 0 }}
              />
            )}

            <div style={{ position: "relative", zIndex: 2 }}>
              {/* Doctor header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #2c3e66", paddingBottom: "10px", marginBottom: "12px" }}>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <h3 style={{ margin: "0 0 2px 0", fontSize: "14pt" }}>Dr {data.nom_fr} {data.prenom_fr}</h3>
                  <p style={{ margin: "2px 0", fontSize: "9pt" }}><strong>{data.specialite}</strong></p>
                  <p style={{ margin: "2px 0", fontSize: "8pt" }}>{data.adresse}</p>
                  <p style={{ margin: "2px 0", fontSize: "8pt" }}>📞 {data.telephone}</p>
                </div>
                <div style={{ flexShrink: 0, margin: "0 16px", textAlign: "center" }}>
                  {data.logo ? (
                    <img src={data.logo} alt="logo cabinet" style={{ maxWidth: "70px", maxHeight: "70px", display: "block" }} />
                  ) : (
                    <div style={{ width: "60px", height: "60px", border: "1px dashed #cbd5e1", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8pt", color: "#94a3b8" }}>Logo</div>
                  )}
                </div>
                <div style={{ flex: 1, textAlign: "right", direction: "rtl" }}>
                  <h3 style={{ margin: "0 0 2px 0", fontSize: "14pt" }}>د. {data.nom_ar}</h3>
                  <p style={{ margin: "2px 0", fontSize: "9pt" }}>{data.specialite}</p>
                  <p style={{ margin: "2px 0", fontSize: "8pt" }}>{data.adresse}</p>
                  <p style={{ margin: "2px 0", fontSize: "8pt" }}>📞 {data.telephone}</p>
                </div>
              </div>

              {/* Title */}
              <div style={{ textAlign: "center", margin: "8px 0" }}>
                <h2 style={{ fontSize: "16pt", color: "#1e3a5f", borderBottom: "1px dashed #94a3b8", display: "inline-block", paddingBottom: "2px", margin: 0 }}>
                  {TITLES[docType]}
                </h2>
              </div>

              {/* Patient info */}
              <div style={{ backgroundColor: "#f8fafc", padding: "8px 12px", borderRadius: "12px", margin: "12px 0", border: "1px solid #e2edff", fontSize: "9pt" }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "6px" }}>
                  <div><strong>👤 Patient :</strong> {patientData.prenom_fr} {patientData.nom_fr}</div>
                  {(patientData.prenom_ar || patientData.nom_ar) && (
                    <div style={{ textAlign: "right", direction: "rtl" }}><strong>المريض :</strong> {patientData.prenom_ar} {patientData.nom_ar}</div>
                  )}
                  <div><strong>Âge :</strong> {patientData.age} ans</div>
                  <div><strong>📅 Le :</strong> {patientData.date}</div>
                </div>
              </div>

              {/* Body */}
              {docType === "ordonnance" ? (
                <div style={{ margin: "16px 0", minHeight: "250px" }}>
                  <div style={{ borderLeft: "3px solid #1e3a5f", paddingLeft: "10px", marginBottom: "14px" }}>
                    <h4 style={{ margin: 0, fontSize: "11pt" }}>💊 Traitement prescrit :</h4>
                  </div>
                  {medicaments ? (
                    <div style={{ paddingLeft: "2px" }}>
                      {(() => {
                        const medLines = medicaments.split("\n").filter((line) => line.trim());
                        const s = MED_LIST_SCALES[scaleForCount(medLines.length)];
                        return medLines.map((line, i, arr) => {
                          const { name, posology } = parseMedLine(line);
                          const isLast = i === arr.length - 1;
                          return (
                            <div
                              key={i}
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: s.rowGap,
                                paddingBottom: s.rowPad,
                                marginBottom: s.rowPad,
                                borderBottom: isLast ? "none" : "1px dotted #d6dfea",
                                breakInside: "avoid",
                                pageBreakInside: "avoid",
                              }}
                            >
                              <span
                                style={{
                                  minWidth: `${s.badge}px`,
                                  height: `${s.badge}px`,
                                  background: "#1e3a5f",
                                  color: "white",
                                  borderRadius: "6px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: s.badgeFont,
                                  fontWeight: 700,
                                  flexShrink: 0,
                                  marginTop: "1px",
                                  fontFamily: "Arial, sans-serif",
                                }}
                              >
                                {i + 1}
                              </span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: s.nameSize, fontWeight: 700, color: "#111827" }}>
                                  {name}
                                </div>
                                {posology && (
                                  <div style={{ fontSize: s.posoSize, color: "#52606d", marginTop: "2px" }}>
                                    {posology}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  ) : (
                    <p style={{ color: "#94a3b8", fontStyle: "italic", paddingLeft: "6px" }}>Aucun médicament prescrit.</p>
                  )}
                </div>
              ) : docType === "bonne_sante" ? (
                <div style={{ margin: "20px 0", minHeight: "250px", fontSize: "10.5pt" }}>
                  <p style={{ margin: "0 0 14px 0", textAlign: "justify" }}>
                    Je soussigné(e), <strong>Dr {data.nom_fr} {data.prenom_fr}</strong>
                    {data.specialite ? `, ${data.specialite}` : ""}, certifie avoir examiné ce jour, le{" "}
                    <strong>{fmtLong(cert.date)}</strong>, <strong>{patientData.prenom_fr} {patientData.nom_fr}</strong>{" "}
                    et atteste qu'il/elle ne présente, à l'examen clinique de ce jour, aucune contre-indication
                    apparente à la pratique d'une activité normale.
                  </p>
                  {cert.motif && (
                    <p style={{ margin: "0 0 14px 0" }}><strong>Motif :</strong> {cert.motif}</p>
                  )}
                  <p style={{ margin: "0 0 14px 0", fontSize: "9pt", color: "#475569" }}>
                    Certificat établi à la demande de l'intéressé(e) et remis en main propre, pour servir et valoir ce que de droit.
                  </p>
                </div>
              ) : docType === "mariage" ? (
                <div style={{ margin: "20px 0", minHeight: "250px", fontSize: "10.5pt" }}>
                  <p style={{ margin: "0 0 14px 0", textAlign: "justify" }}>
                    Je soussigné(e), <strong>Dr {data.nom_fr} {data.prenom_fr}</strong>
                    {data.specialite ? `, ${data.specialite}` : ""}, certifie avoir examiné ce jour, le{" "}
                    <strong>{fmtLong(cert.date)}</strong>, <strong>{patientData.prenom_fr} {patientData.nom_fr}</strong>{" "}
                    et atteste qu'il/elle ne présente, à l'examen clinique de ce jour, aucune contre-indication
                    apparente au mariage.
                  </p>
                  {cert.motif && (
                    <p style={{ margin: "0 0 14px 0" }}><strong>Remarque :</strong> {cert.motif}</p>
                  )}
                  <p style={{ margin: "0 0 14px 0", fontSize: "9pt", color: "#475569" }}>
                    Certificat médical prénuptial établi à la demande de l'intéressé(e), pour servir et valoir ce que de droit.
                  </p>
                </div>
              ) : (
                <div style={{ margin: "20px 0", minHeight: "250px", fontSize: "10.5pt" }}>
                  {docType === "arret_travail" && (
                    <div style={{ display: "flex", gap: "18px", marginBottom: "16px", fontSize: "9.5pt" }}>
                      <span>{cert.type !== "prolongation" ? "☑" : "☐"} Premier arrêt</span>
                      <span>{cert.type === "prolongation" ? "☑" : "☐"} Prolongation</span>
                    </div>
                  )}
                  <p style={{ margin: "0 0 14px 0", textAlign: "justify" }}>
                    Je soussigné(e), <strong>Dr {data.nom_fr} {data.prenom_fr}</strong>
                    {data.specialite ? `, ${data.specialite}` : ""}, certifie avoir examiné ce jour{" "}
                    <strong>{patientData.prenom_fr} {patientData.nom_fr}</strong> et atteste que son état de santé{" "}
                    {docType === "arret_travail" ? "nécessite un arrêt de travail" : "nécessite un repos médical"}{" "}
                    du <strong>{fmtLong(cert.dateDebut)}</strong> au <strong>{fmtLong(cert.dateFin)}</strong> inclus
                    {nbJours ? `, soit ${nbJours} jour${nbJours > 1 ? "s" : ""}` : ""}.
                  </p>
                  {cert.motif && (
                    <p style={{ margin: "0 0 14px 0" }}><strong>Motif :</strong> {cert.motif}</p>
                  )}
                  <p style={{ margin: "0 0 14px 0", fontSize: "9pt", color: "#475569" }}>
                    Certificat établi à la demande de l'intéressé(e) et remis en main propre, pour servir et valoir ce que de droit.
                  </p>
                </div>
              )}

              {/* Footer */}
              <div style={{ marginTop: "20px", borderTop: "1px dashed #a0afc3", paddingTop: "12px", display: "flex", justifyContent: docType === "ordonnance" ? "space-between" : "flex-end", fontSize: "8pt" }}>
                {docType === "ordonnance" && (
                  <div>
                    <p style={{ margin: "2px 0" }}>Durée : ___________</p>
                    <p style={{ margin: "2px 0" }}>Renouvellements : ___________</p>
                  </div>
                )}
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: "2px 0" }}>Cachet &amp; signature</p>
                  <div style={{ width: "120px", height: "40px", borderBottom: "1px solid #1e293b", marginTop: "4px" }} />
                  <p style={{ margin: "2px 0" }}>Dr {data.nom_fr} {data.prenom_fr}</p>
                </div>
              </div>

              {docType === "ordonnance" && (
                <div style={{ textAlign: "center", fontSize: "7pt", color: "#6b7280", marginTop: "10px", direction: "rtl" }}>
                  يرجى احترام الجرعات الموصوفة — وصفة طبية صالحة لمدة 30 يومًا
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrdonnanceModal;