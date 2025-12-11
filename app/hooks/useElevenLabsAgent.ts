"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { useConversation } from '@elevenlabs/react';

interface ConversationMessage {
  id: string;
  type: 'user' | 'agent';
  text: string;
  timestamp: Date;
}

interface UseElevenLabsAgentReturn {
  isConnecting: boolean;
  isConnected: boolean;
  isSpeaking: boolean;
  error: string | null;
  messages: ConversationMessage[];
  agentTranscript: string;
  sendMessage: (text: string) => Promise<void>;
  startConversation: () => Promise<void>;
  endConversation: () => Promise<void>;
  clearMessages: () => void;
}

export function useElevenLabsAgent(): UseElevenLabsAgentReturn {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [agentTranscript, setAgentTranscript] = useState('');
  
  const pendingMessageRef = useRef<string | null>(null);
  const lastAgentMessageRef = useRef<string>('');

  // Get signed URL from our API
  const getSignedUrl = useCallback(async (): Promise<string> => {
    const response = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'getSignedUrl' }),
    });

    if (!response.ok) {
      throw new Error('Failed to get signed URL');
    }

    const data = await response.json();
    return data.signedUrl;
  }, []);

  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected to ElevenLabs agent');
      setIsConnecting(false);
      setError(null);
      
      // If there's a pending message, send it now
      if (pendingMessageRef.current) {
        const text = pendingMessageRef.current;
        pendingMessageRef.current = null;
        
        // Add user message to conversation
        const userMessage: ConversationMessage = {
          id: `user-${Date.now()}`,
          type: 'user',
          text: text,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMessage]);
        
        // Small delay to ensure connection is ready
        setTimeout(() => {
          conversation.sendUserMessage(text);
        }, 100);
      }
    },
    onDisconnect: () => {
      console.log('Disconnected from ElevenLabs agent');
    },
    onModeChange: (mode) => {
      console.log('Mode changed:', mode);
    },
    onMessage: (message) => {
      console.log('Agent message received:', JSON.stringify(message, null, 2));
      
      const msgAny = message as Record<string, unknown>;
      
      // Check for agent/AI response text
      let agentText = '';
      
      if (msgAny.message && typeof msgAny.message === 'string') {
        agentText = msgAny.message;
      } else if (msgAny.text && typeof msgAny.text === 'string') {
        agentText = msgAny.text;
      } else if (msgAny.content && typeof msgAny.content === 'string') {
        agentText = msgAny.content;
      }
      
      // Check if this is from the agent (not user)
      const isFromAgent = 
        msgAny.source === 'ai' || 
        msgAny.source === 'agent' ||
        msgAny.role === 'assistant' ||
        msgAny.type === 'agent_response' ||
        (agentText && !msgAny.source);
      
      if (agentText && isFromAgent) {
        setAgentTranscript(agentText);
        
        if (agentText !== lastAgentMessageRef.current) {
          lastAgentMessageRef.current = agentText;
          
          const agentMessage: ConversationMessage = {
            id: `agent-${Date.now()}`,
            type: 'agent',
            text: agentText,
            timestamp: new Date(),
          };
          
          setMessages(prev => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg?.type === 'agent' && lastMsg?.text === agentText) {
              return prev;
            }
            return [...prev, agentMessage];
          });
        }
      }
    },
    onError: (err) => {
      console.error('ElevenLabs error:', err);
      const errorMessage = typeof err === 'string' ? err : 
        (err as Error)?.message || 'Connection error';
      setError(errorMessage);
      setIsConnecting(false);
    },
  });

  const startConversation = useCallback(async () => {
    if (conversation.status === 'connected') return;
    
    setIsConnecting(true);
    setError(null);

    try {
      // Request microphone permission first - required by SDK for audio playback
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop the tracks immediately - we just needed permission
        stream.getTracks().forEach(track => track.stop());
      } catch (micError) {
        console.warn('Microphone access denied, audio may not work:', micError);
      }

      const signedUrl = await getSignedUrl();
      console.log('Starting session with signed URL');
      
      await conversation.startSession({
        signedUrl,
      });
      
      console.log('Session started successfully');
    } catch (err) {
      console.error('Failed to start conversation:', err);
      setError(err instanceof Error ? err.message : 'Failed to start conversation');
      setIsConnecting(false);
    }
  }, [conversation, getSignedUrl]);

  const endConversation = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch (err) {
      console.error('Error ending conversation:', err);
    }
  }, [conversation]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;
    
    setError(null);
    lastAgentMessageRef.current = '';

    // If not connected, connect first and queue the message
    if (conversation.status !== 'connected') {
      pendingMessageRef.current = text;
      await startConversation();
      return;
    }

    // Add user message to conversation
    const userMessage: ConversationMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      text: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Send to agent
    try {
      console.log('Sending message to agent:', text);
      conversation.sendUserMessage(text);
    } catch (err) {
      console.error('Failed to send message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
    }
  }, [conversation, startConversation]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setAgentTranscript('');
    lastAgentMessageRef.current = '';
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (conversation.status === 'connected') {
        conversation.endSession();
      }
    };
  }, [conversation]);

  return {
    isConnecting,
    isConnected: conversation.status === 'connected',
    isSpeaking: conversation.isSpeaking,
    error,
    messages,
    agentTranscript,
    sendMessage,
    startConversation,
    endConversation,
    clearMessages,
  };
}
