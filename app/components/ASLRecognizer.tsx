"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Camera, { CameraRef } from "./Camera";
import RecognizedText from "./RecognizedText";
import { useHandDetection } from "../hooks/useHandDetection";
import { useElevenLabsAgent } from "../hooks/useElevenLabsAgent";
import { LetterClassificationResult } from "../lib/mlClassifier";

export default function ASLRecognizer() {
  const cameraRef = useRef<CameraRef>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [recognizedText, setRecognizedText] = useState("");
  const [currentLetter, setCurrentLetter] = useState<LetterClassificationResult | null>(null);

  // Camera controls
  const [isPaused, setIsPaused] = useState(false);
  const [isMirrored, setIsMirrored] = useState(true);

  // ElevenLabs Agent integration
  const { isConnecting, isConnected, isSpeaking, error: agentError, sendToAgent } = useElevenLabsAgent();

  const lastLetterRef = useRef<string | null>(null);
  const letterStartTimeRef = useRef<number>(0);
  const letterAddedRef = useRef(false);
  const [justAddedLetter, setJustAddedLetter] = useState<string | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const [doneTriggered, setDoneTriggered] = useState(false);

  // Both hands open palm detection for sending
  const bothHandsStartTimeRef = useRef<number>(0);
  const bothHandsTriggeredRef = useRef(false);
  const [bothHandsHoldProgress, setBothHandsHoldProgress] = useState(0);

  const HOLD_DURATION = 800;
  const BOTH_HANDS_HOLD_DURATION = 1200;

  // Handle both hands open palm gesture for saving and sending
  const handleBothHandsOpenPalm = useCallback((detected: boolean) => {
    if (detected && !doneTriggered && recognizedText.trim()) {
      if (bothHandsStartTimeRef.current === 0) {
        // Just started detecting both hands
        bothHandsStartTimeRef.current = Date.now();
        bothHandsTriggeredRef.current = false;
      } else if (!bothHandsTriggeredRef.current) {
        const elapsed = Date.now() - bothHandsStartTimeRef.current;
        setBothHandsHoldProgress(Math.min(100, (elapsed / BOTH_HANDS_HOLD_DURATION) * 100));
        
        if (elapsed >= BOTH_HANDS_HOLD_DURATION) {
          bothHandsTriggeredRef.current = true;
          setBothHandsHoldProgress(0);
          setDoneTriggered(true);
          
          // Save and send to agent
          sendToAgent(recognizedText).then(() => {
            setRecognizedText("");
            setTimeout(() => {
              setDoneTriggered(false);
              bothHandsTriggeredRef.current = false;
            }, 2000);
          });
        }
      }
    } else {
      // Reset both hands detection
      bothHandsStartTimeRef.current = 0;
      setBothHandsHoldProgress(0);
    }
  }, [recognizedText, sendToAgent, doneTriggered]);

  const handleLetterDetected = useCallback((result: LetterClassificationResult) => {
    setCurrentLetter(result);
    const letter = result.letter;

    // Skip letter detection if it's an OPEN_PALM special gesture (handled by both hands)
    if (result.specialGesture === "OPEN_PALM") {
      return;
    }

    // Track letter stability for regular letters
    if (letter !== lastLetterRef.current) {
      lastLetterRef.current = letter;
      letterStartTimeRef.current = Date.now();
      letterAddedRef.current = false;
      setHoldProgress(0);
    } else if (
      letter &&
      !letterAddedRef.current
    ) {
      const elapsed = Date.now() - letterStartTimeRef.current;
      setHoldProgress(Math.min(100, (elapsed / HOLD_DURATION) * 100));
      
      if (elapsed >= HOLD_DURATION) {
        setRecognizedText((prev) => prev + letter);
        letterAddedRef.current = true;
        setHoldProgress(0);

        setJustAddedLetter(letter);
        setTimeout(() => setJustAddedLetter(null), 1000);
      }
    }
  }, []);

  const {
    isModelLoading,
    modelError,
    currentDetection,
    handDetected,
    handsCount,
    bothHandsOpenPalm,
  } = useHandDetection({
    videoElement: cameraRef.current?.videoElement ?? null,
    canvasElement: cameraRef.current?.canvasElement ?? null,
    isEnabled: isCameraReady && !isPaused,
    onLetterDetected: handleLetterDetected,
    onBothHandsOpenPalm: handleBothHandsOpenPalm,
  });

  useEffect(() => {
    if (!currentDetection || currentDetection.hands.length === 0) {
      setCurrentLetter(null);
      lastLetterRef.current = null;
      setHoldProgress(0);
    }
  }, [currentDetection]);

  // Clear detection state when paused
  useEffect(() => {
    if (isPaused) {
      setCurrentLetter(null);
      lastLetterRef.current = null;
      setHoldProgress(0);
      // Reset both hands detection
      bothHandsStartTimeRef.current = 0;
      setBothHandsHoldProgress(0);
    }
  }, [isPaused]);

  const handleClear = () => setRecognizedText("");
  const handleBackspace = () => setRecognizedText((prev) => prev.slice(0, -1));
  const handleAddSpace = () => setRecognizedText((prev) => prev + " ");

  const handleCameraReady = useCallback(() => {
    setIsCameraReady(true);
  }, []);

  const handleCameraError = useCallback((error: string) => {
    console.error("ASLRecognizer - Camera error:", error);
  }, []);

  const handleTogglePause = () => {
    setIsPaused((prev) => !prev);
  };

  const handleToggleMirror = () => {
    setIsMirrored((prev) => !prev);
  };

  const getStatusText = () => {
    if (modelError) return "Error";
    if (isModelLoading) return "Loading AI model...";
    if (!isCameraReady) return "starting camera...";
    if (isPaused) return "paused";
    if (isSpeaking) return "Agent speaking...";
    if (isConnecting) return "Connecting to agent...";
    if (bothHandsOpenPalm) return "🙌 Both hands detected - hold to send";
    if (handDetected) return `${handsCount} hand${handsCount > 1 ? "s" : ""} detected`;
    return "recognition active";
  };

  const getStatusDotClass = () => {
    if (modelError) return "status-dot--error";
    if (isModelLoading || !isCameraReady || isConnecting) return "status-dot--loading";
    if (isPaused) return "status-dot--idle";
    if (isSpeaking) return "status-dot--speaking";
    if (handDetected) return "status-dot--listening";
    return "status-dot--idle";
  };

  return (
    <div className="panel-grid">
      {/* LEFT PANEL: CAMERA */}
      <div className="panel">
        <div className="panel-header">
          <h2>Camera Preview</h2>
          <div className="status-badge">
            <span className={`status-dot ${getStatusDotClass()}`}></span>
            <span>{getStatusText()}</span>
          </div>
        </div>

        {modelError && (
          <div className="error-box">
            <p><strong>Error:</strong> {modelError}</p>
            <p className="error-box-hint">Try refreshing the page.</p>
          </div>
        )}

        {agentError && (
          <div className="error-box">
            <p><strong>Agent error:</strong> {agentError}</p>
          </div>
        )}

        <div style={{ position: "relative" }}>
          <Camera
            ref={cameraRef}
            width={640}
            height={480}
            mirrored={isMirrored}
            onCameraReady={handleCameraReady}
            onCameraError={handleCameraError}
          />

          {/* Paused Overlay */}
          {isPaused && isCameraReady && (
            <div className="loading-overlay" style={{ background: "rgba(0, 0, 0, 0.6)" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ fontSize: "48px", marginBottom: "12px" }}>⏸️</span>
                <p className="loading-text">Recognition Paused</p>
              </div>
            </div>
          )}

          {isCameraReady && isModelLoading && (
            <div className="loading-overlay">
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div className="loading-spinner"></div>
                <p className="loading-text">Loading hand detection model...</p>
              </div>
            </div>
          )}

          {/* DONE Gesture - Sending to Agent */}
          {doneTriggered && (
            <div className="loading-overlay">
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div className="loading-spinner"></div>
                <p className="loading-text">Sending to AI Agent...</p>
              </div>
            </div>
          )}

          {/* Letter Added Confirmation */}
          {justAddedLetter && !doneTriggered && !isPaused && (
            <div className="letter-added-toast">
              <span>✓</span>
              <span>{justAddedLetter}</span>
            </div>
          )}

          {/* Hold Progress - Both Hands Open Palm for sending */}
          {!isPaused &&
            bothHandsOpenPalm &&
            bothHandsHoldProgress > 0 &&
            !doneTriggered && (
              <div className="hold-progress-container">
                <span style={{ fontSize: "20px" }}>🙌</span>
                <span className="hold-progress-letter" style={{ fontSize: "14px" }}>SEND</span>
                <div className="hold-progress-bar">
                  <div
                    className="hold-progress-fill"
                    style={{ width: `${bothHandsHoldProgress}%` }}
                  />
                </div>
              </div>
            )}

          {/* Hold Progress - Regular letters */}
          {!isPaused &&
            !bothHandsOpenPalm &&
            currentLetter &&
            currentLetter.letter &&
            lastLetterRef.current === currentLetter.letter &&
            !letterAddedRef.current &&
            !justAddedLetter && (
              <div className="hold-progress-container">
                <span className="hold-progress-letter">{currentLetter.letter}</span>
                <div className="hold-progress-bar">
                  <div
                    className="hold-progress-fill"
                    style={{ width: `${holdProgress}%` }}
                  />
                </div>
              </div>
            )}
        </div>

        <div className="instruction-box">
          <h4>Tips</h4>
          <ul>
            <li>Sign at a natural pace</li>
            <li>Keep your hand fully visible</li>
            <li>🙌 Hold both hands up (open palms) for 1.2s to send</li>
          </ul>
        </div>

        <div className="button-group">
          <button
            className={`btn btn-small ${isPaused ? "btn-primary" : "btn-secondary"}`}
            onClick={handleTogglePause}
            title={isPaused ? "Resume recognition" : "Pause recognition"}
          >
            {isPaused ? "▶ Resume" : "⏸ Pause"}
          </button>
          <button
            className={`btn btn-small ${!isMirrored ? "btn-primary" : "btn-secondary"}`}
            onClick={handleToggleMirror}
            title={isMirrored ? "Disable mirror" : "Enable mirror"}
          >
            {isMirrored ? "🔄 Mirrored" : "🔄 Normal"}
          </button>
        </div>
      </div>

      {/* CENTER PANEL: RECOGNIZED TEXT */}
      <div className="panel">
        <div className="panel-header">
          <h2>What the system hears from you</h2>
        </div>

        <div className="status-bar">
          <span className="status-indicator" style={{ animationPlayState: isPaused ? "paused" : "running" }}></span>
          <span>
            {isPaused ? "Paused" : isSpeaking ? "Agent speaking..." : isConnected ? "Agent connected" : "Real-time recognition..."}
          </span>
        </div>

        <RecognizedText
          text={recognizedText}
          currentLetter={isPaused ? null : currentLetter}
          onClear={handleClear}
          onBackspace={handleBackspace}
          onAddSpace={handleAddSpace}
        />
      </div>

      {/* RIGHT PANEL: SITUATIONS */}
      <div className="panel panel--situations">
        <div className="panel-header">
          <h2>Situations & Conversation</h2>
        </div>

        <div className="situation-tabs">
          <button className="tab tab--active">Job Interview</button>
          <button className="tab">First Day</button>
          <button className="tab">Daily Standup</button>
          <button className="tab">Quick Question</button>
        </div>

        <div className="situation-description">
          Help with introductions and common interview questions. Choose a pre-made phrase or write your own!
        </div>

        <div className="quick-phrases">
          <button className="phrase-chip">
            "Could you please repeat the question?"
          </button>
          <button className="phrase-chip">
            "I need a few seconds to think about this."
          </button>
          <button className="phrase-chip">
            "Could you show me where to find this in the system?"
          </button>
          <button className="phrase-chip">
            "I'm very happy to be part of the team."
          </button>
        </div>

        <div className="conversation">
          <div className="message message--partner">
            <div className="message-bubble">
              Hi! It's wonderful that you're here for the interview. Would you like to tell us a bit about yourself?
            </div>
            <div className="message-meta">
              <span>Interviewer</span>
              <span>10:24</span>
            </div>
          </div>

          <div className="message message--user">
            <div className="message-bubble">
              Thank you! I'm very happy to be invited. I've been working in UX for the past five years and was looking for new challenges.
            </div>
            <div className="message-meta">
              <span>You</span>
              <span>10:25</span>
            </div>
          </div>

          <div className="message message--partner">
            <div className="message-bubble">
              Excellent! What projects have you spent the most time on?
            </div>
            <div className="message-meta">
              <span>Interviewer</span>
              <span>10:26</span>
            </div>
          </div>

          <div className="message message--user">
            <div className="message-bubble">
              Mainly e-commerce and social media applications. User feedback was more important to me than my own ideas.
            </div>
            <div className="message-meta">
              <span>You</span>
              <span>10:27</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
