const fs = require("fs");
const path = require("path");

const handsJsPath = path.join(
  __dirname,
  "..",
  "node_modules",
  "@mediapipe",
  "hands",
  "hands.js"
);

// Check if file exists
if (!fs.existsSync(handsJsPath)) {
  console.log("@mediapipe/hands not found, skipping patch");
  process.exit(0);
}

const content = fs.readFileSync(handsJsPath, "utf-8");

// Check if already patched
if (content.includes("export class Hands")) {
  console.log("@mediapipe/hands already patched");
  process.exit(0);
}

// Add ES module export at the end
const patch = `
// ES Module export for bundler compatibility (TensorFlow.js runtime is used instead)
export class Hands {
  constructor(config) {
    throw new Error("MediaPipe Hands runtime not supported in this build. Use TensorFlow.js runtime instead.");
  }
}
`;

fs.appendFileSync(handsJsPath, patch);
console.log("Successfully patched @mediapipe/hands for ES module compatibility");
