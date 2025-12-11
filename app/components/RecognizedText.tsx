"use client";

import { LetterClassificationResult } from "../lib/mlClassifier";
import { SUPPORTED_LETTERS } from "../lib/aslGestures";

interface RecognizedTextProps {
  text: string;
  currentLetter: LetterClassificationResult | null;
  onClear: () => void;
  onBackspace: () => void;
  onAddSpace: () => void;
  onDone: () => void;
  canSave: boolean;
  bothHandsOpen?: boolean;
}

// Letter hints for common letters
const LETTER_HINTS: Record<string, string> = {
  A: "Fist, thumb up beside",
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
  canSave,
  bothHandsOpen = false,
}: RecognizedTextProps) {
  const displayLetter = currentLetter?.letter || null;
  const displayConfidence = currentLetter?.confidence ?? 0;

  return (
    <div className="w-full max-w-[640px] space-y-4">
      {/* Current Detection */}
      <div className="bg-zinc-900 rounded-lg p-6 text-center">
        <p className="text-zinc-500 text-sm mb-2">
          {bothHandsOpen ? "Done Gesture Detected" : "Detected Letter"}
        </p>
        <div className="flex items-center justify-center gap-6">
          {bothHandsOpen ? (
            <div className="flex items-center gap-3">
              <span className="text-6xl">🙌</span>
              <div className="flex flex-col items-start">
                <span className="text-white text-xl font-medium">Both Hands Open</span>
                <span className="text-zinc-400 text-sm">
                  {canSave ? "Hold to save message" : "Spell something first"}
                </span>
              </div>
            </div>
          ) : (
            <>
              <span className="font-bold text-white text-7xl min-w-[80px]">
                {displayLetter || "—"}
              </span>
              {displayLetter && (
                <div className="flex flex-col items-start">
                  <span className="text-zinc-400 text-sm mb-1">Confidence</span>
                  <div className="flex items-center gap-2">
                    <div className="w-28 h-2.5 bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-200 ${
                          displayConfidence > 0.75
                            ? "bg-green-500"
                            : displayConfidence > 0.6
                            ? "bg-yellow-500"
                            : "bg-orange-500"
                        }`}
                        style={{ width: `${displayConfidence * 100}%` }}
                      />
                    </div>
                    <span className="text-zinc-400 text-sm font-mono">
                      {Math.round(displayConfidence * 100)}%
                    </span>
                  </div>
                  {LETTER_HINTS[displayLetter] && (
                    <span className="text-zinc-500 text-xs mt-2">
                      {LETTER_HINTS[displayLetter]}
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Accumulated Text */}
      <div className="bg-zinc-900 rounded-lg p-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-zinc-500 text-sm">Spelled Text</p>
          <div className="flex gap-2">
            <button
              onClick={onAddSpace}
              className="px-3 py-1.5 text-sm bg-blue-900/50 hover:bg-blue-900 text-blue-300 rounded-md transition-colors"
            >
              Space
            </button>
            <button
              onClick={onBackspace}
              className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md transition-colors"
            >
              ← Delete
            </button>
            <button
              onClick={onClear}
              className="px-3 py-1.5 text-sm bg-red-900/50 hover:bg-red-900 text-red-300 rounded-md transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
        <div className="min-h-[80px] bg-zinc-800 rounded-lg p-4 font-mono text-2xl text-white break-words tracking-wider">
          {text || (
            <span className="text-zinc-600 text-lg tracking-normal">
              Start fingerspelling to see text here...
            </span>
          )}
          <span className="animate-pulse text-blue-400">|</span>
        </div>
        
        {/* Done/Save Button */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-500 text-sm">
            <span>🙌</span>
            <span>Show both palms to save message</span>
          </div>
          <button
            onClick={onDone}
            disabled={!canSave}
            className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
              canSave
                ? "bg-green-600 hover:bg-green-500 text-white"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
            }`}
          >
            <span>✓</span>
            Done
          </button>
        </div>
      </div>

      {/* Letter Reference */}
      <div className="bg-zinc-800/50 rounded-lg p-4">
        <p className="font-medium text-zinc-400 text-sm mb-3">
          ASL Alphabet Reference (hold ~0.8s to add letter)
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SUPPORTED_LETTERS.map((letter) => (
            <div
              key={letter}
              className={`w-8 h-8 flex items-center justify-center rounded text-sm font-bold transition-colors ${
                displayLetter === letter
                  ? "bg-green-600 text-white"
                  : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
              }`}
              title={LETTER_HINTS[letter]}
            >
              {letter}
            </div>
          ))}
        </div>
        <p className="text-zinc-500 text-xs mt-3">
          💡 Tip: Use <span className="text-blue-400">Space</span> between words. 
          Show <span className="text-green-400">🙌 both hands open</span> (~1.5s) to save your message.
          Letters J and Z require motion (not yet supported).
        </p>
      </div>
    </div>
  );
}
