import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE } from '../config/api';

const LOGIN_STYLE_ID = "login-page-styles";

const LOGIN_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes shake {
    0%,100% { transform: translateX(0); }
    20% { transform: translateX(-6px); }
    40% { transform: translateX(6px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
  }

  .fade-up-1 { animation: fadeUp 0.5s ease 0.1s both; }
  .fade-up-2 { animation: fadeUp 0.5s ease 0.2s both; }
  .fade-up-3 { animation: fadeUp 0.5s ease 0.3s both; }
  .fade-up-4 { animation: fadeUp 0.5s ease 0.4s both; }
  .fade-up-5 { animation: fadeUp 0.5s ease 0.5s both; }
  .fade-up-6 { animation: fadeUp 0.5s ease 0.6s both; }
  .do-shake  { animation: shake 0.45s ease both; }

  .spinner {
    width: 18px; height: 18px;
    border: 2px solid rgba(255,255,255,0.35);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }

  .custom-input:focus {
    outline: none;
    border-color: #0ea5e9;
    box-shadow: 0 0 0 3px rgba(14,165,233,0.15);
  }

  .grid-dots {
    background-image: radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px);
    background-size: 20px 20px;
  }
`;

export default function Login() {
  const [Prenom, setPrenom] = useState("");
  const [MotDePasse, setMotDePasse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Inject page-scoped CSS into <head> once, remove it cleanly on unmount.
  // This avoids leaving orphaned <style> tags in the DOM that can
  // override Tailwind's stylesheet after navigating away (e.g. after logout).
  useEffect(() => {
    let styleTag = document.getElementById(LOGIN_STYLE_ID);
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = LOGIN_STYLE_ID;
      styleTag.textContent = LOGIN_CSS;
      document.head.appendChild(styleTag);
    }
    return () => {
      const tag = document.getElementById(LOGIN_STYLE_ID);
      if (tag) tag.remove();
    };
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(false);
    try {
      const res = await axios.post(`${API_BASE}/user/login`, {
        prenom: Prenom,
        mot_de_passe: MotDePasse,
      });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role); // 👈 add this
      console.log(res.data.role)
      console.log(res.data)
      const userRole = res.data.role; 

      // 3. Logic-based redirection
      if (userRole === "medecin") {
        navigate("/doctor-dashboard");
      } else if (userRole === "receptionniste") {
        navigate("/reception-dashboard");
      
      }
      else if(userRole ==="admin"){
        navigate("/admin-dashboard")

      } else {
        navigate("/dashboard"); // Fallback
      }

    } catch (err) {
      console.log(err);
      setError(true);
      setTimeout(() => setError(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      className="min-h-screen bg-slate-50 flex items-center justify-center p-4">

      {/* Floating medical crosses */}
      <span className="fixed top-10 left-10 text-sky-200 text-4xl select-none pointer-events-none">+</span>
      <span className="fixed top-28 right-16 text-cyan-200 text-3xl select-none pointer-events-none">+</span>
      <span className="fixed bottom-20 left-20 text-teal-200 text-2xl select-none pointer-events-none">+</span>
      <span className="fixed bottom-10 right-10 text-sky-200 text-4xl select-none pointer-events-none">+</span>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 rounded-3xl overflow-hidden shadow-2xl shadow-sky-900/10 border border-slate-200/80">

        {/* ── LEFT PANEL ── */}
        <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-sky-600 via-sky-500 to-cyan-400 p-10 relative overflow-hidden">

          <div className="absolute inset-0 grid-dots" />
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-sky-900/20 rounded-full blur-2xl" />

          {/* Logo */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center backdrop-blur-sm">
              <svg width="18" height="18" fill="none" viewBox="0 0 20 20">
                <rect x="8" y="1" width="4" height="18" rx="2" fill="white"/>
                <rect x="1" y="8" width="18" height="4" rx="2" fill="white"/>
              </svg>
            </div>
            <span className="text-white font-bold text-xl tracking-wide">Dawini</span>
          </div>

          {/* Hero text */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-4 py-1.5 mb-6 backdrop-blur-sm">
              <span className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse" />
              <span className="text-white/90 text-xs font-semibold tracking-widest uppercase">Portail Médical Sécurisé</span>
            </div>
            <h1 className="text-4xl font-bold text-white leading-snug mb-4">
              Votre santé,<br />
              <span className="text-cyan-100 italic font-light">entre de bonnes</span><br />
              mains.
            </h1>
            <p className="text-sky-100 text-sm font-light leading-relaxed max-w-xs">
              Consultez vos dossiers médicaux, ordonnances et rendez-vous depuis un espace unifié et chiffré.
            </p>
          </div>

          {/* Stats */}
          <div className="relative z-10 grid grid-cols-3 gap-3">
            {[
              { val: "24/7", label: "Disponible" },
              { val: "99.9%", label: "Fiabilité" },
              { val: "256-bit", label: "Chiffrement" },
            ].map((s) => (
              <div key={s.val} className="bg-white/10 border border-white/20 rounded-2xl p-3 text-center backdrop-blur-sm">
                <div className="text-white font-bold text-base">{s.val}</div>
                <div className="text-sky-100 text-xs mt-0.5 font-light">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="bg-white flex flex-col justify-center px-8 py-10 lg:px-12">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
              <svg width="14" height="14" fill="none" viewBox="0 0 20 20">
                <rect x="8" y="1" width="4" height="18" rx="2" fill="white"/>
                <rect x="1" y="8" width="18" height="4" rx="2" fill="white"/>
              </svg>
            </div>
            <span className="font-bold text-slate-800">MediCare Pro</span>
          </div>

          {/* Heading */}
          <div className={mounted ? "fade-up-1" : "opacity-0"}>
            <p className="text-xs font-bold tracking-widest text-sky-500 uppercase mb-2">Espace Patient</p>
            <h2 className="text-3xl font-bold text-slate-800">Connexion</h2>
            <p className="text-slate-400 text-sm mt-1.5 font-light">
              Identifiez-vous pour accéder à votre espace médical
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mt-5 flex items-center gap-3 bg-red-50 border border-red-100 text-red-500 text-sm rounded-xl px-4 py-3 do-shake">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Prénom ou mot de passe incorrect.
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">

            {/* Prénom field */}
            <div className={mounted ? "fade-up-2" : "opacity-0"}>
              <label className="block text-xs font-bold tracking-widest text-slate-400 uppercase mb-2">
                Prénom
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                </span>
                <input
                  type="text"
                  value={Prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  placeholder="ex. hani"
                  autoComplete="given-name"
                  className="custom-input w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm placeholder-slate-300 transition-all duration-200"
                />
              </div>
            </div>

            {/* Password field */}
            <div className={mounted ? "fade-up-3" : "opacity-0"}>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold tracking-widest text-slate-400 uppercase">
                  Mot de passe
                </label>
                <a href="#" className="text-xs text-sky-500 hover:text-sky-600 font-semibold transition-colors">
                  Oublié ?
                </a>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                    <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </span>
                <input
                  type="password"
                  value={MotDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="custom-input w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm placeholder-slate-300 transition-all duration-200"
                />
              </div>
            </div>

            {/* Submit button */}
            <div className={`pt-1 ${mounted ? "fade-up-4" : "opacity-0"}`}>
              <button
                type="submit"
                disabled={loading || !Prenom || !MotDePasse}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-sky-500 hover:bg-sky-600 active:scale-[0.99] disabled:bg-sky-200 disabled:cursor-not-allowed text-white font-bold text-sm tracking-wide transition-all duration-200 hover:shadow-lg hover:shadow-sky-200"
              >
                {loading ? (
                  <><div className="spinner" /><span>Vérification…</span></>
                ) : (
                  <>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"
                        stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Se connecter
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className={`flex items-center gap-3 my-6 ${mounted ? "fade-up-5" : "opacity-0"}`}>
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-xs text-slate-300 font-medium">Connexion sécurisée</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          {/* Trust badges */}
          <div className={`grid grid-cols-3 gap-2 ${mounted ? "fade-up-6" : "opacity-0"}`}>
            {[
              
            ].map((b) => (
              <div key={b.label}
                className="flex flex-col items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-2xl py-3 px-2 hover:border-sky-100 hover:bg-sky-50/50 transition-colors duration-200 cursor-default">
                <span className="text-xl">{b.icon}</span>
                <span className="text-xs text-slate-400 font-semibold">{b.label}</span>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-slate-300 mt-6">
            © {new Date().getFullYear()} Dawini — Tous droits réservés
          </p>
        </div>
      </div>
    </div>
  );
}