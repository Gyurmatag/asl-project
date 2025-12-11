"use client";

import dynamic from "next/dynamic";

const ASLRecognizer = dynamic(() => import("./components/ASLRecognizer"), {
  ssr: false,
  loading: () => (
    <div className="panel-grid">
      <div className="panel">
        <div className="panel-header">
          <h2>Kamera előnézet</h2>
          <div className="status-badge">
            <span className="status-dot status-dot--loading"></span>
            <span>betöltés...</span>
          </div>
        </div>
        <div className="camera-frame">
          <div className="loading-overlay">
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div className="loading-spinner"></div>
              <p className="loading-text">ASL felismerés betöltése...</p>
            </div>
          </div>
        </div>
      </div>
      <div className="panel">
        <div className="panel-header">
          <h2>Felismert szöveg</h2>
        </div>
        <div className="text-display text-display-placeholder">
          Betöltés...
        </div>
      </div>
      <div className="panel">
        <div className="panel-header">
          <h2>Szituációk & beszélgetés</h2>
        </div>
        <div className="situation-description">
          Betöltés...
        </div>
      </div>
    </div>
  ),
});

export default function Home() {
  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="app-branding">
            <h1>sign2voice work</h1>
            <p>ASL → hang, élő munkahelyi kommunikáció</p>
          </div>
          <div className="session-block">
            <div className="avatar">JD</div>
            <div className="session-status">
              🟢 Online – felismerés aktív
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        <ASLRecognizer />
      </main>
    </div>
  );
}
