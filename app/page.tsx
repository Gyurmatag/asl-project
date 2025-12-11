"use client";

import dynamic from "next/dynamic";

const ASLRecognizer = dynamic(() => import("./components/ASLRecognizer"), {
  ssr: false,
  loading: () => (
    <div className="panel-grid">
      <div className="panel">
        <div className="panel-header">
          <h2>Camera Preview</h2>
          <div className="status-badge">
            <span className="status-dot status-dot--loading"></span>
            <span>loading...</span>
          </div>
        </div>
        <div className="camera-frame">
          <div className="loading-overlay">
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div className="loading-spinner"></div>
              <p className="loading-text">Loading ASL recognition...</p>
            </div>
          </div>
        </div>
      </div>
      <div className="panel">
        <div className="panel-header">
          <h2>Recognized Text</h2>
        </div>
        <div className="text-display text-display-placeholder">
          Loading...
        </div>
      </div>
      <div className="panel">
        <div className="panel-header">
          <h2>Situations & Conversation</h2>
        </div>
        <div className="situation-description">
          Loading...
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
            <p>ASL → voice, live workplace communication</p>
          </div>
          <div className="session-block">
            <div className="avatar">JD</div>
            <div className="session-status">
              🟢 Online – recognition active
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
