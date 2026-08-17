import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import axios from "axios";
import { API_BASE } from "../config/api";

const API = `${API_BASE}/file-attente`;

const token = () => localStorage.getItem("token");
const auth = () => ({ Authorization: `Bearer ${token()}` });

// Current user's role, set at login (see UserLogin controller / login handler).
// Used to make sure alerts only fire for the PC/role they're meant for.
const userRole = () => localStorage.getItem("role");

// ─── SOUNDS ───────────────────────────────────────────────────────────────

// Plays a pre-recorded clip instead of relying on the OS's text-to-speech,
// so it doesn't depend on a French voice/language pack being installed on
// the clinic PCs (which may be offline, locked down, or missing admin
// rights to install one).
//
// >>> You need to add this file yourself: <<<
// Put a short MP3/WAV of a female voice saying "Patient suivant" at
//   frontend/src/assets/patient-suivant.mp3
// (adjust the import path below if your assets live somewhere else). You can
// generate one for free from a site like ttsmp3.com or Google Cloud TTS's
// demo page, or just record it.
import patientSuivantAudio from "../assets/patientsuivant.mp3"; // Update this path if needed
let callAudio = null;

function speakFallback() {
  // Used only if the audio file is missing or fails to play, so the alert
  // is never completely silent.
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance("Patient suivant");
    utter.lang = "fr-FR";
    utter.rate = 0.92;
    utter.volume = 1;
    window.speechSynthesis.speak(utter);
  } catch (e) {
    console.warn("Speech synthesis fallback also unavailable:", e);
  }
}

function playCallSound() {
  try {
    if (!callAudio) {
      callAudio = new Audio(patientSuivantAudio);
    }
    callAudio.currentTime = 0;
    callAudio.play().catch((e) => {
      console.warn("Audio playback failed, falling back to speech synthesis:", e);
      speakFallback();
    });
  } catch (e) {
    console.warn("Audio not available, falling back to speech synthesis:", e);
    speakFallback();
  }
}

function playPaymentSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    ctx.resume().then(() => {
      const schedule = [
        { freq: 880, start: 0, dur: 0.18 },
        { freq: 1100, start: 0.25, dur: 0.18 },
        { freq: 880, start: 0.5, dur: 0.28 },
      ];
      schedule.forEach(({ freq, start, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur + 0.05);
      });
    });
  } catch (e) {
    console.warn("Audio not available:", e);
  }
}

// ─── PAYMENT ALERT MODAL ────────────────────────────────────────────────────
// Moved here verbatim from ReceptionDashboard.jsx. It never actually used the
// theme context (all colors were hardcoded in the original), so the
// dependency on ThemeCtx/useTheme has been dropped — it's now fully
// self-contained and safe to render from anywhere in the tree.
const PAY_MODES = [
  { value: "cash", label: "Espèces", icon: "💵" },
  { value: "carte", label: "Carte Chifa", icon: "💳" },
];

