import { useState, useEffect } from "react";
import { API_BASE } from '../../config/api';
const API = `${API_BASE}`;
// ─── PALETTES ────────────────────────────────────────────────────────────────
const LIGHT = {
  bg: "#F0F4F8", surface: "#FFFFFF", surfaceAlt: "#FAFBFC",
  border: "#E2E8F0", text: "#0F2942", textSoft: "#64748B",
  teal: "#0E7490", tealLight: "#CFFAFE", tealMid: "#06B6D4",
  slateLight: "#F1F5F9", shadow: "rgba(15,41,66,0.07)",
  headerBg: "#FFFFFF", headerShadow: "0 2px 12px rgba(15,41,66,0.05)",
};

const DARK = {
  bg: "#0D1520", surface: "#141E2E", surfaceAlt: "#1A2539",
  border: "#253047", text: "#E2EAF4", textSoft: "#7B93B8",
  teal: "#22D3EE", tealLight: "#083344", tealMid: "#06B6D4",
  slateLight: "#1E2B3E", shadow: "rgba(0,0,0,0.3)",
  headerBg: "#141E2E", headerShadow: "0 2px 16px rgba(0,0,0,0.35)",
};

// ─── DARK TOGGLE ─────────────────────────────────────────────────────────────
function DarkToggle({ C, dark, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "7px 14px", borderRadius: 20,
        background: dark ? "#1E2B3E" : C.slateLight,
        border: `1.5px solid ${C.border}`,
        cursor: "pointer",
      }}
    >
      <div style={{
        width: 36, height: 20, borderRadius: 10,
        background: dark ? C.teal : "#CBD5E1",
        position: "relative",
      }}>
        <div style={{
          position: "absolute",
          top: 3,
          left: 3,
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: "#fff",
          transform: dark ? "translateX(16px)" : "translateX(0)",
          transition: "transform .25s",
        }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color: C.textSoft }}>
        {dark ? "🌙" : "☀️"}
      </span>
    </button>
  );
}

// ─── HEADER ──────────────────────────────────────────────────────────────────
export default function ReceptionistHeader({ onNewPatient }) {
  const [dark, setDark] = useState(() => localStorage.getItem("med-theme") === "dark");
  const [now, setNow]   = useState(new Date());
  const [user, setUser] = useState(null);

  const C = dark ? DARK : LIGHT;

  // clock
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  // Paint body background to match the current theme.
  // The cleanup function resets body when the header unmounts (e.g. on logout),
  // so the login page is never left sitting on top of a dark body background.
  useEffect(() => {
    document.body.style.background  = C.bg;
    document.body.style.transition  = "background 0.3s";
    return () => {
      document.body.style.background = "";
      document.body.style.transition = "";
    };
  }, [C.bg]);

  // fetch user
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
        console.error("Error loading user:", err);
      }
    };
    fetchMe();
  }, []);

  const toggleDark = () => {
    setDark((d) => {
      const next = !d;
      localStorage.setItem("med-theme", next ? "dark" : "light");
      window.dispatchEvent(new CustomEvent("med-theme-change", { detail: next }));
      return next;
    });
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
      `}</style>

      <header style={{
        height: 66,
        padding: "0 28px",
        background: C.headerBg,
        borderBottom: `1px solid ${C.border}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>

        {/* LEFT */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 40, height: 40,
            borderRadius: 12,
            background: `linear-gradient(135deg, ${C.teal}, ${C.tealMid})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, color: "#fff",
          }}>
            ✚
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: C.text }}>DAWINI</div>
            <div style={{ fontSize: 11, color: C.textSoft }}>{user?.nom} {user?.prenom}</div>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>

          {/* CLOCK */}
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
              {now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </div>
            <div style={{ fontSize: 12, color: C.teal }}>
              {now.toLocaleTimeString("fr-FR")}
            </div>
          </div>

          {/* DARK MODE */}
          <DarkToggle C={C} dark={dark} onToggle={toggleDark} />

          {/* USER */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "6px 14px 6px 6px",
            background: C.surfaceAlt,
            border: `1.5px solid ${C.border}`,
            borderRadius: 40,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%",
              background: `linear-gradient(135deg, ${C.teal}, ${C.tealMid})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 800, fontSize: 13,
            }}>
              {user?.nom?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>
                {user?.nom} {user?.prenom}
              </div>
              <div style={{ fontSize: 10, color: C.textSoft }}>
                {user?.role || "Réceptionniste"}
              </div>
            </div>
          </div>

        </div>
      </header>
    </>
  );
}