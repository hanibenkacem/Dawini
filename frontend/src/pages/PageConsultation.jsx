import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import TablePatients from "../components/tablepatients";
import ModalPatient from "../components/ModalPatient";
import axios from "axios";
import { API_BASE } from '../config/api';


const LIGHT = {
  bg: "#F0F4F8",
  surface: "#FFFFFF",
  border: "#E2E8F0",
  text: "#0F2942",
  textSoft: "#64748B",
  teal: "#0E7490",
  tealMid: "#06B6D4",
  shadow: "rgba(15,41,66,0.07)",
};

const DARK = {
  bg: "#0D1520",
  surface: "#141E2E",
  border: "#253047",
  text: "#E2EAF4",
  textSoft: "#7B93B8",
  teal: "#22D3EE",
  tealMid: "#06B6D4",
  shadow: "rgba(0,0,0,0.3)",
};

const PAGE_SIZE = 10;

export default function MedecinDashboard() {
  const [openModal, setOpenModal] = useState(false);
  const [patients, setPatients] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");

  const { dark } = useOutletContext();
  const C = dark ? DARK : LIGHT;

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/patient/getall`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPatients(res.data);
      setCurrentPage(1); // reset to first page on refresh
    } catch (err) {
      console.error("Erreur lors de la récupération des patients", err);
    }
  };

  // Doctor-only permanent delete (patient + all consultations/rendez_vous/
  // file_attente — see backend DeletePatient). Simple confirm is enough per
  // spec, no name-typing step.
  const handleDeletePatient = async (patientId, patientLabel) => {
    const ok = window.confirm(
      `Supprimer définitivement le dossier de ${patientLabel} ? Cette action est irréversible et supprimera aussi ses consultations.`
    );
    if (!ok) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE}/patient/delete/${patientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchPatients();
    } catch (err) {
      console.error("Erreur lors de la suppression du patient", err);
      alert(err.response?.data?.message || "Erreur lors de la suppression du patient.");
    }
  };

  // --- Search logic ---
  const q = search.trim().toLowerCase();
  const filteredPatients = q
    ? patients.filter((p) => {
        const fullName = `${p.prenom ?? ""} ${p.nom ?? ""}`.toLowerCase();
        return (
          fullName.includes(q) ||
          (p.nom ?? "").toLowerCase().includes(q) ||
          (p.prenom ?? "").toLowerCase().includes(q) ||
          (p.telephone ?? "").toLowerCase().includes(q) ||
          (p.adresse ?? "").toLowerCase().includes(q)
        );
      })
    : patients;

  useEffect(() => {
    setCurrentPage(1); // reset to first page whenever the search query changes
  }, [search]);

  // --- Pagination logic ---
  const totalPages = Math.ceil(filteredPatients.length / PAGE_SIZE);
  const paginatedPatients = filteredPatients.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Build page numbers with ellipsis: [1, ..., 4, 5, 6, ..., 10]
  const getPageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [];
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  };

  return (
    <div style={{ padding: "24px 28px", minHeight: "100%" }}>
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "24px",
              fontWeight: 700,
              color: C.text,
              margin: 0,
              letterSpacing: "-0.5px",
            }}
          >
            Historique des consultations
          </h2>
          <p style={{ fontSize: "13px", color: C.textSoft, marginTop: "4px", margin: 0 }}>
            Gérer et suivre l'historique médical global des patients.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* SEARCH BOX */}
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "14px",
                color: C.textSoft,
                pointerEvents: "none",
              }}
            >
              🔍
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un patient..."
              style={{
                width: "240px",
                padding: "9px 12px 9px 34px",
                borderRadius: "10px",
                border: `1px solid ${C.border}`,
                background: C.surface,
                color: C.text,
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.15s, box-shadow 0.15s",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = C.teal;
                e.currentTarget.style.boxShadow = `0 0 0 3px ${C.shadow}`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                aria-label="Effacer la recherche"
                style={{
                  position: "absolute",
                  right: "8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: C.textSoft,
                  fontSize: "13px",
                  padding: "2px 4px",
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            )}
          </div>

          <button
            onClick={() => setOpenModal(true)}
            style={{
              background: `linear-gradient(135deg, ${C.teal}, ${C.tealMid})`,
              color: "#FFFFFF",
              fontWeight: 600,
              fontSize: "14px",
              padding: "10px 18px",
              borderRadius: "10px",
              border: "none",
              cursor: "pointer",
              boxShadow: `0 4px 12px ${C.shadow}`,
              transition: "transform 0.15s ease, opacity 0.15s ease",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            + Nouveau patient
          </button>
        </div>
      </div>

      {/* TABLE CONTAINER */}
      <div
        style={{
          background: C.surface,
          borderRadius: "16px",
          border: `1px solid ${C.border}`,
          boxShadow: `0 4px 18px ${C.shadow}`,
          overflow: "hidden",
          padding: "12px",
          transition: "background 0.3s, border 0.3s",
        }}
      >
        {filteredPatients.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: C.textSoft }}>
            <div style={{ fontSize: "32px", marginBottom: "10px", opacity: 0.5 }}>🔍</div>
            <p style={{ fontSize: "14px", margin: 0 }}>
              {search
                ? `Aucun patient ne correspond à "${search}".`
                : "Aucun patient enregistré."}
            </p>
          </div>
        ) : (
          <TablePatients
            patients={paginatedPatients}
            isDark={dark}
            themeColors={C}
            onDeletePatient={handleDeletePatient}
            onPatientUpdated={fetchPatients}
            canDelete
            canEdit
          />
        )}

        {/* PAGINATION BAR */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "16px",
              padding: "8px 4px 4px",
              borderTop: `1px solid ${C.border}`,
            }}
          >
            {/* Count label */}
            <span style={{ fontSize: "13px", color: C.textSoft }}>
              {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, filteredPatients.length)} sur {filteredPatients.length} patients
            </span>

            {/* Page buttons */}
            <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
              {/* Prev */}
              <PageBtn
                label="‹"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                C={C}
              />

              {getPageNumbers().map((p, i) =>
                p === "..." ? (
                  <span
                    key={`ellipsis-${i}`}
                    style={{ padding: "0 6px", color: C.textSoft, fontSize: "14px" }}
                  >
                    …
                  </span>
                ) : (
                  <PageBtn
                    key={p}
                    label={p}
                    active={p === currentPage}
                    onClick={() => setCurrentPage(p)}
                    C={C}
                  />
                )
              )}

              {/* Next */}
              <PageBtn
                label="›"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                C={C}
              />
            </div>
          </div>
        )}
      </div>

      <ModalPatient
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
        onSuccess={fetchPatients}
        isDark={dark}
      />
    </div>
  );
}

function PageBtn({ label, active, disabled, onClick, C }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: "32px",
        height: "32px",
        padding: "0 8px",
        borderRadius: "8px",
        border: active ? "none" : `1px solid ${C.border}`,
        background: active
          ? `linear-gradient(135deg, ${C.teal}, ${C.tealMid})`
          : "transparent",
        color: active ? "#fff" : disabled ? C.textSoft : C.text,
        fontWeight: active ? 700 : 500,
        fontSize: "14px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition: "background 0.15s, color 0.15s",
      }}
    >
      {label}
    </button>
  );
}