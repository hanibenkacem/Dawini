import { useEffect, useState } from "react";

const fmtSize = (b) => (b / 1024 / 1024).toFixed(1) + " Mo";

export default function BackupModal({ isOpen, onClose, C }) {
  const api = window.dawiniBackup;
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }

  const load = async () => {
    if (api) setData(await api.get());
  };

  useEffect(() => {
    if (isOpen) {
      setMsg(null);
      load();
    }
  }, [isOpen]);

  if (!isOpen || !api || !data) return null;
  const { settings, backups } = data;

  const run = async (fn, okText) => {
    setBusy(true);
    setMsg(null);
    const r = await fn();
    setBusy(false);
    if (r?.canceled) return;
    setMsg(r?.ok ? { ok: true, text: okText } : { ok: false, text: `Échec : ${r?.error}` });
    load();
  };

  const btn = (primary, disabled) => ({
    background: primary ? `linear-gradient(135deg, ${C.teal}, ${C.tealMid})` : C.slateLight,
    color: primary ? "#fff" : C.text,
    border: "none",
    padding: "9px 16px",
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 13,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
  });

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.surface, borderRadius: 16, width: "min(620px, 94vw)",
          maxHeight: "88vh", overflowY: "auto",
          border: `1px solid ${C.border}`, boxShadow: `0 24px 64px ${C.shadow}`,
          padding: "24px 26px", color: C.text,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>Sauvegarde et restauration</div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: C.textSoft, fontSize: 16, cursor: "pointer" }}>✕</button>
        </div>

        {/* Settings */}
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, marginBottom: 12 }}>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={async (e) => { await api.set({ enabled: e.target.checked }); load(); }}
          />
          Sauvegarde automatique quotidienne
        </label>

        <div style={{ fontSize: 13, color: C.textSoft, marginBottom: 6 }}>Dossier de sauvegarde</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
          <code style={{
            flex: 1, fontSize: 12, padding: "8px 10px", borderRadius: 8,
            background: C.slateLight, color: C.text, overflow: "hidden",
            textOverflow: "ellipsis", whiteSpace: "nowrap",
          }} title={settings.folder}>{settings.folder}</code>
          <button style={btn(false)} onClick={async () => { await api.chooseFolder(); load(); }}>
            Changer (clé USB…)
          </button>
        </div>

        <label style={{ fontSize: 13, color: C.textSoft, display: "block", marginBottom: 14 }}>
          Conserver les{" "}
          <select
            value={settings.keep}
            onChange={async (e) => { await api.set({ keep: Number(e.target.value) }); load(); }}
            style={{ background: C.slateLight, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: "3px 6px" }}
          >
            {[7, 14, 30, 60].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>{" "}
          dernières sauvegardes
        </label>

        <div style={{ fontSize: 13, color: C.textSoft, marginBottom: 4 }}>
          Dernière sauvegarde réussie :{" "}
          <strong style={{ color: C.text }}>
            {settings.lastSuccess ? new Date(settings.lastSuccess).toLocaleString("fr-FR") : "jamais"}
          </strong>
        </div>
        {settings.lastError && (
          <div style={{ fontSize: 13, color: C.red, background: C.redLight, padding: "8px 10px", borderRadius: 8, marginTop: 8 }}>
            Dernière erreur : {settings.lastError}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, margin: "16px 0" }}>
          <button style={btn(true, busy)} disabled={busy} onClick={() => run(api.now, "Sauvegarde créée avec succès.")}>
            {busy ? "En cours…" : "Sauvegarder maintenant"}
          </button>
          <button style={btn(false, busy)} disabled={busy} onClick={() => run(() => api.restore(null), "Restauration terminée.")}>
            Restaurer depuis un fichier…
          </button>
        </div>

        {msg && (
          <div style={{ fontSize: 13, marginBottom: 12, color: msg.ok ? C.teal : C.red }}>{msg.text}</div>
        )}

        {/* List */}
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Sauvegardes disponibles</div>
        {backups.length === 0 ? (
          <div style={{ fontSize: 13, color: C.textSoft }}>Aucune sauvegarde pour le moment.</div>
        ) : (
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, maxHeight: 220, overflowY: "auto" }}>
            {backups.map((b) => (
              <div key={b.path} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 12px", borderBottom: `1px solid ${C.border}`, fontSize: 13,
              }}>
                <div>
                  <div>{new Date(b.mtime).toLocaleString("fr-FR")}</div>
                  <div style={{ color: C.textSoft, fontSize: 12 }}>{fmtSize(b.size)}</div>
                </div>
                <button
                  style={btn(false, busy)}
                  disabled={busy}
                  onClick={() => run(() => api.restore(b.path), "Restauration terminée.")}
                >
                  Restaurer
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}