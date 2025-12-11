import { gestureEstimator, SupportedLetter } from "./aslGestures";
import type { Keypoint } from "@tensorflow-models/hand-pose-detection";

export interface LetterClassificationResult {
  letter: SupportedLetter | null;
  confidence: number;
  allMatches: Array<{ name: string; score: number }>;
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

/**
 * Classify hand landmarks into an ASL letter
 * Returns the best matching letter and confidence score
 */
export function classifyLetter(
  keypoints: Keypoint[],
  videoWidth: number,
  videoHeight: number,
  minConfidence: number = 7.0 // Fingerpose returns scores 0-10
): LetterClassificationResult {
  if (keypoints.length !== 21) {
    return { letter: null, confidence: 0, allMatches: [] };
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
      
      return {
        letter: bestMatch.name as SupportedLetter,
        confidence: bestMatch.score / 10, // Normalize to 0-1
        allMatches: sortedGestures.map((g) => ({
          name: g.name,
          score: g.score / 10,
        })),
      };
    }
  } catch (error) {
    console.error("Error classifying gesture:", error);
  }

  return { letter: null, confidence: 0, allMatches: [] };
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

    // Count votes for each letter
    const votes: Map<string, { count: number; totalConfidence: number }> = new Map();
    
    for (const r of this.history) {
      if (r.letter) {
        const current = votes.get(r.letter) || { count: 0, totalConfidence: 0 };
        current.count++;
        current.totalConfidence += r.confidence;
        votes.set(r.letter, current);
      }
    }

    // Find letter with most votes
    let bestLetter: SupportedLetter | null = null;
    let bestCount = 0;
    let bestConfidence = 0;

    votes.forEach((value, letter) => {
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
      };
    }

    return { letter: null, confidence: 0, allMatches: [] };
  }

  reset(): void {
    this.history = [];
  }
}
