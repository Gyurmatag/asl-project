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

  // Track letter stability for adding to text
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

  const HOLD_DURATION = 800; // Hold letter for 0.8 seconds to add it
  const DONE_HOLD_DURATION = 1500; // Hold both palms for 1.5 seconds to trigger done

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
        
        if (elapsed >= DONE_HOLD_DURATION && recognizedText.trim().length > 0) {
          // Both palms held long enough, save message and send to agent
          doneTriggeredRef.current = true;
          setDoneProgress(0);
          handleSaveMessage();
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
        // Letter held long enough, add it
        setRecognizedText((prev) => prev + letter);
        letterAddedRef.current = true;
        setHoldProgress(0);

        // Show visual feedback
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

  // Reset when no hand detected
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
    console.error("Camera error:", error);
  }, []);

  return (
    <>
      {/* Status Bar */}
      <div className="w-full max-w-[640px] flex items-center gap-4 p-3 bg-zinc-900 rounded-lg flex-wrap">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isCameraReady ? "bg-green-500" : "bg-yellow-500 animate-pulse"
            }`}
          />
          <span className="text-sm text-zinc-400">
            {isCameraReady ? "Camera ready" : "Starting camera..."}
          </span>
        </div>
        <div className="w-px h-4 bg-zinc-700" />
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              modelError
                ? "bg-red-500"
                : isModelLoading
                ? "bg-yellow-500 animate-pulse"
                : "bg-green-500"
            }`}
          />
          <span className="text-sm text-zinc-400">
            {modelError
              ? "Model error"
              : isModelLoading
              ? "Loading AI model..."
              : "AI model ready"}
          </span>
        </div>
        {handDetected && (
          <>
            <div className="w-px h-4 bg-zinc-700" />
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm text-zinc-400">
                {handsCount === 1 ? "1 hand" : `${handsCount} hands`} detected
              </span>
            </div>
          </>
        )}
        {/* Agent Status */}
        {(isConnecting || isConnected || isSpeaking) && (
          <>
            <div className="w-px h-4 bg-zinc-700" />
            <div className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-full ${
                isSpeaking ? "bg-purple-500 animate-pulse" : 
                isConnected ? "bg-purple-500" : 
                "bg-yellow-500 animate-pulse"
              }`} />
              <span className="text-sm text-zinc-400">
                {isSpeaking ? "Speaking..." : isConnected ? "Agent connected" : "Connecting to agent..."}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Model Error */}
      {modelError && (
        <div className="w-full max-w-[640px] p-4 bg-red-900/20 border border-red-800 rounded-lg">
          <p className="text-red-400 text-sm">
            <strong>Error loading model:</strong> {modelError}
          </p>
          <p className="text-red-400/70 text-xs mt-2">
            Try refreshing the page.
          </p>
        </div>
      )}

      {/* Agent Error */}
      {agentError && (
        <div className="w-full max-w-[640px] p-4 bg-red-900/20 border border-red-800 rounded-lg">
          <p className="text-red-400 text-sm">
            <strong>Agent error:</strong> {agentError}
          </p>
        </div>
      )}

      {/* Camera View */}
      <div className="relative">
        <Camera
          ref={cameraRef}
          width={640}
          height={480}
          onCameraReady={handleCameraReady}
          onCameraError={handleCameraError}
        />

        {/* Loading Overlay */}
        {isCameraReady && isModelLoading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-white text-sm">
                Loading hand detection model...
              </span>
            </div>
          </div>
        )}

        {/* Sending to Agent Overlay */}
        {isSendingToAgent && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-lg">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-white text-lg font-medium">
                Sending to AI Agent...
              </span>
            </div>
          </div>
        )}

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
                  <div
                    className="h-full bg-green-500 transition-all duration-100"
                    style={{ width: `${holdProgress}%` }}
                  />
                </div>
              </div>
            </div>
          )}
      </div>

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
      </div>
    </>
  );
}
