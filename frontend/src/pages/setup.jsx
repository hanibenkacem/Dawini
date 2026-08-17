import { useState } from 'react';

export default function Setup() {
  const [role, setRole] = useState('server');
  const [serverIp, setServerIp] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (role === 'client' && !serverIp.trim()) return;
    setSubmitting(true);
    await window.electronConfig.setConfig(role, serverIp.trim());
    // the main process relaunches the app right after this resolves
  };

  return (
    <div style={{ maxWidth: 420, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h2>Configuration initiale — Dawini</h2>
      <p>Ce PC sera-t-il le serveur (réceptionniste) ou le client (médecin) ?</p>
      <form onSubmit={handleSubmit}>
        <label style={{ display: 'block', marginBottom: 8 }}>
          <input
            type="radio"
            name="role"
            value="server"
            checked={role === 'server'}
            onChange={() => setRole('server')}
          />
          {' '}Serveur (Réceptionniste) — héberge la base de données
        </label>
        <label style={{ display: 'block', marginBottom: 8 }}>
          <input
            type="radio"
            name="role"
            value="client"
            checked={role === 'client'}
            onChange={() => setRole('client')}
          />
          {' '}Client (Médecin) — se connecte au serveur sur le réseau local
        </label>

        {role === 'client' && (
          <div style={{ marginTop: 12 }}>
            <label>
              Adresse IP du PC serveur :
              <input
                type="text"
                placeholder="ex: 192.168.1.10"
                value={serverIp}
                onChange={(e) => setServerIp(e.target.value)}
                style={{ display: 'block', marginTop: 4, width: '100%' }}
              />
            </label>
          </div>
        )}

        <button type="submit" disabled={submitting} style={{ marginTop: 16 }}>
          {submitting ? 'Configuration...' : 'Valider'}
        </button>
      </form>
    </div>
  );
}