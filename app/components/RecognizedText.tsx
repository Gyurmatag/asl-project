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
  A: "Fist, thumb beside",
  B: "Flat hand, fingers up",
  C: "Curved hand (cup shape)",
  D: "Index up, others touch thumb",
  E: "Fingers curled over thumb",
  F: "OK sign, 3 fingers up",
  G: "Index + thumb point sideways",
  H: "Index + middle point sideways",
  I: "Pinky up only",
  K: "Index + middle up, spread",
  L: "L-shape (thumb + index)",
  M: "3 fingers over thumb",
  N: "2 fingers over thumb",
  O: "Fingers form O shape",
  P: "K-hand pointing down",
  Q: "G-hand pointing down",
  R: "Crossed index + middle",
  S: "Fist, thumb over fingers",
  T: "Thumb between index/middle",
  U: "Index + middle together up",
  V: "Peace sign ✌️",
  W: "3 fingers up spread",
  X: "Index finger hooked",
  Y: "Thumb + pinky out 🤙",
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
      {/* Detected letter display */}
      <div className="detected-letter-display">
        {bothHandsOpen ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "32px" }}>🙌</span>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--color-text)" }}>Both Hands Open</span>
              <span style={{ fontSize: "12px", color: "var(--color-text-light)" }}>
                {canSave ? "Hold to save" : "Spell something first"}
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
                <span className="confidence-label">Confidence</span>
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

      {/* Recognized text display */}
      <div className="text-display">
        {text || (
          <span className="text-display-placeholder">
            The app will show recognized text here...
          </span>
        )}
        <span style={{ animation: "pulse 1s infinite", color: "var(--color-primary)" }}>|</span>
      </div>

      <p className="check-note">💡 Hold a letter for ~0.8s to add it</p>

      {/* Buttons */}
      <div className="button-group" style={{ marginBottom: "var(--gap-xs)" }}>
        <button
          onClick={onAddSpace}
          className="btn btn-primary btn-small"
          title="Add space"
        >
          Space
        </button>
        <button
          onClick={onBackspace}
          className="btn btn-secondary btn-small"
          title="Delete last character"
        >
          ← Delete
        </button>
        <button
          onClick={onClear}
          className="btn btn-danger btn-small"
          title="Clear all text"
        >
          Clear All
        </button>
        {onDone && (
          <button
            onClick={onDone}
            disabled={!canSave}
            className={`btn btn-small ${canSave ? "btn-primary" : "btn-secondary"}`}
            style={{ opacity: canSave ? 1 : 0.5 }}
            title="Save message"
          >
            ✓ Done
          </button>
        )}
      </div>

      {/* Alphabet reference */}
      <div className="alphabet-reference">
        <p className="alphabet-reference-title">
          ASL Alphabet Reference
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
          💡 Letters J and Z require motion (not yet supported).
          {onDone && " 🙌 Both hands open (~1.5s) = save."}
        </p>
      </div>
    </div>
  );
}
