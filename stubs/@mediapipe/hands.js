// Stub module for @mediapipe/hands
// We use the tfjs runtime which doesn't need this package at runtime
// This stub satisfies the static import in hand-pose-detection

export class Hands {
  constructor() {
    throw new Error(
      "MediaPipe Hands runtime is not supported in this build. " +
      "Please use the TensorFlow.js runtime instead."
    );
  }
}

export default { Hands };
