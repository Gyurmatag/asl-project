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

  // ElevenLabs Agent integration
  const { isConnecting, isConnected, isSpeaking, error: agentError, sendToAgent } = useElevenLabsAgent();

  // Track letter stability for adding to text
  const lastLetterRef = useRef<string | null>(null);
  const letterStartTimeRef = useRef<number>(0);
  const letterAddedRef = useRef(false);
  const [justAddedLetter, setJustAddedLetter] = useState<string | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const [doneTriggered, setDoneTriggered] = useState(false);

  const HOLD_DURATION = 800; // Hold letter for 0.8 seconds to add it
  const DONE_HOLD_DURATION = 1200; // Hold thumbs up for 1.2 seconds to trigger agent

  const handleLetterDetected = useCallback((result: LetterClassificationResult) => {
    setCurrentLetter(result);
    const letter = result.letter;

    // Check for DONE gesture (thumbs up)
    if (letter === "DONE") {
      if (lastLetterRef.current !== "DONE") {
        lastLetterRef.current = "DONE";
        letterStartTimeRef.current = Date.now();
        letterAddedRef.current = false;
        setHoldProgress(0);
      } else if (!letterAddedRef.current && !doneTriggered) {
        const elapsed = Date.now() - letterStartTimeRef.current;
        setHoldProgress(Math.min(100, (elapsed / DONE_HOLD_DURATION) * 100));
        
        if (elapsed >= DONE_HOLD_DURATION && recognizedText.trim()) {
          // Thumbs up held long enough - send to agent!
          letterAddedRef.current = true;
          setDoneTriggered(true);
          setHoldProgress(0);
          
          // Send accumulated letters to the ElevenLabs agent
          sendToAgent(recognizedText).then(() => {
            // Clear text after sending
            setRecognizedText("");
            setTimeout(() => setDoneTriggered(false), 2000);
          });
        }
      }
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
        // Letter held long enough, add it
        setRecognizedText((prev) => prev + letter);
        letterAddedRef.current = true;
        setHoldProgress(0);

        // Show visual feedback
        setJustAddedLetter(letter);
        setTimeout(() => setJustAddedLetter(null), 1000);
      }
    }
  }, [recognizedText, sendToAgent, doneTriggered]);

  const {
    isModelLoading,
    modelError,
    currentDetection,
    handDetected,
    handsCount,
  } = useHandDetection({
    videoElement: cameraRef.current?.videoElement ?? null,
    canvasElement: cameraRef.current?.canvasElement ?? null,
    isEnabled: isCameraReady,
    onLetterDetected: handleLetterDetected,
  });

  // Reset when no hand detected
  useEffect(() => {
    if (!currentDetection || currentDetection.hands.length === 0) {
      setCurrentLetter(null);
      lastLetterRef.current = null;
      setHoldProgress(0);
    }
  }, [currentDetection]);

  const handleClear = () => setRecognizedText("");
  const handleBackspace = () => setRecognizedText((prev) => prev.slice(0, -1));
  const handleAddSpace = () => setRecognizedText((prev) => prev + " ");

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

        {/* DONE Gesture Detected - Sending to Agent */}
        {doneTriggered && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-lg">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-white text-lg font-medium">
                Sending to AI Agent...
              </span>
            </div>
          </div>
        )}

        {/* Letter Added Confirmation */}
        {justAddedLetter && !doneTriggered && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-green-600/90 px-5 py-3 rounded-full animate-pulse">
            <div className="flex items-center gap-2">
              <span className="text-white text-lg">✓</span>
              <span className="text-white font-medium text-xl">
                {justAddedLetter}
              </span>
            </div>
          </div>
        )}

        {/* Hold Progress Indicator - DONE gesture */}
        {currentLetter &&
          currentLetter.letter === "DONE" &&
          lastLetterRef.current === "DONE" &&
          !letterAddedRef.current &&
          !doneTriggered && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-purple-900/90 px-4 py-2 rounded-full">
              <div className="flex items-center gap-3">
                <span className="text-white text-xl">👍</span>
                <span className="text-white font-bold">SEND</span>
                <div className="w-20 h-2 bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 transition-all duration-100"
                    style={{ width: `${holdProgress}%` }}
                  />
                </div>
              </div>
            </div>
          )}

        {/* Hold Progress Indicator - Regular letters */}
        {currentLetter &&
          currentLetter.letter &&
          currentLetter.letter !== "DONE" &&
          lastLetterRef.current === currentLetter.letter &&
          !letterAddedRef.current &&
          !justAddedLetter && (
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
      />

      {/* Instructions */}
      <div className="w-full max-w-[640px] p-4 bg-purple-900/20 border border-purple-800 rounded-lg">
        <p className="text-purple-300 text-sm">
          <strong>👍 Thumbs Up = SEND</strong> — Hold thumbs up for 1.2 seconds to send your letters to the AI agent who will decode and speak them!
        </p>
      </div>
    </>
  );
}
