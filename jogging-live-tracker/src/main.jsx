import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import './styles.css';
import AppShell from './components/AppShell.jsx';
import RunPage from './pages/RunPage.jsx';
import TrackPage from './pages/TrackPage.jsx';
import { registerServiceWorker } from './utils/pwa.js';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<RunPage />} />
          <Route path="/track/:sessionId" element={<TrackPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  </React.StrictMode>,
);

registerServiceWorker();
