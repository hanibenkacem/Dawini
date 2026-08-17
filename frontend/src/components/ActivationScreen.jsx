import { useEffect, useState } from "react";

/**
 * ActivationScreen
 *
 * Renders trial/activation/expired states and blocks the rest of the app
 * until the license status is "licensed" or an active trial exists —
 * AND, on the server role, until the local MySQL/backend has finished
 * booting (see window.dawiniBackend in preload.js).
 *
 * Usage in App.jsx:
 *
 *   const [licenseOk, setLicenseOk] = useState(false);
 *   if (!licenseOk) {
 *     return <ActivationScreen onUnlocked={() => setLicenseOk(true)} />;
 *   }
 *   return <MainApp />;
 *
 * Requires window.licensing to be exposed by preload.js
 * (see electron/preload-licensing-snippet.js) and window.dawiniBackend.
 */
export default function ActivationScreen({ onUnlocked }) {
  const [status, setStatus] = useState(null); // full status object from main process
  const [loading, setLoading] = useState(true);
  const [licenseKeyInput, setLicenseKeyInput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function refreshStatus() {
    setLoading(true);
    const s = await window.licensing.getStatus();
    setStatus(s);
    setLoading(false);
    if (s.status === "licensed" || s.status === "trial_active") {
      waitForBackendThenUnlock();
    }
  }

  // License is fine — now make sure the local backend (MySQL + Express, on
  // server role) is actually up before handing off to the main app. On
  // client role, main.js sets backendReady = true immediately, so this
  // resolves right away.
  function waitForBackendThenUnlock() {
    const { ready } = window.dawiniBackend.getStatusSync();
    if (ready) {
      onUnlocked?.();
    } else {
      window.dawiniBackend.onReady(() => onUnlocked?.());
    }
  }

  useEffect(() => {
    refreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleStartTrial() {
    setBusy(true);
    setError("");
    const result = await window.licensing.startTrial();
    setBusy(false);
    if (!result.ok) {
      setError(
        result.reason === "trial_already_used"
          ? "This computer has already used its free trial. Please activate with a license key."
          : "Could not start trial."
      );
      await refreshStatus();
      return;
    }
    await refreshStatus();
  }

  async function handleActivate() {
    if (!licenseKeyInput.trim()) return;
    setBusy(true);
    setError("");
    const result = await window.licensing.activate(licenseKeyInput.trim());
    setBusy(false);
    if (!result.ok) {
      const messages = {
        malformed: "This license key looks incomplete. Please check it and try again.",
        bad_signature: "This license key is not valid.",
        wrong_machine: "This license key does not match this computer.",
        expired: "This license has expired.",
      };
      setError(messages[result.reason] || "Activation failed. Please check your license key.");
      return;
    }
    await refreshStatus();
  }

  function handleCopyMachineId() {
    const idToCopy = status?.machineIdRaw || status?.machineId;
    if (!idToCopy) return;
    navigator.clipboard?.writeText(idToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (loading || !status) {
    return (
      <Shell>
        <p className="text-slate-500">Checking license…</p>
      </Shell>
    );
  }

  if (status.status === "trial_active") {
    // Also shown while waiting on the backend to become ready.
    return (
      <Shell>
        <p className="text-slate-500">Loading Dawini…</p>
      </Shell>
    );
  }

  const isExpiredState =
    status.status === "trial_expired" ||
    status.status === "license_expired" ||
    status.status === "license_invalid";

  return (
    <Shell>
      <h1 className="text-xl font-semibold text-slate-800 mb-1">Welcome to Dawini</h1>

      {status.status === "not_activated" && (
        <p className="text-slate-500 mb-6">This copy is not activated.</p>
      )}
      {status.status === "trial_expired" && (
        <p className="text-red-600 font-medium mb-6">Trial expired.</p>
      )}
      {status.status === "license_expired" && (
        <p className="text-red-600 font-medium mb-6">
          Your license has expired
          {status.expiresAt ? ` (${new Date(status.expiresAt).toLocaleDateString()})` : ""}.
        </p>
      )}
      {status.status === "license_invalid" && (
        <p className="text-red-600 font-medium mb-6">
          Activation required. This license is not valid for this computer.
        </p>
      )}

      <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 mb-6">
        <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Machine ID</div>
        <div className="flex items-center justify-between">
          <span className="font-mono text-lg text-slate-700">{status.machineId}</span>
          <button
            onClick={handleCopyMachineId}
            className="text-xs text-sky-600 hover:text-sky-700 font-medium"
          >
            {copied ? "Copied!" : "Copy full ID"}
          </button>
        </div>
      </div>

      {!isExpiredState && status.status === "not_activated" && (
        <>
          <button
            onClick={handleStartTrial}
            disabled={busy}
            className="w-full mb-6 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-medium py-2.5"
          >
            Start 7-Day Free Trial
          </button>
          <Divider label="OR" />
        </>
      )}

      <div>
        <label className="block text-sm text-slate-600 mb-1">License Key</label>
        <textarea
          value={licenseKeyInput}
          onChange={(e) => setLicenseKeyInput(e.target.value)}
          rows={3}
          placeholder="Paste your license key here"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        <button
          onClick={handleActivate}
          disabled={busy || !licenseKeyInput.trim()}
          className="w-full mt-3 rounded-lg bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-medium py-2.5"
        >
          Activate
        </button>
      </div>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        {children}
      </div>
    </div>
  );
}

function Divider({ label }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="h-px flex-1 bg-slate-200" />
      <span className="text-xs text-slate-400">{label}</span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  );
}