function PaymentAlertModal({ patient, onClose, onDone }) {
  const doctorSet = !!patient.montant_prevu;
  const [montant, setMontant] = useState(
    patient.montant_prevu ? String(patient.montant_prevu) : ""
  );
  const [mode, setMode] = useState(patient.mode_prevu || "cash");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef();

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 120);
  }, []);

  const pay = async () => {
    if (!montant || isNaN(Number(montant)) || Number(montant) <= 0) {
      setError("Veuillez entrer un montant valide.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await axios.post(
        `${API}/confirmer-paiement`,
        {
          file_id: patient.id,
          id_consultation: patient.id_consultation,
          montant: Number(montant),
          mode_paiement: mode,
        },
        { headers: auth() }
      );
      setSuccess(true);
      setTimeout(() => {
        onDone();
        onClose();
      }, 1600);
    } catch (e) {
      setError(e.response?.data?.error || "Erreur lors du paiement.");
      setLoading(false);
    }
  };

  const onKey = (e) => {
    if (e.key === "Enter") pay();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        animation: "fadeIn .15s ease",
      }}
    >
      <div
        style={{
          width: "min(460px,95vw)",
          borderRadius: 24,
          overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.4)",
          animation: "alertSlideIn .22s cubic-bezier(.34,1.56,.64,1)",
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            background: "linear-gradient(135deg, #92400e 0%, #b45309 100%)",
            padding: "24px 28px 20px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -30,
              right: -30,
              width: 110,
              height: 110,
              borderRadius: "50%",
              border: "2px solid rgba(255,255,255,0.08)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: -10,
              right: -10,
              width: 70,
              height: 70,
              borderRadius: "50%",
              border: "2px solid rgba(255,255,255,0.06)",
            }}
          />
          <div style={{ position: "relative" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  animation: "alertPulse 1.4s ease-in-out infinite",
                  flexShrink: 0,
                }}
              >
                💳
              </div>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "rgba(255,255,255,0.5)",
                    marginBottom: 2,
                  }}
                >
                  Paiement en attente
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: "#fff",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {patient.prenom} {patient.nom}
                </div>
              </div>
              <button
                onClick={onClose}
                style={{
                  marginLeft: "auto",
                  background: "rgba(255,255,255,0.12)",
                  border: "none",
                  borderRadius: 10,
                  width: 32,
                  height: 32,
                  cursor: "pointer",
                  fontSize: 17,
                  color: "rgba(255,255,255,0.7)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background .15s",
                  flexShrink: 0,
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.22)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.12)")
                }
              >
                ×
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#fcd34d",
                  animation: "alertPulse 1.4s ease-in-out infinite",
                }}
              />
              <span
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.6)",
                  fontWeight: 500,
                }}
              >
                Le médecin a terminé la consultation · Patient N°{patient.ordre}
              </span>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ background: "#ffffff", padding: "28px 28px 24px" }}>
          {success ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 14,
                padding: "16px 0 8px",
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "#dcfce7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 28,
                }}
              >
                ✅
              </div>
              <div style={{ fontWeight: 800, fontSize: 17, color: "#0f172a" }}>
                Paiement confirmé
              </div>
              <div style={{ fontSize: 13, color: "#64748b" }}>
                {montant} دج encaissé · {PAY_MODES.find((m) => m.value === mode)?.label}
              </div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#475569",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Montant à encaisser
                  </label>
                  {doctorSet && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        background: "#f0fdf4",
                        color: "#166534",
                        border: "1px solid #86efac",
                        borderRadius: 20,
                        padding: "2px 8px",
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      <span style={{ fontSize: 9 }}>✓</span> Fixé par le médecin
                    </span>
                  )}
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    ref={inputRef}
                    type="number"
                    min="0"
                    placeholder="0"
                    value={montant}
                    readOnly={doctorSet}
                    onChange={(e) => {
                      if (!doctorSet) {
                        setMontant(e.target.value);
                        setError(null);
                      }
                    }}
                    onKeyDown={onKey}
                    style={{
                      width: "100%",
                      padding: "14px 52px 14px 18px",
                      border: `2px solid ${
                        doctorSet ? "#86efac" : error ? "#fca5a5" : "#e2e8f0"
                      }`,
                      borderRadius: 12,
                      fontSize: 26,
                      fontWeight: 800,
                      color: doctorSet ? "#166534" : "#0f172a",
                      outline: "none",
                      boxSizing: "border-box",
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      transition: "border-color .15s, box-shadow .15s",
                      background: doctorSet ? "#f0fdf4" : "#fff",
                      cursor: doctorSet ? "default" : "text",
                    }}
                    onFocus={(e) => {
                      if (!doctorSet) {
                        e.currentTarget.style.borderColor = "#d97706";
                        e.currentTarget.style.boxShadow =
                          "0 0 0 3px rgba(217,119,6,0.15)";
                      }
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = doctorSet
                        ? "#86efac"
                        : error
                        ? "#fca5a5"
                        : "#e2e8f0";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      right: 18,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: 15,
                      fontWeight: 700,
                      color: doctorSet ? "#166534" : "#d97706",
                    }}
                  >
                    دج
                  </span>
                </div>
                {doctorSet && (
                  <p style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>
                    Montant décidé par le médecin. Vérifiez le mode de paiement puis
                    confirmez.
                  </p>
                )}
              </div>

              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#475569",
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Mode de paiement
                </label>
                <div style={{ display: "flex", gap: 10 }}>
                  {PAY_MODES.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setMode(m.value)}
                      style={{
                        flex: 1,
                        padding: "11px 14px",
                        borderRadius: 10,
                        border: `2px solid ${
                          mode === m.value ? "#d97706" : "#e2e8f0"
                        }`,
                        background: mode === m.value ? "#fffbeb" : "#f9fafb",
                        color: mode === m.value ? "#92400e" : "#475569",
                        fontWeight: mode === m.value ? 700 : 500,
                        fontSize: 13,
                        cursor: "pointer",
                        transition: "all .12s",
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      {m.icon} {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: 8,
                    padding: "10px 14px",
                    fontSize: 13,
                    color: "#dc2626",
                    marginBottom: 16,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  ⚠ {error}
                </div>
              )}

              <button
                onClick={pay}
                disabled={loading || !montant}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: 12,
                  border: "none",
                  background: montant
                    ? "linear-gradient(135deg, #d97706, #b45309)"
                    : "#e2e8f0",
                  color: montant ? "#fff" : "#94a3b8",
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: montant ? "pointer" : "not-allowed",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  transition: "all .15s",
                }}
                onMouseOver={(e) => {
                  if (montant && !loading) {
                    e.currentTarget.style.filter = "brightness(1.08)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow =
                      "0 6px 20px rgba(217,119,6,0.4)";
                  }
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.filter = "none";
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {loading ? (
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      border: "2.5px solid rgba(255,255,255,0.3)",
                      borderTopColor: "#fff",
                      borderRadius: "50%",
                      animation: "spin .7s linear infinite",
                    }}
                  />
                ) : (
                  <span style={{ fontSize: 18 }}>✓</span>
                )}
                {loading
                  ? "Traitement…"
                  : montant
                  ? `Confirmer ${montant} دج`
                  : "Entrez un montant"}
              </button>

              <p
                style={{
                  textAlign: "center",
                  fontSize: 11,
                  color: "#94a3b8",
                  marginTop: 12,
                }}
              >
                Appuyez sur{" "}
                <kbd
                  style={{
                    background: "#f1f5f9",
                    borderRadius: 4,
                    padding: "1px 5px",
                    fontSize: 10,
                    fontFamily: "monospace",
                  }}
                >
                  Entrée
                </kbd>{" "}
                pour confirmer rapidement
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CONTEXT ────────────────────────────────────────────────────────────────
const QueueAlertCtx = createContext(null);

