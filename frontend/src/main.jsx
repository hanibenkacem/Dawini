import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Setup from './pages/Setup.jsx'

async function bootstrap() {
  const root = createRoot(document.getElementById('root'));

  if (!window.electronConfig) {
    // plain browser dev outside Electron — skip setup entirely
    root.render(<StrictMode><App /></StrictMode>);
    return;
  }

  const config = await window.electronConfig.getConfig();

  if (!config) {
    root.render(<StrictMode><Setup /></StrictMode>);
    return;
  }

  root.render(<StrictMode><App /></StrictMode>);
}

bootstrap();