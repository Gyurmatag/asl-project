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

const AGENT_ID = 'agent_8601kc79vxyffrcr183zhx2h36sh';

export function useElevenLabsAgent(): UseElevenLabsAgentReturn {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [agentTranscript, setAgentTranscript] = useState('');
  
  const pendingMessageRef = useRef<string | null>(null);

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
        
        // Send to agent via text mode
        conversation.sendUserInput(text);
      }
    },
    onDisconnect: () => {
      console.log('Disconnected from ElevenLabs agent');
    },
    onMessage: (message) => {
      console.log('Agent message:', message);
      
      // Handle agent responses
      if (message.source === 'ai') {
        setAgentTranscript(message.message);
        
        // Add complete agent message to conversation when it ends
        if (message.message && message.message.trim()) {
          const agentMessage: ConversationMessage = {
            id: `agent-${Date.now()}`,
            type: 'agent',
            text: message.message,
            timestamp: new Date(),
          };
          setMessages(prev => {
            // Avoid duplicate messages
            const lastMsg = prev[prev.length - 1];
            if (lastMsg?.type === 'agent' && lastMsg?.text === message.message) {
              return prev;
            }
            return [...prev, agentMessage];
          });
        }
      }
    },
    onError: (error) => {
      console.error('ElevenLabs error:', error);
      setError(typeof error === 'string' ? error : 'Connection error');
      setIsConnecting(false);
    },
  });

  const startConversation = useCallback(async () => {
    if (conversation.status === 'connected') return;
    
    setIsConnecting(true);
    setError(null);

    try {
      const signedUrl = await getSignedUrl();
      await conversation.startSession({
        signedUrl,
        clientTools: {},
      });
    } catch (err) {
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
      conversation.sendUserInput(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    }
  }, [conversation, startConversation]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setAgentTranscript('');
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
