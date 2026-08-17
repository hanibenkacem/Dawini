import { useState, useRef, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { API_BASE } from '../config/api';

export default function OrdonnancePage() {
  const logoInputRef = useRef(null);
  const backgroundInputRef = useRef(null);
  const previewRef = useRef(null);

  // Toast notification state
  const [toast, setToast] = useState(null); // { message, type }
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

  // Doctor / Cabinet Settings State
  const [data, setData] = useState({
    nom_fr: "",
    prenom_fr: "",
    nom_ar: "", // Maps to nom_medecin_ar in DB
    prenom_ar: "", // Visual only or combined in DB
    specialite: "",
    telephone: "",
    adresse: "",
    logo: "", 
    background: ""
  });

  // Patient Info State
  const [patient, setPatient] = useState({
    nom_fr: "",
    prenom_fr: "",
    nom_ar: "",
    prenom_ar: "",
    age: "",
    date: new Date().toISOString().split('T')[0]
  });

  // Medications State
  const [medications, setMedications] = useState(
    Array.from({ length: 6 }, (_, i) => ({ id: i + 1, text: "" }))
  );
  const [additionalInstructions, setAdditionalInstructions] = useState("");

  // --- 1. LOAD SETTINGS FROM DATABASE ---
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch(`${API_BASE}/ordonnance-settings/me`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const result = await response.json();
        console.log(result)
        if (response.ok && result) {
          const names = result.nom_medecin ? result.nom_medecin.split(" ") : ["", ""];
          setData({
            ...data,
            nom_fr: names[0] || "",
            prenom_fr: names[1] || "",
            nom_ar: result.nom_medecin_ar || "",
            specialite: result.specialite || "",
            adresse: result.adresse || "",
            telephone: result.telephone || "",
            logo: result.logo ? `${API_BASE}/uploads/${result.logo}` : "",
            background: result.background ? `${API_BASE}/uploads/${result.background}` : "",
          });
        }
      } catch (err) {
        console.error("Could not load saved settings:", err);
      }
    };
    loadSettings();
  }, []);

  // --- 2. SAVE SETTINGS TO DATABASE ---
  const saveDoctorSettings = async () => {
    const formData = new FormData();
    formData.append("nom_medecin", `${data.nom_fr} ${data.prenom_fr}`);
    formData.append("nom_medecin_ar", data.nom_ar);
    formData.append("specialite", data.specialite);
    formData.append("adresse", data.adresse);
    formData.append("telephone", data.telephone);

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
            body { margin: 0; padding: 0; background: white; font-family: 'Times New Roman', Times, serif; }
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
    width: "100%",
    padding: "10px 12px",
    borderRadius: "12px",
    border: "1px solid #cfdfed",
    fontSize: "0.9rem",
    boxSizing: "border-box",
    backgroundColor: "#fff",
    outline: "none"
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "#f4f7fb" }}>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            backgroundColor: toast.type === "success" ? "#10b981" : "#ef4444",
            color: "white",
            padding: "14px 20px",
            borderRadius: "14px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.18)",
            zIndex: 9999,
            fontSize: "0.9rem",
            fontWeight: "bold",
            maxWidth: "360px",
            animation: "dawini-toast-in 0.25s ease-out"
          }}
        >
          <span style={{ flex: 1 }}>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "white",
              cursor: "pointer",
              fontSize: "1rem",
              lineHeight: 1,
              opacity: 0.85
            }}
            aria-label="Fermer"
          >
            ✕
          </button>
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
          {/* Form Panel */}
          <div style={{ width: "360px", background: "white", borderRadius: "20px", padding: "24px", boxShadow: "0 8px 20px rgba(0,0,0,0.05)", overflowY: "auto", maxHeight: "calc(100vh - 120px)" }}>
            <h2 style={{ marginTop: 0, fontSize: "1.5rem", color: "#1e3a5f", borderBottom: "2px solid #cbd5e1", paddingBottom: "8px" }}>⚕️ Paramètres Ordonnance</h2>
            
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
              <input type="file" name="background" ref={backgroundInputRef} onChange={handleFile} style={{ marginTop: 4 }} accept="image/*" /> {/* Show this so the user knows a logo exists in the DB */}
{data.logo && (
  <p style={{ fontSize: '0.7rem', color: '#10b981', margin: '4px 0' }}>
    ✅ Logo déjà enregistré
  </p>
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

          {/* A5 Preview Panel */}
          <div
            ref={previewRef}
            style={{
              width: "496px", minHeight: "702px", backgroundColor: "white", boxShadow: "0 20px 35px -10px rgba(0,0,0,0.2)",
              borderRadius: "8px", padding: "16px 20px", fontFamily: "'Times New Roman', Times, serif", border: "1px solid #e2e8f0",
              position: "relative", boxSizing: "border-box", fontSize: "11pt", lineHeight: "1.35"
            }}
          >
            {/* Watermark */}
            {data.background && (
              <img src={data.background} alt="watermark" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "contain", opacity: 0.1, pointerEvents: "none", zIndex: 0 }} />
            )}

            <div style={{ position: "relative", zIndex: 2 }}>
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

              <div style={{ textAlign: "center", margin: "8px 0" }}>
                <h2 style={{ fontSize: "16pt", color: "#1e3a5f", borderBottom: "1px dashed #94a3b8", display: "inline-block", paddingBottom: "2px", margin: 0 }}>ORDONNANCE MÉDICALE</h2>
              </div>

              <div style={{ backgroundColor: "#f8fafc", padding: "8px 12px", borderRadius: "12px", margin: "12px 0", border: "1px solid #e2edff", fontSize: "9pt" }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "6px" }}>
                  <div><strong>👤 Patient :</strong> {patient.prenom_fr} {patient.nom_fr}</div>
                  <div style={{ textAlign: "right", direction: "rtl" }}><strong>المريض :</strong> {patient.prenom_ar} {patient.nom_ar}</div>
                  <div><strong>Âge :</strong> {patient.age} ans</div>
                  <div><strong>📅 Le :</strong> {patient.date}</div>
                </div>
              </div>

              <div style={{ margin: "16px 0", minHeight: "250px" }}>
                <div style={{ borderLeft: "3px solid #1e3a5f", paddingLeft: "10px", marginBottom: "10px" }}>
                  <h4 style={{ margin: 0, fontSize: "11pt" }}>💊 Traitement prescrit :</h4>
                </div>
                <div style={{ paddingLeft: "6px" }}>
                  {medications.map(med => med.text.trim() && (
                    <p key={med.id} style={{ margin: "6px 0", fontSize: "10pt" }}>• {med.text}</p>
                  ))}
                  {additionalInstructions && (
                    <div style={{ backgroundColor: "#fef9e6", padding: "8px 10px", borderRadius: "8px", marginTop: "12px", fontSize: "9pt" }}>
                      <strong>📌 Instructions :</strong> {additionalInstructions}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: "20px", borderTop: "1px dashed #a0afc3", paddingTop: "12px", display: "flex", justifyContent: "space-between", fontSize: "8pt" }}>
                <div>
                  <p style={{ margin: "2px 0" }}>Durée : ___________</p>
                  <p style={{ margin: "2px 0" }}>Renouvellements : ___________</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: "2px 0" }}>Cachet & signature</p>
                  <div style={{ width: "120px", height: "40px", borderBottom: "1px solid #1e293b", marginTop: "4px" }}></div>
                  <p style={{ margin: "2px 0" }}>Dr {data.nom_fr} {data.prenom_fr}</p>
                </div>
              </div>
              <div style={{ textAlign: "center", fontSize: "7pt", color: "#6b7280", marginTop: "10px", direction: "rtl" }}>
                يرجى احترام الجرعات الموصوفة — وصفة طبية صالحة لمدة 30 يومًا
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}