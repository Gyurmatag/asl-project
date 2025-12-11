"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { useConversation } from '@elevenlabs/react';

interface ConversationMessage {
  id: string;
  type: 'user' | 'agent';
  text: string;
  timestamp: Date;
}

// Expand signed text into friendly, natural sentences
function expandSignedText(text: string): string {
  const upperText = text.toUpperCase().trim();
  
  // Greetings - expand to warm, friendly versions
  const greetings: Record<string, string> = {
    'HI': 'Hi there! How are you doing today?',
    'HELLO': 'Hello! How are you doing today?',
    'HEY': 'Hey! How\'s it going?',
    'GOOD MORNING': 'Good morning! I hope you\'re having a wonderful day so far!',
    'GOOD AFTERNOON': 'Good afternoon! How has your day been?',
    'GOOD EVENING': 'Good evening! I hope you had a great day!',
    'GOODMORNING': 'Good morning! I hope you\'re having a wonderful day so far!',
    'GOODAFTERNOON': 'Good afternoon! How has your day been?',
    'GOODEVENING': 'Good evening! I hope you had a great day!',
    'BYE': 'Goodbye! It was great talking with you. Take care!',
    'GOODBYE': 'Goodbye! It was wonderful chatting with you. Take care!',
    'SEE YOU': 'See you later! Have a great rest of your day!',
    'SEE U': 'See you later! Have a great rest of your day!',
    'LATER': 'See you later! Take care!',
  };

  // Common phrases - make them friendlier
  const phrases: Record<string, string> = {
    'THANK YOU': 'Thank you so much, I really appreciate it!',
    'THANK U': 'Thank you so much, I really appreciate it!',
    'THANKS': 'Thanks a lot! That\'s very kind of you.',
    'SORRY': 'I\'m so sorry about that.',
    'PLEASE': 'Please, if you don\'t mind.',
    'YES': 'Yes, absolutely!',
    'NO': 'No, but thank you for asking.',
    'OK': 'Okay, sounds good to me!',
    'OKAY': 'Okay, sounds good!',
    'NICE TO MEET YOU': 'It\'s so nice to meet you! I\'ve been looking forward to this.',
    'NICE 2 MEET U': 'It\'s so nice to meet you! I\'ve been looking forward to this.',
    'NICE TO MEET U': 'It\'s so nice to meet you!',
    'HOW ARE YOU': 'How are you doing today?',
    'HOW R U': 'How are you doing today?',
    'WHAT IS YOUR NAME': 'May I ask what your name is?',
    'WHAT YOUR NAME': 'May I ask what your name is?',
    'MY NAME IS': 'My name is',
    'I AM': 'I am',
    'IM': 'I\'m',
    'HELP': 'Would you be able to help me with something?',
    'NEED HELP': 'I could use some help, if you have a moment.',
    'EXCUSE ME': 'Excuse me, I have a quick question.',
    'UNDERSTAND': 'I understand, thank you for explaining that.',
    'DONT UNDERSTAND': 'I\'m sorry, I didn\'t quite catch that. Could you explain it again?',
    'DONT GET IT': 'I\'m sorry, I\'m not quite following. Could you help me understand?',
    'WAIT': 'Could you please wait just a moment?',
    'ONE MOMENT': 'Just one moment, please.',
    'GOOD JOB': 'Great job! That was really well done!',
    'WELL DONE': 'Well done! That\'s fantastic!',
    'CONGRATULATIONS': 'Congratulations! That\'s wonderful news!',
    'HAPPY BIRTHDAY': 'Happy birthday! I hope you have an amazing day!',
    'WELCOME': 'Welcome! It\'s great to have you here!',
    'YOU ARE WELCOME': 'You\'re very welcome!',
    'YOUR WELCOME': 'You\'re very welcome!',
    'NO PROBLEM': 'No problem at all! Happy to help.',
  };

  // Check for exact matches first
  if (greetings[upperText]) {
    return greetings[upperText];
  }
  if (phrases[upperText]) {
    return phrases[upperText];
  }

  // Check for partial matches (text contains these phrases)
  for (const [key, value] of Object.entries(greetings)) {
    if (upperText === key) {
      return value;
    }
  }
  
  for (const [key, value] of Object.entries(phrases)) {
    if (upperText === key) {
      return value;
    }
  }

  // Handle patterns like "MY NAME IS X" or "I AM X"
  if (upperText.startsWith('MY NAME IS ') || upperText.startsWith('MY NAME ')) {
    const name = text.replace(/^MY NAME (IS )?/i, '').trim();
    return `Hi there! My name is ${name}, it\'s great to meet you!`;
  }
  
  if (upperText.startsWith('IM ') || upperText.startsWith('I AM ')) {
    const rest = text.replace(/^I(M| AM) /i, '').trim();
    return `I\'m ${rest}.`;
  }

  if (upperText.startsWith('THANK') && upperText.includes('FOR')) {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() + ', I really appreciate it!';
  }

  if (upperText.startsWith('SORRY') && upperText.length > 5) {
    return 'I\'m so ' + text.toLowerCase() + '.';
  }

  // Questions - make them polite
  if (upperText.startsWith('WHERE')) {
    return 'Excuse me, could you please tell me ' + text.toLowerCase() + '?';
  }
  
  if (upperText.startsWith('WHAT TIME') || upperText.startsWith('WHATTIME')) {
    return 'Could you tell me what time it is, please?';
  }
  
  if (upperText.startsWith('HOW MUCH') || upperText.startsWith('HOWMUCH')) {
    return 'How much does this cost, if you don\'t mind me asking?';
  }

  // Default: Clean up the text and make it a proper sentence
  let result = text.trim();
  
  // Capitalize first letter
  result = result.charAt(0).toUpperCase() + result.slice(1).toLowerCase();
  
  // Add period if no punctuation at end
  if (!/[.!?]$/.test(result)) {
    result += '.';
  }
  
  return result;
}

