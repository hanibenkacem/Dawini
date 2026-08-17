import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { API_BASE } from '../../config/api';
const API = `${API_BASE}`;
const LIGHT = {
  bg: "#F0F4F8", surface: "#FFFFFF", surfaceAlt: "#FAFBFC",
  border: "#E2E8F0", text: "#0F2942", textSoft: "#64748B",
  teal: "#0E7490", tealLight: "#CFFAFE", tealMid: "#06B6D4",
  slateLight: "#F1F5F9", red: "#DC2626",
  shadow: "rgba(15,41,66,0.07)",
  sidebarBg: "#FFFFFF", sidebarActive: "#EFF6FF", rowHover: "#F1F5F9",
};
const DARK = {
  bg: "#0D1520", surface: "#141E2E", surfaceAlt: "#1A2539",
  border: "#253047", text: "#E2EAF4", textSoft: "#7B93B8",
  teal: "#22D3EE", tealLight: "#083344", tealMid: "#06B6D4",
  slateLight: "#1E2B3E", red: "#F87171",
  shadow: "rgba(0,0,0,0.3)",
  sidebarBg: "#141E2E", sidebarActive: "#1A2D45", rowHover: "#1A2539",
};

// ─── NAV ITEMS — each item declares which roles can see it ────────────────────
const NAV = [
  {
    section: "Principal",
    items: [
      {
        id: "doctor-dashboard",
        label: "Tableau de bord",
        icon: "🩺",
        path: "/doctor-dashboard",
        roles: ["medecin"],                          // doctor only
      },
      {
        id: "file-attente",
        label: "File d'attente",
        icon: "🏥",
        path: "/reception-dashboard",
        roles: ["medecin", "receptionniste"],
      },
      {
        id: "rendez-vous",
        label: "Rendez-vous",
        icon: "📅",
        path: "/reception-rendezvous",
        roles: ["medecin", "receptionniste"],
      },
      {
        id: "consultations",
        label: "Historique des consultations",
        icon: "📜",
        path: "/consultation",
        roles: ["medecin"],                          // doctor only
      },
    ],
  },
  {
    section: "Réception",
    items: [
      {
        id: "paiements",
        label: "Paiements",
        icon: "💳",
        path: "/reception-paiements",
        roles: ["medecin", "receptionniste"],
      },
      {
        id: "statistiques",
        label: "Statistiques",
        icon: "📊",
        path: "/reception-statistiques",
        roles: ["medecin", "receptionniste"],
      },
    ],
  },
  {
    section: "Paramètres",
    items: [
      {
        id: "ordonnance-settings",
        label: "Paramètres d'ordonnance",
        icon: "📝",
        path: "/ordonnance-settings",
        roles: ["medecin"],                          // doctor only
      },
     
    ],
  },
];

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
export default function ReceptionistSidebar({ badges = {}, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [dark, setDark]         = useState(() => localStorage.getItem("med-theme") === "dark");
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser]         = useState(null);

  const C = dark ? DARK : LIGHT;
  const W = collapsed ? 64 : 240;

  useEffect(() => {
    const handler = (e) => setDark(e.detail);
    window.addEventListener("med-theme-change", handler);
    return () => window.removeEventListener("med-theme-change", handler);
  }, []);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const token = localStorage.getItem("token");
        const res   = await fetch(`${API}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setUser(data);
      } catch (err) {
        console.error("Erreur récupération utilisateur", err);
      }
    };
    fetchMe();
  }, []);

  // ── Filter nav by the logged-in user's role ──────────────────────────────
  const userRole    = user?.role?.toLowerCase() ?? null;
  const filteredNav = NAV
    .map(section => ({
      ...section,
      items: section.items.filter(item =>
        !userRole || item.roles.includes(userRole)
      ),
    }))
    .filter(section => section.items.length > 0); // hide empty sections

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        @keyframes sideSlide {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .med-nav-item    { transition: background .15s, color .15s; }
        .med-nav-item:hover { background: ${C.rowHover} !important; }
        .med-collapse-btn:hover { background: ${C.slateLight} !important; }
        .med-logout-btn:hover   { color: ${C.red} !important; }
      `}</style>

      <aside style={{
        width: W, minWidth: W, height: "100vh",
        background: C.sidebarBg, borderRight: `1px solid ${C.border}`,
        display: "flex", flexDirection: "column",
        position: "sticky", top: 0,
        transition: "width .25s cubic-bezier(.4,0,.2,1), min-width .25s cubic-bezier(.4,0,.2,1), background .3s",
        overflow: "hidden",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        boxShadow: `2px 0 12px ${C.shadow}`,
        zIndex: 100,
      }}>

        {/* ── TOP BAR ── */}
        <div style={{
          height: 66, padding: "0 14px",
          display: "flex", alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          borderBottom: `1px solid ${C.border}`, flexShrink: 0,
        }}>
          {!collapsed && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, animation: "fadeIn .2s ease" }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                background: `linear-gradient(135deg, ${C.teal}, ${C.tealMid})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, boxShadow: `0 3px 8px ${C.shadow}`,
              }}>✚</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: C.text, lineHeight: 1.1, letterSpacing: "-0.3px" }}>DAWINI</div>
                <div style={{ fontSize: 11, color: C.textSoft, fontWeight: 600, marginTop: 2 }}>
                  {user?.nom} {user?.prenom}
                </div>
              </div>
            </div>
          )}

          <button className="med-collapse-btn" onClick={() => setCollapsed(c => !c)}
            title={collapsed ? "Développer" : "Réduire"} style={{
              background: "none", border: "none", cursor: "pointer",
              width: 28, height: 28, borderRadius: 7,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: C.textSoft, fontSize: 15, transition: "background .15s", flexShrink: 0,
            }}>
            {collapsed ? "→" : "←"}
          </button>
        </div>

        {/* ── NAVIGATION ── */}
        <nav style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "10px 8px" }}>
          {filteredNav.map((sec, si) => (
            <div key={sec.section} style={{ marginBottom: 4, animation: `sideSlide .2s ease ${si * 0.05}s both` }}>

              {!collapsed ? (
                <div style={{
                  fontSize: 10, fontWeight: 700, color: C.textSoft,
                  letterSpacing: "0.1em", textTransform: "uppercase",
                  padding: "10px 10px 4px", opacity: 0.65,
                }}>
                  {sec.section}
                </div>
              ) : (
                si > 0 && <div style={{ height: 1, background: C.border, margin: "8px 6px" }} />
              )}

              {sec.items.map(item => {
                const isActive   = location.pathname === item.path;
                const badgeCount = badges[item.id];

                return (
                  <button key={item.id} className="med-nav-item"
                    onClick={() => navigate(item.path)}
                    title={collapsed ? item.label : undefined}
                    style={{
                      width: "100%",
                      display: "flex", alignItems: "center",
                      gap: collapsed ? 0 : 11,
                      justifyContent: collapsed ? "center" : "flex-start",
                      padding: collapsed ? "10px 0" : "9px 12px",
                      borderRadius: 10, border: "none", cursor: "pointer",
                      background: isActive ? C.sidebarActive : "transparent",
                      color: isActive ? C.teal : C.textSoft,
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontWeight: isActive ? 700 : 500,
                      fontSize: 13, position: "relative",
                      marginBottom: 2, textAlign: "left",
                    }}>

                    {isActive && (
                      <div style={{
                        position: "absolute", left: 0, top: "20%", bottom: "20%",
                        width: 3, borderRadius: "0 3px 3px 0", background: C.teal,
                      }} />
                    )}

                    <span style={{ fontSize: 17, lineHeight: 1, flexShrink: 0 }}>{item.icon}</span>

                    {!collapsed && (
                      <>
                        <span style={{
                          flex: 1, animation: "fadeIn .15s ease",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                          {item.label}
                        </span>
                        {badgeCount > 0 && (
                          <span style={{
                            background: isActive ? C.teal : C.red,
                            color: "#fff", borderRadius: 20, padding: "2px 7px",
                            fontSize: 11, fontWeight: 700, lineHeight: 1.4, flexShrink: 0,
                          }}>
                            {badgeCount}
                          </span>
                        )}
                      </>
                    )}

                    {collapsed && badgeCount > 0 && (
                      <span style={{
                        position: "absolute", top: 6, right: 8,
                        width: 8, height: 8, borderRadius: "50%",
                        background: C.red, border: `2px solid ${C.sidebarBg}`,
                      }} />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* ── FOOTER ── */}
        <div style={{ padding: collapsed ? "12px 8px" : "12px", borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
          {!collapsed ? (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 12,
              background: C.slateLight, animation: "fadeIn .2s ease",
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                background: `linear-gradient(135deg, ${C.teal}, ${C.tealMid})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: 13, color: "#fff",
              }}>
                {user?.nom?.charAt(0)?.toUpperCase() ?? "U"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 700, color: C.text, lineHeight: 1.2,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {user?.nom} {user?.prenom}
                </div>
                <div style={{ fontSize: 11, color: C.textSoft }}>
                  {user?.role === "medecin" ? "Médecin" : "Réceptionniste"}
                </div>
              </div>
              {onLogout && (
                <button className="med-logout-btn" onClick={onLogout} title="Déconnexion" style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: C.textSoft, fontSize: 16, padding: 4,
                  borderRadius: 6, transition: "color .15s", flexShrink: 0,
                }}>⏻</button>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div style={{
                width: 34, height: 34, borderRadius: "50%",
                background: `linear-gradient(135deg, ${C.teal}, ${C.tealMid})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: 13, color: "#fff",
                cursor: onLogout ? "pointer" : "default",
              }}
                title={onLogout ? "Déconnexion" : `${user?.nom ?? ""} ${user?.prenom ?? ""}`}
                onClick={onLogout}
              >
                {user?.nom?.charAt(0)?.toUpperCase() ?? "U"}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}