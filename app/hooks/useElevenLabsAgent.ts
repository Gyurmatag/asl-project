"use client";

import { useState, useCallback, useRef } from 'react';

interface UseElevenLabsAgentReturn {
  isConnecting: boolean;
  isConnected: boolean;
  isSpeaking: boolean;
  error: string | null;
  sendToAgent: (letters: string) => Promise<void>;
  disconnect: () => void;
}

export function useElevenLabsAgent(): UseElevenLabsAgentReturn {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);

  const playNextInQueue = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    
    isPlayingRef.current = true;
    setIsSpeaking(true);
    
    const buffer = audioQueueRef.current.shift();
    if (buffer && audioContextRef.current) {
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => {
        isPlayingRef.current = false;
        if (audioQueueRef.current.length > 0) {
          playNextInQueue();
        } else {
          setIsSpeaking(false);
        }
      };
      source.start();
    }
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsSpeaking(false);
  }, []);

  const sendToAgent = useCallback(async (letters: string) => {
    setError(null);
    setIsConnecting(true);

    try {
      // Get signed URL from our API
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letters }),
      });

      if (!response.ok) {
        throw new Error('Failed to get agent connection');
      }

      const { signedUrl } = await response.json();

      // Initialize audio context
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      }

      // Close existing connection
      if (wsRef.current) {
        wsRef.current.close();
      }

      // Connect to agent via WebSocket
      const ws = new WebSocket(signedUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnecting(false);
        setIsConnected(true);
        
        // First, send conversation config override for text mode with voice output
        const configOverride = {
          type: 'conversation_initiation_client_data',
          conversation_config_override: {
            agent: {
              prompt: {
                prompt: `You receive ASL fingerspelled letters from a deaf/mute user. Decode them into words and speak naturally. Just say the decoded message, don't explain. Example input: "HELLO" -> say "Hello!"`
              }
            }
          }
        };
        ws.send(JSON.stringify(configOverride));
        
        // Then send the user's text message
        setTimeout(() => {
          const message = {
            type: 'user_message',
            text: letters,
          };
          ws.send(JSON.stringify(message));
        }, 100);
      };

      ws.onmessage = async (event) => {
        try {
          // Handle binary audio data
          if (event.data instanceof Blob) {
            const arrayBuffer = await event.data.arrayBuffer();
            if (audioContextRef.current) {
              const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
              audioQueueRef.current.push(audioBuffer);
              playNextInQueue();
            }
            return;
          }

          // Handle JSON messages
          const data = JSON.parse(event.data);
          
          if (data.type === 'audio') {
            // Base64 encoded audio
            const audioData = atob(data.audio);
            const arrayBuffer = new ArrayBuffer(audioData.length);
            const view = new Uint8Array(arrayBuffer);
            for (let i = 0; i < audioData.length; i++) {
              view[i] = audioData.charCodeAt(i);
            }
            
            if (audioContextRef.current) {
              try {
                const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
                audioQueueRef.current.push(audioBuffer);
                playNextInQueue();
              } catch {
                // Audio decode failed, might be partial data
              }
            }
          } else if (data.type === 'agent_response') {
            console.log('Agent response:', data.text);
          } else if (data.type === 'error') {
            setError(data.message || 'Agent error');
          }
        } catch {
          // Non-JSON message, might be audio
        }
      };

      ws.onerror = () => {
        setError('WebSocket connection error');
        setIsConnecting(false);
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
      };

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsConnecting(false);
    }
  }, [playNextInQueue]);

  return {
    isConnecting,
    isConnected,
    isSpeaking,
    error,
    sendToAgent,
    disconnect,
  };
}

