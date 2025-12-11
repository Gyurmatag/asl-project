"use client";

import dynamic from "next/dynamic";

// Dynamically import the ASL recognizer to avoid SSR issues with TensorFlow.js
const ASLRecognizer = dynamic(() => import("./components/ASLRecognizer"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center gap-8">
      <div className="w-full max-w-[640px] flex items-center gap-4 p-3 bg-zinc-900 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse" />
          <span className="text-sm text-zinc-400">Loading application...</span>
        </div>
      </div>
      <div
        className="bg-zinc-900 rounded-lg flex items-center justify-center"
        style={{ width: 640, height: 480 }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-zinc-400 text-sm">
            Loading ASL recognition...
          </span>
        </div>
      </div>
    </div>
  ),
});

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 py-4">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-bold">ASL Fingerspelling Recognizer</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Spell words letter-by-letter using ASL alphabet signs (A-Y)
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center gap-8">
          <ASLRecognizer />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-4 mt-8">
        <div className="container mx-auto px-4 text-center text-zinc-500 text-sm">
          <p>
            ASL Fingerspelling • Powered by TensorFlow.js, MediaPipe &amp; Fingerpose ML •
            Letters A-Y supported
          </p>
        </div>
      </footer>
    </div>
  );
}
