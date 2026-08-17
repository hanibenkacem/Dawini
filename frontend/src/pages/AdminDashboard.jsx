import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { API_BASE } from '../config/api';
const API = `${API_BASE}/api/admin`;
const getToken = () => localStorage.getItem("token");

const roleLabel = (role) =>
  role === "medecin" ? "Médecin" : role === "receptionniste" ? "Réceptionniste" : role === "admin" ? "Administrateur" : role;

const roleBadge = (role) => {
  const styles = {
    medecin: { background: "#dbeafe", color: "#1d4ed8" },
    receptionniste: { background: "#dcfce7", color: "#15803d" },
    admin: { background: "#fce7f3", color: "#9d174d" },
  };
  return styles[role] || { background: "#f3f4f6", color: "#374151" };
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [modal, setModal] = useState(null); // null | 'create' | 'edit' | 'delete'
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ nom: "", prenom: "", email: "", role: "medecin", mot_de_passe: "" });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/users`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Échec du chargement des utilisateurs");
      const data = await res.json();
      setUsers(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const openCreate = () => {
    setForm({ nom: "", prenom: "", email: "", role: "medecin", mot_de_passe: "" });
    setModal("create");
  };

  const openEdit = (user) => {
    setSelected(user);
    setForm({ nom: user.nom, prenom: user.prenom, email: user.email, role: user.role, mot_de_passe: "" });
    setModal("edit");
  };

  const openDelete = (user) => {
    setSelected(user);
    setModal("delete");
  };

  const closeModal = () => { setModal(null); setSelected(null); };

  // Logging out this way, instead of window.location.href = "/", matters in
  // the packaged Electron build: the app runs on file:// (no server), and
  // "/" resolves to the filesystem root (C:/) instead of the app's hash
  // route, which is exactly the blank-page-navigates-to-C:/ bug. Using the
  // router's own navigate() keeps it inside the HashRouter regardless of
  // protocol — same pattern as MainLayout's handleLogout.
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const isEdit = modal === "edit";
      const url = isEdit ? `${API}/users/${selected.id}` : `${API}/users`;
      const body = { ...form };
      if (isEdit && !body.mot_de_passe) delete body.mot_de_passe;

      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Une erreur est survenue");
      showToast(isEdit ? "Utilisateur mis à jour avec succès !" : "Utilisateur créé avec succès !");
      closeModal();
      fetchUsers();
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/users/${selected.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Une erreur est survenue");
      showToast("Utilisateur supprimé.");
      closeModal();
      fetchUsers();
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const filtered = users.filter((u) => {
    const matchRole = filterRole === "all" || u.role === filterRole;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      u.nom.toLowerCase().includes(q) ||
      u.prenom.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  const doctors = users.filter((u) => u.role === "medecin").length;
  const receptionists = users.filter((u) => u.role === "receptionniste").length;

  return (
    <div style={styles.page}>
      {/* HEADER */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.headerTitle}>Tableau de bord administrateur</h1>
          <p style={styles.headerSub}>Système de gestion médicale</p>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          Déconnexion
        </button>
      </header>

      <main style={styles.main}>
        {/* STATS */}
        <div style={styles.statsRow}>
          {[
            { label: "Utilisateurs au total", value: users.length, color: "#6366f1" },
            { label: "Médecins", value: doctors, color: "#0ea5e9" },
            { label: "Réceptionnistes", value: receptionists, color: "#10b981" },
          ].map((s) => (
            <div key={s.label} style={{ ...styles.statCard, borderTop: `4px solid ${s.color}` }}>
              <span style={{ ...styles.statValue, color: s.color }}>{s.value}</span>
              <span style={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* TOOLBAR */}
        <div style={styles.toolbar}>
          <div style={styles.toolbarLeft}>
            <input
              placeholder="Rechercher par nom ou email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={styles.searchInput}
            />
            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} style={styles.select}>
              <option value="all">Tous les rôles</option>
              <option value="medecin">Médecins</option>
              <option value="receptionniste">Réceptionnistes</option>
            </select>
          </div>
          <button onClick={openCreate} style={styles.primaryBtn}>+ Nouvel utilisateur</button>
        </div>

        {/* TABLE */}
        {loading ? (
          <div style={styles.center}>Chargement des utilisateurs…</div>
        ) : error ? (
          <div style={{ ...styles.center, color: "#ef4444" }}>{error}</div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {["#", "Nom", "Prénom", "Email", "Rôle", "Actions"].map((h) => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "#9ca3af" }}>Aucun utilisateur trouvé.</td></tr>
                ) : (
                  filtered.map((u, i) => (
                    <tr key={u.id} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                      <td style={styles.td}>{i + 1}</td>
                      <td style={styles.td}>{u.nom}</td>
                      <td style={styles.td}>{u.prenom}</td>
                      <td style={styles.td}>{u.email}</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge, ...roleBadge(u.role) }}>
                          {roleLabel(u.role)}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <button onClick={() => openEdit(u)} style={styles.editBtn}>Modifier</button>
                        <button onClick={() => openDelete(u)} style={styles.deleteBtn}>Supprimer</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* MODAL: CREATE / EDIT */}
      {(modal === "create" || modal === "edit") && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>{modal === "create" ? "Créer un nouvel utilisateur" : "Modifier l'utilisateur"}</h2>
            {[
              { label: "Nom", key: "nom" },
              { label: "Prénom", key: "prenom" },
              { label: "Email", key: "email", type: "email" },
              { label: modal === "edit" ? "Nouveau mot de passe (laisser vide pour conserver)" : "Mot de passe", key: "mot_de_passe", type: "password" },
            ].map(({ label, key, type = "text" }) => (
              <div key={key} style={styles.formGroup}>
                <label style={styles.label}>{label}</label>
                <input
                  type={type}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  style={styles.input}
                />
              </div>
            ))}
            <div style={styles.formGroup}>
              <label style={styles.label}>Rôle</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} style={styles.input}>
                <option value="medecin">Médecin</option>
                <option value="receptionniste">Réceptionniste</option>
              </select>
            </div>
            <div style={styles.modalActions}>
              <button onClick={closeModal} style={styles.cancelBtn}>Annuler</button>
              <button onClick={handleSave} disabled={saving} style={styles.primaryBtn}>
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE */}
      {modal === "delete" && selected && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>Supprimer l'utilisateur</h2>
            <p style={{ color: "#374151", marginBottom: "1.5rem" }}>
              Êtes-vous sûr de vouloir supprimer <strong>{selected.prenom} {selected.nom}</strong> ? Cette action est irréversible.
            </p>
            <div style={styles.modalActions}>
              <button onClick={closeModal} style={styles.cancelBtn}>Annuler</button>
              <button onClick={handleDelete} disabled={saving} style={{ ...styles.primaryBtn, background: "#ef4444" }}>
                {saving ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div style={{ ...styles.toast, background: toast.type === "error" ? "#ef4444" : "#10b981" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#f8fafc", fontFamily: "'Segoe UI', sans-serif" },
  header: { background: "#1e293b", color: "#fff", padding: "1.25rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { margin: 0, fontSize: "1.5rem", fontWeight: 700 },
  headerSub: { margin: "0.2rem 0 0", fontSize: "0.85rem", color: "#94a3b8" },
  logoutBtn: { background: "transparent", border: "1px solid #475569", color: "#94a3b8", padding: "0.4rem 1rem", borderRadius: 6, cursor: "pointer", fontSize: "0.85rem" },
  main: { maxWidth: 1100, margin: "0 auto", padding: "2rem" },
  statsRow: { display: "flex", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap" },
  statCard: { flex: 1, minWidth: 140, background: "#fff", borderRadius: 10, padding: "1.2rem 1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", display: "flex", flexDirection: "column", gap: 4 },
  statValue: { fontSize: "2rem", fontWeight: 800, lineHeight: 1 },
  statLabel: { fontSize: "0.85rem", color: "#6b7280" },
  toolbar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" },
  toolbarLeft: { display: "flex", gap: "0.75rem", flexWrap: "wrap" },
  searchInput: { padding: "0.5rem 0.9rem", border: "1px solid #d1d5db", borderRadius: 7, fontSize: "0.9rem", width: 240, outline: "none" },
  select: { padding: "0.5rem 0.9rem", border: "1px solid #d1d5db", borderRadius: 7, fontSize: "0.9rem", background: "#fff", cursor: "pointer" },
  primaryBtn: { background: "#4f46e5", color: "#fff", border: "none", borderRadius: 7, padding: "0.55rem 1.2rem", fontSize: "0.9rem", cursor: "pointer", fontWeight: 600 },
  tableWrap: { background: "#fff", borderRadius: 12, boxShadow: "0 1px 6px rgba(0,0,0,0.07)", overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { background: "#f1f5f9", padding: "0.85rem 1rem", textAlign: "left", fontSize: "0.8rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em" },
  td: { padding: "0.85rem 1rem", fontSize: "0.9rem", color: "#374151" },
  trEven: { background: "#fff" },
  trOdd: { background: "#f9fafb" },
  badge: { padding: "0.25rem 0.75rem", borderRadius: 999, fontSize: "0.78rem", fontWeight: 600 },
  editBtn: { background: "#e0e7ff", color: "#4338ca", border: "none", borderRadius: 6, padding: "0.35rem 0.8rem", cursor: "pointer", fontSize: "0.82rem", marginRight: 6, fontWeight: 600 },
  deleteBtn: { background: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: 6, padding: "0.35rem 0.8rem", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 },
  center: { textAlign: "center", padding: "3rem", color: "#6b7280" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { background: "#fff", borderRadius: 14, padding: "2rem", width: "100%"
    , maxWidth: 460, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" },
  modalTitle: { margin: "0 0 1.5rem", fontSize: "1.2rem", fontWeight: 700, color: "#1e293b" },
  formGroup: { marginBottom: "1rem" },
  label: { display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: 4 },
  input: { width: "100%", padding: "0.55rem 0.8rem", border: "1px solid #d1d5db", borderRadius: 7, fontSize: "0.9rem", boxSizing: "border-box", outline: "none" },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" },
  cancelBtn: { background: "#f1f5f9", color: "#374151", border: "none", borderRadius: 7, padding: "0.55rem 1.2rem", fontSize: "0.9rem", cursor: "pointer", fontWeight: 600 },
  toast: { position: "fixed", bottom: "2rem", right: "2rem", color: "#fff", padding: "0.9rem 1.5rem", borderRadius: 10, fontWeight: 600, fontSize: "0.9rem", boxShadow: "0 4px 20px rgba(0,0,0,0.2)", zIndex: 2000 },
};