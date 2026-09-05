import { useRef, useState } from "react";
import { API_BASE } from "../config/api";
import OrdonnanceDocument, { PRINT_LABELS } from "../components/ordonnance/OrdonnanceDocument";

const OrdonnanceModal = ({
  show,
  onClose,
  doctorSettings,
  medicaments,
  note,
  patient,
  docType = "ordonnance",
  certificate,
  templateId,
}) => {
  const previewRef = useRef(null);
  const [toast, setToast] = useState(null); // { type: 'success' | 'error' | 'info', message }
  const [printing, setPrinting] = useState(false);

  if (!show || !doctorSettings || !patient) return null;

  // Map the raw settings/patient records into the shape OrdonnanceDocument expects.
  const doctor = {
    nomFr: doctorSettings.nom_medecin?.split(" ")[0] || "",
    prenomFr: doctorSettings.nom_medecin?.split(" ").slice(1).join(" ") || "",
    nomAr: doctorSettings.nom_medecin_ar || "",
    specialite: doctorSettings.specialite || "",
    adresse: doctorSettings.adresse || "",
    telephone: doctorSettings.telephone || "",
    logo: doctorSettings.logo ? `${API_BASE}/uploads/${doctorSettings.logo}` : "",
    background: doctorSettings.background ? `${API_BASE}/uploads/${doctorSettings.background}` : "",
  };

  const patientData = {
    nomFr: patient.nom,
    prenomFr: patient.prenom,
    nomAr: patient.nom_ar || "",
    prenomAr: patient.prenom_ar || "",
    age: Math.floor((new Date() - new Date(patient.date_naissance)) / (1000 * 60 * 60 * 24 * 365.25)),
    date: new Date().toLocaleDateString("fr-FR"),
  };

  // Prefer an explicit templateId if the caller passes one, otherwise fall
  // back to the doctor's saved default — so printing still uses the right
  // template even if a call site forgets to pass templateId explicitly.
  // getTemplate() inside OrdonnanceDocument already falls back to
  // DEFAULT_TEMPLATE_ID if this ends up undefined too.
  const resolvedTemplateId = templateId || doctorSettings.template;

  const showToast = (type, message, duration = 4000) => {
    setToast({ type, message });
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => setToast(null), duration);
  };

  const handlePrint = async () => {
    const content = previewRef.current;
    if (!content) return;

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
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(html);
        w.document.close();
        w.print();
      } else {
        showToast("error", "Impossible d'ouvrir la fenêtre d'impression.");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
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
              background: toast.type === "success" ? "#ecfdf5" : toast.type === "error" ? "#fef2f2" : "#eff6ff",
              color: toast.type === "success" ? "#065f46" : toast.type === "error" ? "#991b1b" : "#1e40af",
              border: `1px solid ${
                toast.type === "success" ? "#a7f3d0" : toast.type === "error" ? "#fecaca" : "#bfdbfe"
              }`,
            }}
          >
            <span style={{ fontSize: 16 }}>
              {toast.type === "success" ? "✅" : toast.type === "error" ? "⚠️" : "ℹ️"}
            </span>
            {toast.message}
          </div>
        )}

        <div className="flex justify-between items-center p-4 border-b bg-white">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Aperçu {PRINT_LABELS[docType]}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {patientData.prenomFr} {patientData.nomFr} — {patientData.date}
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

        <div className="flex-1 overflow-y-auto bg-gray-100 p-6 flex justify-center">
          <OrdonnanceDocument
            ref={previewRef}
            doctor={doctor}
            patient={patientData}
            medicaments={medicaments}
            note={note}
            docType={docType}
            certificate={certificate}
            templateId={resolvedTemplateId}
          />
        </div>
      </div>
    </div>
  );
};

export default OrdonnanceModal;