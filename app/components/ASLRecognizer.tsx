"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Camera, { CameraRef } from "./Camera";
import RecognizedText from "./RecognizedText";
import SavedMessages from "./SavedMessages";
import { useHandDetection } from "../hooks/useHandDetection";
import { useElevenLabsAgent } from "../hooks/useElevenLabsAgent";
import { LetterClassificationResult } from "../lib/mlClassifier";

// Saved message type
export interface SavedMessage {
  id: string;
  text: string;
  timestamp: Date;
}

export default function ASLRecognizer() {
  const cameraRef = useRef<CameraRef>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [recognizedText, setRecognizedText] = useState("");
  const [currentLetter, setCurrentLetter] = useState<LetterClassificationResult | null>(null);
  
  // Saved messages in memory
  const [savedMessages, setSavedMessages] = useState<SavedMessage[]>([]);
  const [justSaved, setJustSaved] = useState(false);

  // ElevenLabs Agent integration
  const { isConnecting, isConnected, isSpeaking, error: agentError, sendToAgent } = useElevenLabsAgent();

  const lastLetterRef = useRef<string | null>(null);
  const letterStartTimeRef = useRef<number>(0);
  const letterAddedRef = useRef(false);
  const [justAddedLetter, setJustAddedLetter] = useState<string | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  
  // Track "done" gesture (both hands open palms) stability
  const doneGestureStartRef = useRef<number>(0);
  const doneTriggeredRef = useRef(false);
  const [doneProgress, setDoneProgress] = useState(0);
  const [bothHandsOpen, setBothHandsOpen] = useState(false);
  const [isSendingToAgent, setIsSendingToAgent] = useState(false);

<<<<<<< Updated upstream
  const HOLD_DURATION = 800; // Hold letter for 0.8 seconds to add it
  const DONE_HOLD_DURATION = 1500; // Hold both palms for 1.5 seconds to trigger done
=======
  const HOLD_DURATION = 800;
  const DONE_HOLD_DURATION = 1200;
>>>>>>> Stashed changes

  // Track if we're in the process of saving to prevent duplicates
  const isSavingRef = useRef(false);

  // Save message handler - also sends to agent
  const handleSaveMessage = useCallback(() => {
    // Prevent duplicate saves
    if (isSavingRef.current) return;
    
    const trimmedText = recognizedText.trim();
    if (trimmedText.length === 0) return;
    
    isSavingRef.current = true;
    
    const newMessage: SavedMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      text: trimmedText,
      timestamp: new Date(),
    };
    
    setSavedMessages((prev) => [newMessage, ...prev]);
    setJustSaved(true);
    
    // Send to ElevenLabs agent
    setIsSendingToAgent(true);
    sendToAgent(trimmedText).finally(() => {
      setIsSendingToAgent(false);
    });
    
    setRecognizedText("");
    
    // Reset states
    lastLetterRef.current = null;
    letterAddedRef.current = false;
    setHoldProgress(0);
    setDoneProgress(0);
    
    setTimeout(() => {
      setJustSaved(false);
      isSavingRef.current = false;
    }, 2000);
  }, [recognizedText, sendToAgent]);

  // Handle both hands open palm detection for "done" gesture
  const handleBothHandsOpenPalm = useCallback((detected: boolean) => {
    setBothHandsOpen(detected);
    
    if (detected) {
      // Reset letter tracking when showing both palms
      lastLetterRef.current = null;
      setHoldProgress(0);
      
      if (!doneTriggeredRef.current && !isSavingRef.current) {
        if (doneGestureStartRef.current === 0) {
          doneGestureStartRef.current = Date.now();
        }
        const elapsed = Date.now() - doneGestureStartRef.current;
        setDoneProgress(Math.min(100, (elapsed / DONE_HOLD_DURATION) * 100));
        
<<<<<<< Updated upstream
        if (elapsed >= DONE_HOLD_DURATION && recognizedText.trim().length > 0) {
          // Both palms held long enough, save message and send to agent
          doneTriggeredRef.current = true;
          setDoneProgress(0);
          handleSaveMessage();
=======
        if (elapsed >= DONE_HOLD_DURATION && recognizedText.trim()) {
          letterAddedRef.current = true;
          setDoneTriggered(true);
          setHoldProgress(0);
          
          sendToAgent(recognizedText).then(() => {
            setRecognizedText("");
            setTimeout(() => setDoneTriggered(false), 2000);
          });
>>>>>>> Stashed changes
        }
      }
    } else {
      // Reset done gesture tracking when not showing both palms
      doneGestureStartRef.current = 0;
      // Only reset if not currently in the saving cooldown period
      if (!isSavingRef.current) {
        doneTriggeredRef.current = false;
      }
      setDoneProgress(0);
    }
  }, [recognizedText, handleSaveMessage]);

  const handleLetterDetected = useCallback((result: LetterClassificationResult) => {
    setCurrentLetter(result);
    const letter = result.letter;

    // Skip letter tracking if both hands are showing (done gesture)
    if (bothHandsOpen) {
      return;
    }

    // Track letter stability
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
  }, [bothHandsOpen]);

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
    isEnabled: isCameraReady,
    onLetterDetected: handleLetterDetected,
    onBothHandsOpenPalm: handleBothHandsOpenPalm,
  });

  useEffect(() => {
    if (!currentDetection || currentDetection.hands.length === 0) {
      setCurrentLetter(null);
      lastLetterRef.current = null;
      setHoldProgress(0);
      doneGestureStartRef.current = 0;
      doneTriggeredRef.current = false;
      setDoneProgress(0);
    }
  }, [currentDetection]);

  const handleClear = () => setRecognizedText("");
  const handleBackspace = () => setRecognizedText((prev) => prev.slice(0, -1));
  const handleAddSpace = () => setRecognizedText((prev) => prev + " ");
  const handleDeleteMessage = (id: string) => {
    setSavedMessages((prev) => prev.filter((msg) => msg.id !== id));
  };

  const handleCameraReady = useCallback(() => {
    setIsCameraReady(true);
  }, []);

  const handleCameraError = useCallback((error: string) => {
    console.error("ASLRecognizer - Kamera hiba:", error);
  }, []);

  const getStatusText = () => {
    if (modelError) return "Hiba";
    if (isModelLoading) return "AI modell betöltése...";
    if (!isCameraReady) return "kamera indítása...";
    if (isSpeaking) return "Agent beszél...";
    if (isConnecting) return "Agent csatlakozás...";
    if (handDetected) return `${handsCount} kéz felismerve`;
    return "felismerés aktív";
  };

  const getStatusDotClass = () => {
    if (modelError) return "status-dot--error";
    if (isModelLoading || !isCameraReady || isConnecting) return "status-dot--loading";
    if (isSpeaking) return "status-dot--speaking";
    if (handDetected) return "status-dot--listening";
    return "status-dot--idle";
  };

  return (
    <div className="panel-grid">
      {/* BAL PANEL: KAMERA */}
      <div className="panel">
        <div className="panel-header">
          <h2>Kamera előnézet</h2>
          <div className="status-badge">
            <span className={`status-dot ${getStatusDotClass()}`}></span>
            <span>{getStatusText()}</span>
          </div>
        </div>

        {modelError && (
          <div className="error-box">
            <p><strong>Hiba:</strong> {modelError}</p>
            <p className="error-box-hint">Próbáld újratölteni az oldalt.</p>
          </div>
        )}

        {agentError && (
          <div className="error-box">
            <p><strong>Agent hiba:</strong> {agentError}</p>
          </div>
        )}

        <div style={{ position: "relative" }}>
          <Camera
            ref={cameraRef}
            width={640}
            height={480}
            onCameraReady={handleCameraReady}
            onCameraError={handleCameraError}
          />

          {isCameraReady && isModelLoading && (
            <div className="loading-overlay">
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div className="loading-spinner"></div>
                <p className="loading-text">Kézfelismerő modell betöltése...</p>
              </div>
            </div>
          )}

<<<<<<< Updated upstream
        {/* Sending to Agent Overlay */}
        {isSendingToAgent && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-lg">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-white text-lg font-medium">
                Sending to AI Agent...
              </span>
=======
          {/* DONE Gesture - Sending to Agent */}
          {doneTriggered && (
            <div className="loading-overlay">
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div className="loading-spinner" style={{ borderTopColor: "#A855F7" }}></div>
                <p className="loading-text">Küldés az AI Agent-nek...</p>
              </div>
>>>>>>> Stashed changes
            </div>
          )}

<<<<<<< Updated upstream
        {/* Message Saved Confirmation */}
        {justSaved && !isSendingToAgent && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-600/95 px-6 py-3 rounded-lg shadow-lg z-10">
            <div className="flex items-center gap-2">
              <span className="text-white text-xl">✓</span>
              <span className="text-white font-semibold">Message Saved &amp; Sent!</span>
            </div>
          </div>
        )}

        {/* Letter Added Confirmation */}
        {justAddedLetter && !justSaved && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-green-600/90 px-5 py-3 rounded-full animate-pulse">
            <div className="flex items-center gap-2">
              <span className="text-white text-lg">✓</span>
              <span className="text-white font-medium text-xl">
                {justAddedLetter}
              </span>
            </div>
          </div>
        )}
        
        {/* Done Gesture Progress Indicator (Both Hands Open) */}
        {bothHandsOpenPalm && 
         !doneTriggeredRef.current && 
         !justSaved &&
         recognizedText.trim().length > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-purple-900/90 px-5 py-3 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🙌</span>
              <div className="flex flex-col gap-1">
                <span className="text-white text-sm font-medium">Hold to save &amp; send</span>
                <div className="w-24 h-2 bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 transition-all duration-100"
                    style={{ width: `${doneProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Both hands detected but no text to save */}
        {bothHandsOpenPalm && 
         recognizedText.trim().length === 0 && 
         !justSaved && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-zinc-800/90 px-5 py-3 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🙌</span>
              <span className="text-zinc-400 text-sm">Spell something first to send</span>
            </div>
          </div>
        )}

        {/* Hold Progress Indicator - Regular letters */}
        {currentLetter &&
          currentLetter.letter &&
          lastLetterRef.current === currentLetter.letter &&
          !letterAddedRef.current &&
          !justAddedLetter &&
          !bothHandsOpenPalm && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 px-4 py-2 rounded-full">
              <div className="flex items-center gap-3">
                <span className="text-white text-2xl font-bold">
                  {currentLetter.letter}
                </span>
                <div className="w-20 h-2 bg-zinc-700 rounded-full overflow-hidden">
=======
          {/* Letter Added Confirmation */}
          {justAddedLetter && !doneTriggered && (
            <div className="letter-added-toast">
              <span>✓</span>
              <span>{justAddedLetter}</span>
            </div>
          )}

          {/* Hold Progress - DONE gesture */}
          {currentLetter &&
            currentLetter.letter === "DONE" &&
            lastLetterRef.current === "DONE" &&
            !letterAddedRef.current &&
            !doneTriggered && (
              <div className="hold-progress-container" style={{ background: "rgba(126, 34, 206, 0.9)" }}>
                <span style={{ fontSize: "20px" }}>👍</span>
                <span className="hold-progress-letter" style={{ fontSize: "14px" }}>KÜLDÉS</span>
                <div className="hold-progress-bar">
                  <div
                    className="hold-progress-fill"
                    style={{ width: `${holdProgress}%`, background: "#A855F7" }}
                  />
                </div>
              </div>
            )}

          {/* Hold Progress - Regular letters */}
          {currentLetter &&
            currentLetter.letter &&
            currentLetter.letter !== "DONE" &&
            lastLetterRef.current === currentLetter.letter &&
            !letterAddedRef.current &&
            !justAddedLetter && (
              <div className="hold-progress-container">
                <span className="hold-progress-letter">{currentLetter.letter}</span>
                <div className="hold-progress-bar">
>>>>>>> Stashed changes
                  <div
                    className="hold-progress-fill"
                    style={{ width: `${holdProgress}%` }}
                  />
                </div>
              </div>
            )}
        </div>

        <div className="instruction-box">
          <h4>Tanácsok</h4>
          <ul>
            <li>Jelelj természetes tempóban</li>
            <li>A kezed legyen teljesen látható</li>
            <li>👍 Tartsd a hüvelykujjat 1.2mp-ig a küldéshez</li>
          </ul>
        </div>

        <div className="button-group">
          <button className="btn btn-secondary btn-small" title="Felismerés szüneteltetése">
            Szüneteltetés
          </button>
          <button className="btn btn-secondary btn-small" title="Kamerakép tükrözése">
            Tükrözés
          </button>
        </div>
      </div>

      {/* KÖZÉP PANEL: FELISMERT SZÖVEG */}
      <div className="panel">
        <div className="panel-header">
          <h2>Amit a rendszer hall tőled</h2>
        </div>

        <div className="status-bar">
          <span className="status-indicator"></span>
          <span>
            {isSpeaking ? "Agent beszél..." : isConnected ? "Agent csatlakozva" : "Valós idejű felismerés…"}
          </span>
        </div>

        <RecognizedText
          text={recognizedText}
          currentLetter={currentLetter}
          onClear={handleClear}
          onBackspace={handleBackspace}
          onAddSpace={handleAddSpace}
        />
      </div>

<<<<<<< Updated upstream
      {/* Recognition Results */}
      <RecognizedText
        text={recognizedText}
        currentLetter={currentLetter}
        onClear={handleClear}
        onBackspace={handleBackspace}
        onAddSpace={handleAddSpace}
        onDone={handleSaveMessage}
        canSave={recognizedText.trim().length > 0}
        bothHandsOpen={bothHandsOpenPalm}
      />
      
      {/* Saved Messages History */}
      <SavedMessages 
        messages={savedMessages}
        onDeleteMessage={handleDeleteMessage}
      />

      {/* Instructions */}
      <div className="w-full max-w-[640px] p-4 bg-purple-900/20 border border-purple-800 rounded-lg">
        <p className="text-purple-300 text-sm">
          <strong>🙌 Both Hands Open = SEND</strong> — Hold both palms facing camera for 1.5 seconds to save your message and send it to the AI agent who will decode and speak it!
        </p>
=======
      {/* JOBB PANEL: SZITUÁCIÓK */}
      <div className="panel">
        <div className="panel-header">
          <h2>Szituációk & beszélgetés</h2>
        </div>

        <div className="situation-tabs">
          <button className="tab tab--active">Állásinterjú</button>
          <button className="tab">Első munkanap</button>
          <button className="tab">Napi standup</button>
          <button className="tab">Gyors kérdés</button>
        </div>

        <div className="situation-description">
          Segítség az önbemutatkozáshoz és a gyakori interjúkérdésekhez. Válassz egy előre elkészített mondatot, vagy írj sajátat!
        </div>

        <div className="quick-phrases">
          <button className="phrase-chip">
            „Kérem, ismételje meg a kérdést."
          </button>
          <button className="phrase-chip">
            „Néhány másodpercre szükségem van gondolni erre."
          </button>
          <button className="phrase-chip">
            „Meg tudná mutatni, hol találom ezt a rendszerben?"
          </button>
          <button className="phrase-chip">
            „Nagyon örülök, hogy a csapat részese lehetek."
          </button>
        </div>

        <div className="conversation">
          <div className="message message--partner">
            <div className="message-bubble">
              Szia! Valóban csodálatos, hogy itt vagy az interjún. Szeretnéd elmondani magadról egy kicsit?
            </div>
            <div className="message-meta">
              <span>Interjúztató</span>
              <span>10:24</span>
            </div>
          </div>

          <div className="message message--user">
            <div className="message-bubble">
              Köszönöm! Nagyon örülök, hogy meghívtak. Az elmúlt öt évben UX-vel foglalkoztam, és szerettem volna új kihívásokat keresni.
            </div>
            <div className="message-meta">
              <span>Te</span>
              <span>10:25</span>
            </div>
          </div>

          <div className="message message--partner">
            <div className="message-bubble">
              Kitűnő! Milyen projekteken dolgoztál a legtöbb időt?
            </div>
            <div className="message-meta">
              <span>Interjúztató</span>
              <span>10:26</span>
            </div>
          </div>

          <div className="message message--user">
            <div className="message-bubble">
              Főleg e-commerce és szociális média alkalmazásokon. A felhasználói visszajelzés volt a fontosabb nekem, mint a saját ötleteim.
            </div>
            <div className="message-meta">
              <span>Te</span>
              <span>10:27</span>
            </div>
          </div>
        </div>
>>>>>>> Stashed changes
      </div>
    </div>
  );
}