/**
 * Access the shared queue + payment-alert state from any descendant of
 * QueueAlertProvider. Throws if used outside the provider, so mistakes show
 * up immediately instead of silently returning stale/undefined data.
 */
export function useQueueAlert() {
  const ctx = useContext(QueueAlertCtx);
  if (!ctx) {
    throw new Error("useQueueAlert must be used within a QueueAlertProvider");
  }
  return ctx;
}

/**
 * Mount this ONCE, above the router outlet (e.g. in MainLayout), so it
 * survives navigation between pages. It owns:
 *  - the 3s queue polling
 *  - "Patient suivant" speech alert on new en_consultation entries (fires
 *    for every role — doctor and reception both hear it)
 *  - the payment chime + PaymentAlertModal on new en_paiement entries
 *    (reception only — see `role` check below; the doctor is the one who
 *    sends the patient to payment, so they shouldn't get the modal too)
 *
 * Consumers (e.g. ReceptionDashboard) read `queue` and call `fetchQueue()` /
 * `openPaymentModal()` instead of managing any of this themselves.
 */
export function QueueAlertProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const prevPaiementIds = useRef(null);
  const hasActiveAlert = useRef(false);
  const prevConsultIds = useRef(null);
  const role = userRole();

  const fetchQueue = useCallback(async () => {
    try {
      const r = await axios.get(API, { headers: auth() });
      const data = r.data;
      setQueue(data);

      // ── Call signal: new en_consultation entry → say "Patient suivant" ──
      // Fires for every role, unchanged.
      const currentConsultation = data.filter((p) => p.statut === "en_consultation");
      const currentConsultIds = new Set(currentConsultation.map((p) => p.id));
      if (prevConsultIds.current !== null) {
        const newOnes = currentConsultation.filter(
          (p) => !prevConsultIds.current.has(p.id)
        );
        if (newOnes.length > 0) playCallSound();
      }
      prevConsultIds.current = currentConsultIds;

      // ── Payment alert: new en_paiement entry → chime + modal ──
      // Reception only. Without this check, the doctor's own polling loop
      // sees the same new en_paiement row (created by their own "send to
      // payment" action) and pops the modal on their PC too.
      const currentPaiement = data.filter((p) => p.statut === "en_paiement");
      const currentIds = new Set(currentPaiement.map((p) => p.id));
      if (
        prevPaiementIds.current !== null &&
        !hasActiveAlert.current &&
        role === "receptionniste"
      ) {
        const newOnes = currentPaiement.filter(
          (p) => !prevPaiementIds.current.has(p.id)
        );
        if (newOnes.length > 0) {
          hasActiveAlert.current = true;
          setPaymentTarget(newOnes[0]);
          playPaymentSound();
        }
      }
      prevPaiementIds.current = currentIds;
    } catch (e) {
      console.error(e);
    }
  }, [role]);

  useEffect(() => {
    fetchQueue();
    const qi = setInterval(fetchQueue, 3000);
    return () => clearInterval(qi);
  }, [fetchQueue]);

  // Lets a page manually open the modal too (e.g. the "💳 Encaisser" button
  // in the queue table), reusing the same hasActiveAlert guard.
  const openPaymentModal = useCallback((patient) => {
    hasActiveAlert.current = true;
    setPaymentTarget(patient);
  }, []);

  const handlePaymentDone = useCallback(() => {
    hasActiveAlert.current = false;
    setPaymentTarget(null);
    fetchQueue();
  }, [fetchQueue]);

  const handlePaymentClose = useCallback(() => {
    hasActiveAlert.current = false;
    setPaymentTarget(null);
  }, []);

  const value = { queue, fetchQueue, openPaymentModal };

  return (
    <QueueAlertCtx.Provider value={value}>
      {children}
      {paymentTarget && (
        <PaymentAlertModal
          patient={paymentTarget}
          onClose={handlePaymentClose}
          onDone={handlePaymentDone}
        />
      )}
    </QueueAlertCtx.Provider>
  );
}