interface UseElevenLabsAgentReturn {
  isConnecting: boolean;
  isConnected: boolean;
  isSpeaking: boolean;
  error: string | null;
  messages: ConversationMessage[];
  agentTranscript: string;
  sendMessage: (text: string) => Promise<void>;
  speakText: (text: string) => Promise<void>;
  startConversation: () => Promise<void>;
  endConversation: () => Promise<void>;
  clearMessages: () => void;
}

export function useElevenLabsAgent(): UseElevenLabsAgentReturn {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeakingTTS, setIsSpeakingTTS] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [agentTranscript, setAgentTranscript] = useState('');
  
  const pendingMessageRef = useRef<string | null>(null);
  const lastAgentMessageRef = useRef<string>('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
      
      const msgAny = message as unknown as Record<string, unknown>;
      
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

  // Direct TTS - "Speak for Me" mode (expands text and speaks it)
  const speakText = useCallback(async (text: string) => {
    if (!text.trim()) return;
    
    setError(null);
    setIsSpeakingTTS(true);

    // Expand the signed text into a friendly sentence
    const expandedText = expandSignedText(text);
    console.log('🔊 Original:', text);
    console.log('✨ Expanded:', expandedText);

    // Add user message to conversation (show what was signed)
    const userMessage: ConversationMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      text: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Add agent message showing what will be spoken
    const agentMessage: ConversationMessage = {
      id: `agent-${Date.now()}`,
      type: 'agent',
      text: expandedText,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, agentMessage]);

    try {
      // Send the EXPANDED text to TTS
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: expandedText }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      // Get audio blob and play it
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Stop any existing audio
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsSpeakingTTS(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setIsSpeakingTTS(false);
        setError('Failed to play audio');
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (err) {
      console.error('TTS error:', err);
      setError(err instanceof Error ? err.message : 'Speech failed');
      setIsSpeakingTTS(false);
    }
  }, []);

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
    isSpeaking: conversation.isSpeaking || isSpeakingTTS,
    error,
    messages,
    agentTranscript,
    sendMessage,
    speakText,
    startConversation,
    endConversation,
    clearMessages,
  };
}
