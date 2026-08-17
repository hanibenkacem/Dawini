import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

// 1. Change allowedRole to allowedRoles (expecting an array now)
export default function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  try {
    const decoded = jwtDecode(token);
    const userRole = decoded.role;

    // Check for expiration
    const isExpired = decoded.exp * 1000 < Date.now();
    if (isExpired) {
      localStorage.removeItem("token");
      return <Navigate to="/" replace />;
    }

    // 2. Updated Role-based Authorization check using .includes()
    if (allowedRoles && !allowedRoles.includes(userRole)) {
      // If a user tries to access a route they aren't allowed in, 
      // redirect them to their specific "home"
      const fallback = 
      userRole === "admin" ? "/admin-dashboard" :
      userRole === "medecin" ? "/doctor-dashboard" : 
      "/reception-dashboard";
            return <Navigate to={fallback} replace />;
    }

    return children;
  } catch (error) {
    localStorage.removeItem("token");
    return <Navigate to="/" replace />;
  }
}