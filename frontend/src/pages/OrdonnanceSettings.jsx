import { useState, useRef, useEffect } from "react";
import { API_BASE } from '../config/api';
import OrdonnanceDocument from "../components/ordonnance/OrdonnanceDocument";
import { ORDONNANCE_TEMPLATES, DEFAULT_TEMPLATE_ID } from "../config/ordonnanceTemplates";

export default function OrdonnancePage() {
  const logoInputRef = useRef(null);
  const backgroundInputRef = useRef(null);
  const previewRef = useRef(null);

  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  const showToast = (message, type = "success") => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const [data, setData] = useState({
    nom_fr: "",
    prenom_fr: "",
    nom_ar: "",
    prenom_ar: "",
    specialite: "",
    telephone: "",
    adresse: "",
    logo: "",
    background: "",
    template: DEFAULT_TEMPLATE_ID,
  });

  const [patient, setPatient] = useState({
    nom_fr: "",
    prenom_fr: "",
    nom_ar: "",
    prenom_ar: "",
    age: "",
    date: new Date().toISOString().split('T')[0]
  });

  const [medications, setMedications] = useState(
    Array.from({ length: 6 }, (_, i) => ({ id: i + 1, text: "" }))
  );
  const [additionalInstructions, setAdditionalInstructions] = useState("");

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch(`${API_BASE}/ordonnance-settings/me`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const result = await response.json();
        if (response.ok && result) {
          const names = result.nom_medecin ? result.nom_medecin.split(" ") : ["", ""];
          setData((prev) => ({
            ...prev,
            nom_fr: names[0] || "",
            prenom_fr: names.slice(1).join(" ") || "",
            nom_ar: result.nom_medecin_ar || "",
            specialite: result.specialite || "",
            adresse: result.adresse || "",
            telephone: result.telephone || "",
            logo: result.logo ? `${API_BASE}/uploads/${result.logo}` : "",
            background: result.background ? `${API_BASE}/uploads/${result.background}` : "",
            template: result.template || DEFAULT_TEMPLATE_ID,
          }));
        }
      } catch (err) {
        console.error("Could not load saved settings:", err);
      }
    };
    loadSettings();
  }, []);

  const saveDoctorSettings = async () => {
    const formData = new FormData();
    formData.append("nom_medecin", `${data.nom_fr} ${data.prenom_fr}`);
    formData.append("nom_medecin_ar", data.nom_ar);
    formData.append("specialite", data.specialite);
    formData.append("adresse", data.adresse);
    formData.append("telephone", data.telephone);
    formData.append("template", data.template);

    if (logoInputRef.current?.files[0]) formData.append("logo", logoInputRef.current.files[0]);
    if (backgroundInputRef.current?.files[0]) formData.append("background", backgroundInputRef.current.files[0]);

    try {
      const response = await fetch(`${API_BASE}/ordonnance-settings`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: formData,
      });

      if (response.ok) {
        showToast("✅ Modèle enregistré avec succès !", "success");
      } else {
        showToast("❌ Erreur lors de l'enregistrement.", "error");
      }
    } catch (error) {
      console.error("Save error:", error);
      showToast("❌ Erreur réseau.", "error");
    }
  };

  const handleChange = (e) => setData({ ...data, [e.target.name]: e.target.value });
  const handlePatientChange = (e) => setPatient({ ...patient, [e.target.name]: e.target.value });
  const handleMedicationChange = (id, text) => setMedications(meds => meds.map(m => m.id === id ? { ...m, text } : m));

  const handleFile = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      const url = URL.createObjectURL(files[0]);
      setData({ ...data, [name]: url });
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Ordonnance Médicale</title>
          <style>
            @page { size: A5; margin: 0.6cm; }
            body { margin: 0; padding: 0; background: white; }
            .print-preview { width: 100%; height: auto; box-sizing: border-box; }
            * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          </style>
        </head>
        <body>
          <div class="print-preview">${previewRef.current.innerHTML}</div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: "12px", border: "1px solid #cfdfed",
    fontSize: "0.9rem", boxSizing: "border-box", backgroundColor: "#fff", outline: "none"
  };

  const doctorForPreview = {
    nomFr: data.nom_fr, prenomFr: data.prenom_fr, nomAr: data.nom_ar,
    specialite: data.specialite, adresse: data.adresse, telephone: data.telephone,
    logo: data.logo, background: data.background,
  };
  const patientForPreview = {
    nomFr: patient.nom_fr, prenomFr: patient.prenom_fr, nomAr: patient.nom_ar,
    prenomAr: patient.prenom_ar, age: patient.age, date: patient.date,
  };
  const medicamentsString = medications
    .filter((m) => m.text.trim())
    .map((m) => m.text.trim())
    .join("\n");

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "#f4f7fb" }}>
      {toast && (
        <div
          style={{
            position: "fixed", top: 20, right: 20, display: "flex", alignItems: "center", gap: "10px",
            backgroundColor: toast.type === "success" ? "#10b981" : "#ef4444", color: "white",
            padding: "14px 20px", borderRadius: "14px", boxShadow: "0 10px 25px rgba(0,0,0,0.18)",
            zIndex: 9999, fontSize: "0.9rem", fontWeight: "bold", maxWidth: "360px",
            animation: "dawini-toast-in 0.25s ease-out"
          }}
        >
          <span style={{ flex: 1 }}>{toast.message}</span>
          <button onClick={() => setToast(null)} style={{ background: "transparent", border: "none", color: "white", cursor: "pointer", fontSize: "1rem", lineHeight: 1, opacity: 0.85 }} aria-label="Fermer">✕</button>
        </div>
      )}
      <style>{`
        @keyframes dawini-toast-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{ display: "flex", flex: 1 }}>
        <div style={{ display: "flex", gap: "24px", padding: "24px", flex: 1, flexWrap: "wrap", overflowY: "auto" }}>
          <div style={{ width: "360px", background: "white", borderRadius: "20px", padding: "24px", boxShadow: "0 8px 20px rgba(0,0,0,0.05)", overflowY: "auto", maxHeight: "calc(100vh - 120px)" }}>
            <h2 style={{ marginTop: 0, fontSize: "1.5rem", color: "#1e3a5f", borderBottom: "2px solid #cbd5e1", paddingBottom: "8px" }}>⚕️ Paramètres Ordonnance</h2>

            <div style={{ marginBottom: "28px" }}>
              <h3>🎨 Modèle du document</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {ORDONNANCE_TEMPLATES.map((t) => (
                  <label
                    key={t.id}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px 12px",
                      borderRadius: "12px", cursor: "pointer",
                      border: `2px solid ${data.template === t.id ? t.theme.primary : "#e2e8f0"}`,
                      background: data.template === t.id ? "#f8fafc" : "white",
                    }}
                  >
                    <input
                      type="radio"
                      name="template"
                      value={t.id}
                      checked={data.template === t.id}
                      onChange={() => setData({ ...data, template: t.id })}
                      style={{ marginTop: 3 }}
                    />
                    <span
                      style={{ width: 14, height: 14, borderRadius: "4px", background: t.theme.primary, flexShrink: 0, marginTop: 2 }}
                    />
                    <span>
                      <strong style={{ fontSize: "0.9rem" }}>{t.label}</strong>
                      <br />
                      <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{t.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "28px" }}>
              <h3>👨‍⚕️ Médecin (FR / AR)</h3>
              <input name="nom_fr" value={data.nom_fr} placeholder="Nom (FR)" onChange={handleChange} style={inputStyle} /><br /><br />
              <input name="prenom_fr" value={data.prenom_fr} placeholder="Prénom (FR)" onChange={handleChange} style={inputStyle} /><br /><br />
              <input name="nom_ar" value={data.nom_ar} placeholder="اللقب والاسم (AR)" onChange={handleChange} style={inputStyle} dir="rtl" /><br /><br />
              <input name="specialite" value={data.specialite} placeholder="Spécialité" onChange={handleChange} style={inputStyle} /><br /><br />
              <input name="telephone" value={data.telephone} placeholder="Téléphone" onChange={handleChange} style={inputStyle} /><br /><br />
              <input name="adresse" value={data.adresse} placeholder="Adresse" onChange={handleChange} style={inputStyle} /><br /><br />
              <label style={{fontSize: '0.8rem'}}>Logo (cachet médical)</label>
              <input type="file" name="logo" ref={logoInputRef} onChange={handleFile} style={{ marginTop: 4 }} accept="image/*" /><br /><br />
              <label style={{fontSize: '0.8rem'}}>Filigrane</label>
              <input type="file" name="background" ref={backgroundInputRef} onChange={handleFile} style={{ marginTop: 4 }} accept="image/*" />
              {data.logo && (
                <p style={{ fontSize: '0.7rem', color: '#10b981', margin: '4px 0' }}>✅ Logo déjà enregistré</p>
              )}
              <button onClick={saveDoctorSettings} style={{ backgroundColor: "#10b981", color: "white", border: "none", padding: "12px", borderRadius: "40px", fontWeight: "bold", width: "100%", marginTop: 20, cursor: "pointer" }}>
                💾 Sauvegarder ce Modèle
              </button>
            </div>

            <div style={{ marginBottom: "28px" }}>
              <h3>🧑‍⚕️ Patient : الاسم و اللقب</h3>
              <input name="nom_fr" placeholder="Nom patient (FR)" onChange={handlePatientChange} value={patient.nom_fr} style={inputStyle} /><br /><br />
              <input name="prenom_fr" placeholder="Prénom patient (FR)" onChange={handlePatientChange} value={patient.prenom_fr} style={inputStyle} /><br /><br />
              <input name="nom_ar" placeholder="اللقب (AR)" onChange={handlePatientChange} value={patient.nom_ar} style={inputStyle} dir="rtl" /><br /><br />
              <input name="prenom_ar" placeholder="الاسم (AR)" onChange={handlePatientChange} value={patient.prenom_ar} style={inputStyle} dir="rtl" /><br /><br />
              <input name="age" placeholder="Âge" onChange={handlePatientChange} value={patient.age} style={inputStyle} /><br /><br />
              <input name="date" type="date" onChange={handlePatientChange} value={patient.date} style={inputStyle} />
            </div>

            <div>
              <h3>💊 Prescription</h3>
              {medications.map(med => (
                <input key={med.id} type="text" placeholder={`• Médicament ${med.id}`} value={med.text} onChange={e => handleMedicationChange(med.id, e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
              ))}
              <textarea placeholder="Instructions complémentaires..." value={additionalInstructions} onChange={e => setAdditionalInstructions(e.target.value)} style={{ ...inputStyle, minHeight: "80px" }} />
            </div>
            <button onClick={handlePrint} style={{ backgroundColor: "#1e3a5f", color: "white", border: "none", padding: "12px", borderRadius: "40px", fontWeight: "bold", width: "100%", marginTop: 20, cursor: "pointer" }}>🖨️ Imprimer l'ordonnance (A5)</button>
          </div>

          <OrdonnanceDocument
            ref={previewRef}
            doctor={doctorForPreview}
            patient={patientForPreview}
            medicaments={medicamentsString}
            note={additionalInstructions}
            docType="ordonnance"
            templateId={data.template}
          />
        </div>
      </div>
    </div>
  );
}