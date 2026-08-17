import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import ReceptionistSidebar from "./reception/ReceptionistSideBar"; // Update this path if needed
import ReceptionistHeader from "./reception/ReceptionistHeader";   // Update this path if needed
import { QueueAlertProvider } from "../context/QueueAlertContext"; // Update this path if needed

const LIGHT = { bg: "#F0F4F8" };
const DARK = { bg: "#0D1520" };

export default function MainLayout() {
  const [dark, setDark] = useState(
    () => localStorage.getItem("med-theme") === "dark"
  );
  const navigate = useNavigate();

  useEffect(() => {
    const handleThemeChange = (e) => setDark(e.detail);
    window.addEventListener("med-theme-change", handleThemeChange);
    return () => window.removeEventListener("med-theme-change", handleThemeChange);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const C = dark ? DARK : LIGHT;

  return (
    // QueueAlertProvider lives here, above the Outlet, so polling/sounds/the
    // payment modal keep running no matter which page is rendered inside the
    // Outlet — it only unmounts on logout (when MainLayout itself unmounts).
    <QueueAlertProvider>
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          width: "100vw",
          background: C.bg,
          transition: "background 0.3s ease",
          overflowX: "hidden",
        }}
      >
        {/* SINGLE SIDEBAR INSTANCE */}
        <ReceptionistSidebar onLogout={handleLogout} />

        {/* VIEWPORT CONTROLLER */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* SINGLE HEADER INSTANCE */}
          <ReceptionistHeader />

          {/* COMPONENT OUTLET TARGET */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            <Outlet context={{ dark }} />
          </div>
        </div>
      </div>
    </QueueAlertProvider>
  );
}