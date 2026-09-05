import { forwardRef } from "react";
import { getTemplate } from "../../config/ordonnanceTemplates";

export const TITLES = {
  ordonnance:    "ORDONNANCE MÉDICALE",
  maladie:       "CERTIFICAT MÉDICAL",
  arret_travail: "CERTIFICAT D'ARRÊT DE TRAVAIL",
  bonne_sante:   "CERTIFICAT DE BONNE SANTÉ",
  mariage:       "CERTIFICAT MÉDICAL PRÉNUPTIAL",
};

export const PRINT_LABELS = {
  ordonnance:    "Ordonnance",
  maladie:       "Certificat médical",
  arret_travail: "Arrêt de travail",
  bonne_sante:   "Certificat de bonne santé",
  mariage:       "Certificat de mariage",
};

const fmtLong = (d) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "___________";

const parseMedLine = (line) => {
  const sepIdx = line.indexOf(" — ");
  if (sepIdx === -1) return { name: line.trim(), posology: "" };
  return { name: line.slice(0, sepIdx).trim(), posology: line.slice(sepIdx + 3).trim() };
};

const MED_LIST_SCALES = {
  normal:  { nameSize: "11pt", posoSize: "9.5pt", badge: 22, badgeFont: "9pt",  rowGap: "10px", rowPad: "10px" },
  compact: { nameSize: "10pt", posoSize: "8.5pt", badge: 19, badgeFont: "8pt",  rowGap: "7px",  rowPad: "7px"  },
  tight:   { nameSize: "9pt",  posoSize: "7.5pt", badge: 16, badgeFont: "7pt",  rowGap: "5px",  rowPad: "5px"  },
};
const scaleForCount = (count) => (count > 10 ? "tight" : count > 6 ? "compact" : "normal");

let _measureCanvas;
const measureFontSizePt = (
  text,
  maxWidthPx,
  { maxPt = 14, minPt = 6, fontFamily = "'Times New Roman', Times, serif", fontWeight = "bold" } = {}
) => {
  if (!text) return `${maxPt}pt`;
  if (typeof document === "undefined") return `${maxPt}pt`;
  _measureCanvas = _measureCanvas || document.createElement("canvas");
  const ctx = _measureCanvas.getContext("2d");
  const refPx = 100;
  ctx.font = `${fontWeight} ${refPx}px ${fontFamily}`;
  const measuredWidth = ctx.measureText(text).width;
  if (!measuredWidth) return `${maxPt}pt`;

  const PT_TO_PX = 96 / 72;
  const SAFETY = 0.94;
  let sizePx = (maxWidthPx * SAFETY / measuredWidth) * refPx;
  sizePx = Math.min(sizePx, maxPt * PT_TO_PX);
  sizePx = Math.max(sizePx, minPt * PT_TO_PX);
  return `${(sizePx / PT_TO_PX).toFixed(1)}pt`;
};

// maxWidthPx now comes from the template (theme.nameColumnWidth) instead of
// a fixed constant, since it changes depending on which header blocks
// (logo / Arabic name) are present for a given template.
const doctorNameStyle = (primaryText, secondaryText, fontFamily, maxWidthPx) => {
  const singleField = !secondaryText || !secondaryText.trim();
  if (singleField) {
    return { fontSize: measureFontSizePt(primaryText, maxWidthPx, { fontFamily }), whiteSpace: "nowrap" };
  }
  return { fontSize: "14pt" };
};

/**
 * Shared A5 document renderer. Templates control which header blocks show
 * (logo, Arabic doctor name) via theme.showLogo / theme.showArabicName —
 * everything else (fonts, body layout, emojis) is identical across templates.
 */
