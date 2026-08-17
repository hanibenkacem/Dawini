import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { HashRouter as BrowserRouter } from 'react-router-dom';

import Login from "./pages/login";
import PageConsultation from "./pages/PageConsultation";
import ProtectedRoute from './components/ProtectedRoute';
import ReceptionDashboard from './pages/reception/ReceptionDashboard';
import PatientDossier from "./pages/PatientDossier";
import DoctorDashboard from "./pages/DoctorDashboard";
import OrdonnanceSettings from './pages/OrdonnanceSettings';
import ReceptionRendezvous from './pages/reception/ReceptionRendezVous';
import MainLayout from './components/MainLayout'; // Import your new layout
import ReceptionPaiements from './pages/ReceptionPaiements';
import Statistiques from './pages/Statistiques';
import AdminDashboard from './pages/AdminDashboard';
import ActivationScreen from './components/ActivationScreen';

function App() {
  const [licenseOk, setLicenseOk] = useState(false);

  // Blocks everything below until the trial is active or the license
  // validates for this machine. See electron/licensing/licenseManager.js
  // for what determines licenseOk — this component never bypasses it.
  if (!licenseOk) {
    return <ActivationScreen onUnlocked={() => setLicenseOk(true)} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Login Route */}
        <Route path='/' element={<Login />} />
        <Route path="/admin-dashboard" element={
  <ProtectedRoute allowedRoles={["admin"]}>
    <AdminDashboard />
  </ProtectedRoute>
} />
        
        {/* Wrap all authenticated layouts together */}
        <Route element={<MainLayout />}>
          
          {/* Medecin Authorized Routes */}
          <Route path="/doctor-dashboard" element={ <ProtectedRoute allowedRoles={["medecin"]}><DoctorDashboard /></ProtectedRoute>} />
          <Route path="/consultation" element={ <ProtectedRoute allowedRoles={["medecin"]}><PageConsultation /></ProtectedRoute>} />
          <Route path="/ordonnance-settings" element={ <ProtectedRoute allowedRoles={["medecin"]}><OrdonnanceSettings /></ProtectedRoute>} />
          
          {/* Receptionniste Authorized Routes */}
          <Route path="/reception-dashboard" element={ <ProtectedRoute allowedRoles={["receptionniste","medecin"]}><ReceptionDashboard /></ProtectedRoute> } />
          <Route path="/reception-rendezvous" element={ <ProtectedRoute allowedRoles={["receptionniste","medecin"]}><ReceptionRendezvous/></ProtectedRoute>} />
          <Route path="/reception-paiements" element={ <ProtectedRoute allowedRoles={["receptionniste","medecin"]}><ReceptionPaiements/></ProtectedRoute>} />
          <Route path="/reception-statistiques" element={ <ProtectedRoute allowedRoles={["receptionniste","medecin"]}><Statistiques/></ProtectedRoute>} />

          {/* Shared Access Routes */}
          <Route path="/patient/:id" element={ <ProtectedRoute allowedRoles={["medecin"]}><PatientDossier /></ProtectedRoute>} />
        
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;