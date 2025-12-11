import { gestureEstimator, SupportedLetter, SpecialGesture, SUPPORTED_LETTERS } from "./aslGestures";
import type { Keypoint } from "@tensorflow-models/hand-pose-detection";

export interface LetterClassificationResult {
  letter: SupportedLetter | null;
  confidence: number;
  allMatches: Array<{ name: string; score: number }>;
  specialGesture?: SpecialGesture | null;
}

// Fingerpose expects landmarks in a specific 3D array format
// Each landmark is [x, y, z] where coordinates are in pixels
type FingerposeKeypoint = [number, number, number];

/**
 * Convert MediaPipe/TensorFlow hand keypoints to fingerpose format
 * MediaPipe provides 21 landmarks with x, y (normalized 0-1) and optional z
 */
export function convertToFingerposeFormat(
  keypoints: Keypoint[],
  videoWidth: number,
  videoHeight: number
): FingerposeKeypoint[] {
  return keypoints.map((kp) => {
    // Convert normalized coordinates to pixel coordinates
    const x = kp.x * videoWidth;
    const y = kp.y * videoHeight;
    // Z is depth, use 0 if not available
    const z = (kp.z ?? 0) * videoWidth; // Scale z similarly to x
    return [x, y, z] as FingerposeKeypoint;
  });
}

// Check if a gesture name is a supported letter
function isLetter(name: string): name is SupportedLetter {
  return SUPPORTED_LETTERS.includes(name as SupportedLetter);
}

// Check if a gesture name is a special gesture
function isSpecialGesture(name: string): name is SpecialGesture {
  return name === "OPEN_PALM";
}

/**
 * Classify hand landmarks into an ASL letter or special gesture
 * Returns the best matching letter/gesture and confidence score
 */
export function classifyLetter(
  keypoints: Keypoint[],
  videoWidth: number,
  videoHeight: number,
  minConfidence: number = 7.0 // Fingerpose returns scores 0-10
): LetterClassificationResult {
  if (keypoints.length !== 21) {
    return { letter: null, confidence: 0, allMatches: [], specialGesture: null };
  }

  try {
    // Convert keypoints to fingerpose format
    const landmarks = convertToFingerposeFormat(keypoints, videoWidth, videoHeight);
    
    // Estimate gesture
    const result = gestureEstimator.estimate(landmarks, minConfidence);
    
    if (result.gestures && result.gestures.length > 0) {
      // Sort by score descending
      const sortedGestures = [...result.gestures].sort((a, b) => b.score - a.score);
      const bestMatch = sortedGestures[0];
      
      // Check if best match is a special gesture
      if (isSpecialGesture(bestMatch.name)) {
        return {
          letter: null,
          confidence: bestMatch.score / 10,
          allMatches: sortedGestures.map((g) => ({
            name: g.name,
            score: g.score / 10,
          })),
          specialGesture: bestMatch.name as SpecialGesture,
        };
      }
      
      // Otherwise it's a letter
      if (isLetter(bestMatch.name)) {
        return {
          letter: bestMatch.name,
          confidence: bestMatch.score / 10,
          allMatches: sortedGestures.map((g) => ({
            name: g.name,
            score: g.score / 10,
          })),
          specialGesture: null,
        };
      }
    }
  } catch (error) {
    console.error("Error classifying gesture:", error);
  }

  return { letter: null, confidence: 0, allMatches: [], specialGesture: null };
}

/**
 * Smooth classification results over time to reduce jitter
 * Uses a simple voting mechanism over recent frames
 */
export class ClassificationSmoother {
  private history: Array<LetterClassificationResult> = [];
  private historySize: number;

  constructor(historySize: number = 5) {
    this.historySize = historySize;
  }

  addResult(result: LetterClassificationResult): LetterClassificationResult {
    this.history.push(result);
    if (this.history.length > this.historySize) {
      this.history.shift();
    }

    // Count votes for each letter and special gestures
    const letterVotes: Map<string, { count: number; totalConfidence: number }> = new Map();
    const specialVotes: Map<string, { count: number; totalConfidence: number }> = new Map();
    
    for (const r of this.history) {
      if (r.letter) {
        const current = letterVotes.get(r.letter) || { count: 0, totalConfidence: 0 };
        current.count++;
        current.totalConfidence += r.confidence;
        letterVotes.set(r.letter, current);
      }
      if (r.specialGesture) {
        const current = specialVotes.get(r.specialGesture) || { count: 0, totalConfidence: 0 };
        current.count++;
        current.totalConfidence += r.confidence;
        specialVotes.set(r.specialGesture, current);
      }
    }

    // Check for special gesture first (takes priority)
    let bestSpecial: SpecialGesture | null = null;
    let bestSpecialCount = 0;
    let bestSpecialConfidence = 0;

    specialVotes.forEach((value, gesture) => {
      if (value.count > bestSpecialCount || 
          (value.count === bestSpecialCount && value.totalConfidence > bestSpecialConfidence)) {
        bestSpecial = gesture as SpecialGesture;
        bestSpecialCount = value.count;
        bestSpecialConfidence = value.totalConfidence;
      }
    });

    // If special gesture has majority, return it
    if (bestSpecialCount >= Math.ceil(this.historySize / 2)) {
      return {
        letter: null,
        confidence: bestSpecialConfidence / bestSpecialCount,
        allMatches: result.allMatches,
        specialGesture: bestSpecial,
      };
    }

    // Find letter with most votes
    let bestLetter: SupportedLetter | null = null;
    let bestCount = 0;
    let bestConfidence = 0;

    letterVotes.forEach((value, letter) => {
      if (value.count > bestCount || 
          (value.count === bestCount && value.totalConfidence > bestConfidence)) {
        bestLetter = letter as SupportedLetter;
        bestCount = value.count;
        bestConfidence = value.totalConfidence;
      }
    });

    // Require majority vote
    if (bestCount >= Math.ceil(this.historySize / 2)) {
      return {
        letter: bestLetter,
        confidence: bestConfidence / bestCount,
        allMatches: result.allMatches,
        specialGesture: null,
      };
    }

    return { letter: null, confidence: 0, allMatches: [], specialGesture: null };
  }

  reset(): void {
    this.history = [];
  }
}