const OrdonnanceDocument = forwardRef(function OrdonnanceDocument(
  { doctor, patient, medicaments, note, docType = "ordonnance", certificate, templateId },
  ref
) {
  const theme = getTemplate(templateId).theme;
  const cert = certificate || {};
  const nbJours =
    cert.dateDebut && cert.dateFin
      ? Math.round((new Date(cert.dateFin) - new Date(cert.dateDebut)) / 86400000) + 1
      : null;

  return (
    <div
      ref={ref}
      style={{
        width: "496px", minHeight: "702px", backgroundColor: "white",
        boxShadow: "0 20px 35px -10px rgba(0,0,0,0.2)", borderRadius: "8px",
        padding: "16px 20px", fontFamily: theme.fontFamily, border: "1px solid #e2e8f0",
        position: "relative", boxSizing: "border-box", fontSize: "11pt", lineHeight: "1.35",
      }}
    >
      {doctor.background && (
        <img
          src={doctor.background}
          alt="watermark"
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "contain", opacity: 0.1, pointerEvents: "none", zIndex: 0 }}
        />
      )}

      <div style={{ position: "relative", zIndex: 2 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${theme.primary}`, paddingBottom: "10px", marginBottom: "12px" }}>
          <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
            <h3 style={{ margin: "0 0 2px 0", ...doctorNameStyle(`Dr ${doctor.nomFr}`, doctor.prenomFr, theme.fontFamily, theme.nameColumnWidth) }}>
              Dr {doctor.nomFr} {doctor.prenomFr}
            </h3>
            <p style={{ margin: "2px 0", fontSize: "9pt" }}><strong>{doctor.specialite}</strong></p>
            <p style={{ margin: "2px 0", fontSize: "8pt" }}>📍{doctor.adresse}</p>
            <p style={{ margin: "2px 0", fontSize: "8pt" }}>📞 {doctor.telephone}</p>
          </div>

          {theme.showLogo && (
            <div style={{ flexShrink: 0, margin: "0 16px", textAlign: "center" }}>
              {doctor.logo ? (
                <img src={doctor.logo} alt="logo cabinet" style={{ maxWidth: "70px", maxHeight: "70px", display: "block" }} />
              ) : (
                <div style={{ width: "60px", height: "60px", border: "1px dashed #cbd5e1", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8pt", color: "#94a3b8" }}>Logo</div>
              )}
            </div>
          )}

          {theme.showArabicName && (
            <div style={{ flex: 1, textAlign: "right", direction: "rtl", minWidth: 0 }}>
              <h3 style={{ margin: "0 0 2px 0", ...doctorNameStyle(`د. ${doctor.nomAr}`, null, theme.fontFamily, theme.nameColumnWidth) }}>
                د. {doctor.nomAr}
              </h3>
              <p style={{ margin: "2px 0", fontSize: "9pt" }}>{doctor.specialite}</p>
              <p style={{ margin: "2px 0", fontSize: "8pt" }}>📍{doctor.adresse}</p>
              <p style={{ margin: "2px 0", fontSize: "8pt" }}>📞 {doctor.telephone}</p>
            </div>
          )}
        </div>

        {/* Title */}
        <div style={{ textAlign: "center", margin: "8px 0" }}>
          <h2 style={{ fontSize: "16pt", color: theme.primary, borderBottom: `1px dashed ${theme.border}`, display: "inline-block", paddingBottom: "2px", margin: 0 }}>
            {TITLES[docType]}
          </h2>
        </div>

        {/* Patient info */}
        <div style={{ backgroundColor: "#f8fafc", padding: "8px 12px", borderRadius: "12px", margin: "12px 0", border: `1px solid ${theme.border}`, fontSize: "9pt" }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "6px" }}>
            <div><strong>👤 Patient :</strong> {patient.prenomFr} {patient.nomFr}</div>
            {(patient.prenomAr || patient.nomAr) && (
              <div style={{ textAlign: "right", direction: "rtl" }}><strong>المريض :</strong> {patient.prenomAr} {patient.nomAr}</div>
            )}
            <div><strong>Âge :</strong> {patient.age} ans</div>
            <div><strong>📅 Le :</strong> {patient.date}</div>
          </div>
        </div>

        {/* Body */}
        {docType === "ordonnance" ? (
          <div style={{ margin: "16px 0", minHeight: "250px" }}>
            <div style={{ borderLeft: `3px solid ${theme.primary}`, paddingLeft: "10px", marginBottom: "14px" }}>
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
                          display: "flex", alignItems: "flex-start", gap: s.rowGap,
                          paddingBottom: s.rowPad, marginBottom: s.rowPad,
                          borderBottom: isLast ? "none" : `1px dotted ${theme.border}`,
                          breakInside: "avoid", pageBreakInside: "avoid",
                        }}
                      >
                        <span
                          style={{
                            minWidth: `${s.badge}px`, height: `${s.badge}px`, background: theme.primary,
                            color: "#ffffff", borderRadius: "6px", display: "flex", alignItems: "center",
                            justifyContent: "center", fontSize: s.badgeFont, fontWeight: 700, flexShrink: 0,
                            marginTop: "1px", fontFamily: "Arial, sans-serif",
                          }}
                        >
                          {i + 1}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: s.nameSize, fontWeight: 700, color: "#111827" }}>{name}</div>
                          {posology && <div style={{ fontSize: s.posoSize, color: theme.muted, marginTop: "2px" }}>{posology}</div>}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            ) : (
              <p style={{ color: "#94a3b8", fontStyle: "italic", paddingLeft: "6px" }}>Aucun médicament prescrit.</p>
            )}
            {note && (
              <div style={{ backgroundColor: "#fef9e6", padding: "8px 10px", borderRadius: "8px", marginTop: "12px", fontSize: "9pt" }}>
                <strong>📌 Instructions :</strong> {note}
              </div>
            )}
          </div>
        ) : docType === "bonne_sante" ? (
          <div style={{ margin: "20px 0", minHeight: "250px", fontSize: "10.5pt" }}>
            <p style={{ margin: "0 0 14px 0", textAlign: "justify" }}>
              Je soussigné(e), <strong>Dr {doctor.nomFr} {doctor.prenomFr}</strong>
              {doctor.specialite ? `, ${doctor.specialite}` : ""}, certifie avoir examiné ce jour, le{" "}
              <strong>{fmtLong(cert.date)}</strong>, <strong>{patient.prenomFr} {patient.nomFr}</strong>{" "}
              et atteste qu'il/elle ne présente, à l'examen clinique de ce jour, aucune contre-indication
              apparente à la pratique d'une activité normale.
            </p>
            {cert.motif && <p style={{ margin: "0 0 14px 0" }}><strong>Motif :</strong> {cert.motif}</p>}
            <p style={{ margin: "0 0 14px 0", fontSize: "9pt", color: theme.muted }}>
              Certificat établi à la demande de l'intéressé(e) et remis en main propre, pour servir et valoir ce que de droit.
            </p>
          </div>
        ) : docType === "mariage" ? (
          <div style={{ margin: "20px 0", minHeight: "250px", fontSize: "10.5pt" }}>
            <p style={{ margin: "0 0 14px 0", textAlign: "justify" }}>
              Je soussigné(e), <strong>Dr {doctor.nomFr} {doctor.prenomFr}</strong>
              {doctor.specialite ? `, ${doctor.specialite}` : ""}, certifie avoir examiné ce jour, le{" "}
              <strong>{fmtLong(cert.date)}</strong>, <strong>{patient.prenomFr} {patient.nomFr}</strong>{" "}
              et atteste qu'il/elle ne présente, à l'examen clinique de ce jour, aucune contre-indication
              apparente au mariage.
            </p>
            {cert.motif && <p style={{ margin: "0 0 14px 0" }}><strong>Remarque :</strong> {cert.motif}</p>}
            <p style={{ margin: "0 0 14px 0", fontSize: "9pt", color: theme.muted }}>
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
              Je soussigné(e), <strong>Dr {doctor.nomFr} {doctor.prenomFr}</strong>
              {doctor.specialite ? `, ${doctor.specialite}` : ""}, certifie avoir examiné ce jour{" "}
              <strong>{patient.prenomFr} {patient.nomFr}</strong> et atteste que son état de santé{" "}
              {docType === "arret_travail" ? "nécessite un arrêt de travail" : "nécessite un repos médical"}{" "}
              du <strong>{fmtLong(cert.dateDebut)}</strong> au <strong>{fmtLong(cert.dateFin)}</strong> inclus
              {nbJours ? `, soit ${nbJours} jour${nbJours > 1 ? "s" : ""}` : ""}.
            </p>
            {cert.motif && <p style={{ margin: "0 0 14px 0" }}><strong>Motif :</strong> {cert.motif}</p>}
            <p style={{ margin: "0 0 14px 0", fontSize: "9pt", color: theme.muted }}>
              Certificat établi à la demande de l'intéressé(e) et remis en main propre, pour servir et valoir ce que de droit.
            </p>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: "20px", borderTop: `1px dashed ${theme.border}`, paddingTop: "12px", display: "flex", justifyContent: docType === "ordonnance" ? "space-between" : "flex-end", fontSize: "8pt" }}>
          {docType === "ordonnance" && (
            <div>
              <p style={{ margin: "2px 0" }}>Durée : ___________</p>
              <p style={{ margin: "2px 0" }}>Renouvellements : ___________</p>
            </div>
          )}
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: "2px 0" }}>Cachet &amp; signature</p>
            <div style={{ width: "120px", height: "40px", borderBottom: "1px solid #1e293b", marginTop: "4px" }} />
            <p style={{ margin: "2px 0" }}>Dr {doctor.nomFr} {doctor.prenomFr}</p>
          </div>
        </div>

        {docType === "ordonnance" && (
          <div style={{ textAlign: "center", fontSize: "7pt", color: "#6b7280", marginTop: "10px", direction: "rtl" }}>
            يرجى احترام الجرعات الموصوفة — وصفة طبية صالحة لمدة 30 يومًا
          </div>
        )}
      </div>
    </div>
  );
});

export default OrdonnanceDocument;