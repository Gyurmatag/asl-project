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
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Camera controls
  const [isPaused, setIsPaused] = useState(false);
  const [isMirrored, setIsMirrored] = useState(true);

  // Conversation mode: 'conversation' = AI responds, 'speakForMe' = just speak the text
  const [conversationMode, setConversationMode] = useState<'conversation' | 'speakForMe'>('speakForMe');

  // ElevenLabs Agent integration
  const { 
    isConnecting, 
    isConnected, 
    isSpeaking, 
    error: agentError, 
    messages,
    agentTranscript,
    sendMessage,
    speakText,
    startConversation,
    endConversation,
    clearMessages,
  } = useElevenLabsAgent();

  const lastLetterRef = useRef<string | null>(null);
  const letterStartTimeRef = useRef<number>(0);
  const letterAddedRef = useRef(false);
  const [justAddedLetter, setJustAddedLetter] = useState<string | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const [doneTriggered, setDoneTriggered] = useState(false);
  
  // Two open hands tracking
  const bothHandsStartRef = useRef<number>(0);
  const [bothHandsProgress, setBothHandsProgress] = useState(0);

  const HOLD_DURATION = 800;
  const DONE_HOLD_DURATION = 1200;

  // Store values in refs to avoid callback recreation
  const recognizedTextRef = useRef(recognizedText);
  const doneTriggeredRef = useRef(doneTriggered);
  const sendMessageRef = useRef(sendMessage);
  const speakTextRef = useRef(speakText);
  const conversationModeRef = useRef(conversationMode);
  
  // Keep refs up to date
  useEffect(() => {
    recognizedTextRef.current = recognizedText;
  }, [recognizedText]);
  
  useEffect(() => {
    doneTriggeredRef.current = doneTriggered;
  }, [doneTriggered]);
  
  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);
  
  useEffect(() => {
    speakTextRef.current = speakText;
  }, [speakText]);
  
  useEffect(() => {
    conversationModeRef.current = conversationMode;
  }, [conversationMode]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, agentTranscript]);

  // Handle two open hands gesture for sending - use refs to avoid recreation
  const handleBothHandsOpenPalm = useCallback((detected: boolean) => {
    const currentText = recognizedTextRef.current;
    const isDoneTriggered = doneTriggeredRef.current;
    
    if (detected && currentText.trim() && !isDoneTriggered) {
      if (bothHandsStartRef.current === 0) {
        bothHandsStartRef.current = Date.now();
      }
      
      const elapsed = Date.now() - bothHandsStartRef.current;
      setBothHandsProgress(Math.min(100, (elapsed / DONE_HOLD_DURATION) * 100));
      
      if (elapsed >= DONE_HOLD_DURATION) {
        setDoneTriggered(true);
        setBothHandsProgress(0);
        bothHandsStartRef.current = 0;
        
        // Use appropriate function based on mode
        const sendFn = conversationModeRef.current === 'conversation' ? sendMessageRef.current : speakTextRef.current;
        sendFn(currentText).then(() => {
          setRecognizedText("");
          setTimeout(() => setDoneTriggered(false), 2000);
        });
      }
    } else {
      bothHandsStartRef.current = 0;
      setBothHandsProgress(0);
    }
  }, []); // Empty deps - uses refs for all values

  const handleLetterDetected = useCallback((result: LetterClassificationResult) => {
    setCurrentLetter(result);
    const letter = result.letter;

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
      setBothHandsProgress(0);
      bothHandsStartRef.current = 0;
    }
  }, [isPaused]);

  const handleClear = () => setRecognizedText("");
  const handleBackspace = () => setRecognizedText((prev) => prev.slice(0, -1));
  const handleAddSpace = () => setRecognizedText((prev) => prev + " ");
  
  const handleSendMessage = () => {
    if (recognizedText.trim()) {
      // Use appropriate function based on mode
      if (conversationMode === 'conversation') {
        sendMessage(recognizedText);
      } else {
        speakText(recognizedText);
      }
      setRecognizedText("");
    }
  };

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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusText = () => {
    if (modelError) return "Error";
    if (isModelLoading) return "Loading AI model...";
    if (!isCameraReady) return "starting camera...";
    if (isPaused) return "paused";
    if (isSpeaking) return "Agent speaking...";
    if (isConnecting) return "Connecting to agent...";
    if (bothHandsOpenPalm) return "Both hands detected - hold to send";
    if (handDetected) return `${handsCount} hand${handsCount > 1 ? "s" : ""} detected`;
    return "recognition active";
  };

  const getStatusDotClass = () => {
    if (modelError) return "status-dot--error";
    if (isModelLoading || !isCameraReady || isConnecting) return "status-dot--loading";
    if (isPaused) return "status-dot--idle";
    if (isSpeaking) return "status-dot--speaking";
    if (bothHandsOpenPalm) return "status-dot--speaking";
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

          {/* Sending to Agent Overlay */}
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

          {/* Hold Progress - Two Open Hands (SEND gesture) */}
          {!isPaused &&
            bothHandsOpenPalm &&
            recognizedText.trim() &&
            !doneTriggered && (
              <div className="hold-progress-container">
                <span style={{ fontSize: "20px" }}>🙌</span>
                <span className="hold-progress-letter" style={{ fontSize: "14px" }}>SEND</span>
                <div className="hold-progress-bar">
                  <div
                    className="hold-progress-fill"
                    style={{ width: `${bothHandsProgress}%` }}
                  />
                </div>
              </div>
            )}

          {/* Hold Progress - Regular letters */}
          {!isPaused &&
            currentLetter &&
            currentLetter.letter &&
            !bothHandsOpenPalm &&
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
            <li>🙌 Hold both hands open for 1.2s to send</li>
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

        {/* Send Button */}
        <div className="button-group" style={{ marginTop: "var(--gap-sm)" }}>
          <button
            onClick={handleSendMessage}
            disabled={!recognizedText.trim() || isSpeaking}
            className={`btn ${recognizedText.trim() ? "btn-primary" : "btn-secondary"}`}
            style={{ flex: 1 }}
          >
            {isSpeaking 
              ? "Speaking..." 
              : conversationMode === 'speakForMe' 
                ? "🔊 Speak My Words" 
                : "💬 Ask AI"}
          </button>
        </div>
      </div>

      {/* RIGHT PANEL: CONVERSATION */}
      <div className="panel panel--conversation">
        <div className="panel-header">
          <h2>Voice Output</h2>
          <div className="status-badge">
            {isSpeaking && (
              <>
                <span className="status-dot status-dot--speaking"></span>
                <span>Speaking</span>
              </>
            )}
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="mode-toggle">
          <button
            className={`mode-toggle-btn ${conversationMode === 'speakForMe' ? 'mode-toggle-btn--active' : ''}`}
            onClick={() => setConversationMode('speakForMe')}
          >
            <span className="mode-icon">🗣️</span>
            <span className="mode-label">Speak for Me</span>
            <span className="mode-desc">Speaks your signed words aloud</span>
          </button>
          <button
            className={`mode-toggle-btn ${conversationMode === 'conversation' ? 'mode-toggle-btn--active' : ''}`}
            onClick={() => setConversationMode('conversation')}
          >
            <span className="mode-icon">💬</span>
            <span className="mode-label">AI Responds</span>
            <span className="mode-desc">AI assistant responds to you</span>
          </button>
        </div>

        {/* Speaking Indicator */}
        {isSpeaking && (
          <div className="speaking-indicator">
            <div className="speaking-waves">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span>{conversationMode === 'speakForMe' ? 'Speaking your message...' : 'AI is responding...'}</span>
          </div>
        )}

        {/* Chat Messages */}
        <div className="chat-container">
          {messages.length === 0 ? (
            <div className="chat-empty">
              <p>👋 Start signing to begin</p>
              <p className="chat-empty-hint">
                {conversationMode === 'speakForMe' 
                  ? 'Your signed messages will be spoken aloud for others to hear'
                  : 'Your messages will appear here along with AI responses'}
              </p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div 
                  key={message.id} 
                  className={`chat-message ${message.type === 'user' ? 'chat-message--user' : 'chat-message--agent'}`}
                >
                  <div className="chat-message-bubble">
                    {message.text}
                  </div>
                  <div className="chat-message-meta">
                    <span>{message.type === 'user' ? 'You' : 'AI Agent'}</span>
                    <span>{formatTime(message.timestamp)}</span>
                  </div>
                </div>
              ))}
              
              {/* Live transcript while agent is speaking */}
              {isSpeaking && agentTranscript && (
                <div className="chat-message chat-message--agent chat-message--live">
                  <div className="chat-message-bubble">
                    {agentTranscript}
                    <span className="typing-cursor">|</span>
                  </div>
                </div>
              )}
              
              <div ref={chatEndRef} />
            </>
          )}
        </div>

        {/* Connection Controls - Only show in conversation mode */}
        <div className="button-group" style={{ marginTop: "auto", paddingTop: "var(--gap-sm)" }}>
          {conversationMode === 'conversation' ? (
            !isConnected ? (
              <button
                onClick={startConversation}
                disabled={isConnecting}
                className="btn btn-primary btn-small"
                style={{ flex: 1 }}
              >
                {isConnecting ? "Connecting..." : "🎙️ Connect to AI"}
              </button>
            ) : (
              <>
                <button
                  onClick={endConversation}
                  className="btn btn-secondary btn-small"
                >
                  Disconnect
                </button>
                <button
                  onClick={clearMessages}
                  className="btn btn-danger btn-small"
                >
                  Clear
                </button>
              </>
            )
          ) : (
            <button
              onClick={clearMessages}
              disabled={messages.length === 0}
              className="btn btn-secondary btn-small"
              style={{ flex: 1 }}
            >
              Clear History
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
