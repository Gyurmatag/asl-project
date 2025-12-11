"use client";

import { LetterClassificationResult } from "../lib/mlClassifier";
import { SUPPORTED_LETTERS } from "../lib/aslGestures";

interface RecognizedTextProps {
  text: string;
  currentLetter: LetterClassificationResult | null;
  onClear: () => void;
  onBackspace: () => void;
  onAddSpace: () => void;
  onDone?: () => void;
  canSave?: boolean;
  bothHandsOpen?: boolean;
}

const LETTER_HINTS: Record<string, string> = {
  A: "Ököl, hüvelyk oldalt",
  B: "Lapos kéz, ujjak felfelé",
  C: "Görbe kéz (csésze forma)",
  D: "Mutató fel, többi hüvelyet érint",
  E: "Ujjak hüvelyre görbülve",
  F: "OK jel, 3 ujj fel",
  G: "Mutató + hüvelyk oldalra",
  H: "Mutató + középső oldalra",
  I: "Csak kisujj fel",
  K: "Mutató + középső szétnyitva",
  L: "L-forma (hüvelyk + mutató)",
  M: "3 ujj hüvelyen",
  N: "2 ujj hüvelyen",
  O: "Ujjak O formát alkotnak",
  P: "K-kéz lefelé mutat",
  Q: "G-kéz lefelé mutat",
  R: "Keresztezett mutató + középső",
  S: "Ököl, hüvelyk ujjakon",
  T: "Hüvelyk mutató és középső közt",
  U: "Mutató + középső együtt fel",
  V: "Béke jel ✌️",
  W: "3 ujj fel, szétnyitva",
  X: "Mutató ujj behajlítva",
  Y: "Hüvelyk + kisujj ki 🤙",
};

export default function RecognizedText({
  text,
  currentLetter,
  onClear,
  onBackspace,
  onAddSpace,
  onDone,
  canSave = false,
  bothHandsOpen = false,
}: RecognizedTextProps) {
  const displayLetter = currentLetter?.letter || null;
  const displayConfidence = currentLetter?.confidence ?? 0;

  const getConfidenceClass = () => {
    if (displayConfidence > 0.75) return "confidence-bar-fill--high";
    if (displayConfidence > 0.6) return "confidence-bar-fill--medium";
    return "confidence-bar-fill--low";
  };

  return (
    <div className="text-content">
      {/* Felismert betű kijelzés */}
      <div className="detected-letter-display">
        {bothHandsOpen ? (
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "48px" }}>🙌</span>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <span style={{ fontSize: "18px", fontWeight: 500, color: "var(--color-text)" }}>Mindkét kéz nyitva</span>
              <span style={{ fontSize: "14px", color: "var(--color-text-light)" }}>
                {canSave ? "Tartsd a mentéshez" : "Először írj valamit"}
              </span>
            </div>
          </div>
        ) : (
          <>
            <span className={`detected-letter ${!displayLetter ? "detected-letter--empty" : ""}`}>
              {displayLetter || "—"}
            </span>
            {displayLetter && (
              <div className="confidence-display">
                <span className="confidence-label">Biztonság</span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div className="confidence-bar">
                    <div
                      className={`confidence-bar-fill ${getConfidenceClass()}`}
                      style={{ width: `${displayConfidence * 100}%` }}
                    />
                  </div>
                  <span className="confidence-value">
                    {Math.round(displayConfidence * 100)}%
                  </span>
                </div>
                {LETTER_HINTS[displayLetter] && (
                  <span className="letter-hint">{LETTER_HINTS[displayLetter]}</span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Felismert szöveg megjelenítése */}
      <div className="text-display">
        {text || (
          <span className="text-display-placeholder">
            Az alkalmazás itt mutatja a felismert szöveget…
          </span>
        )}
        <span style={{ animation: "pulse 1s infinite", color: "var(--color-primary)" }}>|</span>
      </div>

      <p className="check-note">💡 Tartsd a betűt ~0.8 mp-ig a hozzáadáshoz</p>

      {/* Gombok */}
      <div className="button-group" style={{ marginTop: "auto", marginBottom: "var(--gap-lg)" }}>
        <button
          onClick={onAddSpace}
          className="btn btn-primary btn-small"
          title="Szóköz hozzáadása"
        >
          Szóköz
        </button>
        <button
          onClick={onBackspace}
          className="btn btn-secondary btn-small"
          title="Utolsó karakter törlése"
        >
          ← Törlés
        </button>
        <button
          onClick={onClear}
          className="btn btn-danger btn-small"
          title="Teljes szöveg törlése"
        >
          Mindent töröl
        </button>
        {onDone && (
          <button
            onClick={onDone}
            disabled={!canSave}
            className={`btn btn-small ${canSave ? "btn-primary" : "btn-secondary"}`}
            style={{ opacity: canSave ? 1 : 0.5 }}
            title="Üzenet mentése"
          >
            ✓ Kész
          </button>
        )}
      </div>

      {/* ABC referencia */}
      <div className="alphabet-reference">
        <p className="alphabet-reference-title">
          ASL ábécé referencia
        </p>
        <div className="alphabet-grid">
          {SUPPORTED_LETTERS.map((letter) => (
            <div
              key={letter}
              className={`alphabet-letter ${displayLetter === letter ? "alphabet-letter--active" : ""}`}
              title={LETTER_HINTS[letter]}
            >
              {letter}
            </div>
          ))}
        </div>
        <p className="alphabet-tip">
          💡 A J és Z betűk mozgást igényelnek (még nem támogatott).
          {onDone && " 🙌 Mindkét kéz nyitva (~1.5mp) = mentés."}
        </p>
      </div>
    </div>
  );
}
