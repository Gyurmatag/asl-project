import { NextRequest, NextResponse } from 'next/server';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const AGENT_ID = 'agent_8601kc79vxyffrcr183zhx2h36sh';

export async function POST(request: NextRequest) {
  try {
    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      );
    }

    // Get a signed URL for the agent conversation
    const signedUrlResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${AGENT_ID}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
      }
    );

    if (!signedUrlResponse.ok) {
      const error = await signedUrlResponse.text();
      console.error('Failed to get signed URL:', error);
      return NextResponse.json(
        { error: 'Failed to initialize agent conversation' },
        { status: signedUrlResponse.status }
      );
    }

    const { signed_url } = await signedUrlResponse.json();

    return NextResponse.json({
      signedUrl: signed_url,
      agentId: AGENT_ID,
    });
  } catch (error) {
    console.error('Agent error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
