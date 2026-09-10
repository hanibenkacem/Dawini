import { createContext, useContext, useEffect, useState } from "react";

const UpdateContext = createContext(null);

// Normalizes electron-updater's releaseNotes, which can arrive as:
// - a string (GitHub release body, often markdown/HTML)
// - an array of { version, note } objects (multiple versions skipped over)
// - null/undefined (no notes set on the release)
function normalizeReleaseNotes(releaseNotes) {
  if (!releaseNotes) return [];
  if (typeof releaseNotes === "string") {
    return [{ version: null, note: releaseNotes }];
  }
  if (Array.isArray(releaseNotes)) {
    return releaseNotes.map((entry) => ({
      version: entry.version || null,
      note: entry.note || "",
    }));
  }
  return [];
}

export function UpdateProvider({ children }) {
  const [update, setUpdate] = useState({ status: "idle" });
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!window.updaterAPI) return; // dev in browser, no Electron bridge

    // Catch up on whatever already happened before this mounted
    try {
      const initial = window.updaterAPI.getStatusSync();
      if (initial) setUpdate(initial);
    } catch {
      // no-op — sync IPC can throw if main hasn't registered the handler yet
    }

    window.updaterAPI.onStatus((data) => {
      setUpdate(data);
      if (data.status === "available") setProgress(0);
    });

    window.updaterAPI.onProgress((data) => {
      setProgress(data.percent);
    });
  }, []);

  const installNow = () => window.updaterAPI?.installNow();
  const dismiss = () => setUpdate({ status: "idle" });

  return (
    <UpdateContext.Provider value={{ update, progress, installNow, dismiss }}>
      {children}
      <UpdateBanner update={update} progress={progress} onInstall={installNow} onDismiss={dismiss} />
    </UpdateContext.Provider>
  );
}

export const useUpdate = () => useContext(UpdateContext);

function UpdateBanner({ update, progress, onInstall, onDismiss }) {
  const [dark, setDark] = useState(
    () => localStorage.getItem("med-theme") === "dark"
  );

  useEffect(() => {
    const handleThemeChange = (e) => setDark(e.detail);
    window.addEventListener("med-theme-change", handleThemeChange);
    return () => window.removeEventListener("med-theme-change", handleThemeChange);
  }, []);

  // Nothing to show for these states — silent as before
  if (["idle", "checking", "not-available"].includes(update.status)) {
    return null;
  }

  const notes = normalizeReleaseNotes(update.releaseNotes);

  const cardStyle = {
    background: dark ? "#111A27" : "#FFFFFF",
    color: dark ? "#E5EAF0" : "#111827",
    border: dark ? "1px solid #1F2A3A" : "1px solid #E5E7EB",
  };

  return (
    <div
      style={cardStyle}
      className="fixed bottom-4 right-4 w-80 rounded-lg shadow-lg p-4 z-50"
    >
      {update.status === "available" && (
        <>
          <p className="text-sm font-semibold">
            Téléchargement de la mise à jour {update.version}...
          </p>
          <div className="w-full bg-gray-200 rounded h-2 mt-2 overflow-hidden">
            <div
              className="bg-blue-500 h-2 rounded transition-all duration-300"
              style={{ width: `${Math.round(progress)}%` }}
            />
          </div>
          <p className="text-xs mt-1 opacity-70">{Math.round(progress)}%</p>
        </>
      )}

      {update.status === "downloaded" && (
        <>
          <div className="flex items-start justify-between">
            <p className="text-sm font-semibold">
              Mise à jour {update.version} prête
            </p>
            <button
              onClick={onDismiss}
              className="text-xs opacity-50 hover:opacity-100 ml-2"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>

          {notes.length > 0 && (
            <div className="text-xs mt-2 max-h-32 overflow-y-auto opacity-80 space-y-1">
              {notes.map((entry, i) => (
                <div key={i}>
                  {entry.version && (
                    <p className="font-medium">{entry.version}</p>
                  )}
                  {/* electron-updater notes are HTML/markdown from the release body */}
                  <div dangerouslySetInnerHTML={{ __html: entry.note }} />
                </div>
              ))}
            </div>
          )}

          <button
            onClick={onInstall}
            className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-1.5 rounded transition-colors"
          >
            Redémarrer et installer
          </button>
        </>
      )}

      {update.status === "error" && (
        <div className="flex items-start justify-between">
          <p className="text-sm text-red-500">
            Erreur de mise à jour: {update.message}
          </p>
          <button
            onClick={onDismiss}
            className="text-xs opacity-50 hover:opacity-100 ml-2"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}