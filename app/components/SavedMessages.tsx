"use client";

import { SavedMessage } from "./ASLRecognizer";

interface SavedMessagesProps {
  messages: SavedMessage[];
  onDeleteMessage: (id: string) => void;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { 
    hour: "2-digit", 
    minute: "2-digit" 
  });
}

export default function SavedMessages({ 
  messages, 
  onDeleteMessage 
}: SavedMessagesProps) {
  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-[640px] bg-zinc-900 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">💬</span>
          <h3 className="text-zinc-300 font-medium">Saved Messages</h3>
          <span className="text-zinc-600 text-sm">({messages.length})</span>
        </div>
        <span className="text-zinc-600 text-xs">Stored in memory • Clears on refresh</span>
      </div>
      
      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
        {messages.map((message) => (
          <div 
            key={message.id}
            className="group bg-zinc-800 rounded-lg p-4 flex items-start justify-between gap-3 hover:bg-zinc-750 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-white font-mono text-lg break-words tracking-wide">
                {message.text}
              </p>
              <p className="text-zinc-500 text-xs mt-1">
                {formatTime(message.timestamp)}
              </p>
            </div>
            <button
              onClick={() => onDeleteMessage(message.id)}
              className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-700 rounded transition-all"
              title="Delete message"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      
      {messages.length > 0 && (
        <p className="text-zinc-600 text-xs mt-4 text-center">
          Messages are temporarily stored in browser memory
        </p>
      )}
    </div>
  );
}
