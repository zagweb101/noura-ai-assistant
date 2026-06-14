import { NextRequest, NextResponse } from 'next/server';

// Google Cloud TTS with Arabic voices
async function googleTTS(text: string, apiKey: string, voiceName: string, speed: number): Promise<{ buffer: Buffer; contentType: string }> {
  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode: 'ar-XA',
          name: voiceName,
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: speed,
          pitch: 0,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Google TTS error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const audioBuffer = Buffer.from(data.audioContent, 'base64');
  return { buffer: audioBuffer, contentType: 'audio/mpeg' };
}

// OpenAI TTS with multilingual voices (supports Arabic)
async function openAITTS(text: string, apiKey: string, voice: string, speed: number): Promise<{ buffer: Buffer; contentType: string }> {
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: text,
      voice: voice,
      speed: speed,
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI TTS error: ${response.status} - ${err}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(new Uint8Array(arrayBuffer));
  return { buffer, contentType: 'audio/mpeg' };
}

export async function POST(req: NextRequest) {
  try {
    const { text, speed = 1.0, api_key, provider, voice } = await req.json();

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'النص مطلوب' }, { status: 400 });
    }

    if (text.length > 5000) {
      return NextResponse.json({ error: 'النص طويل جداً' }, { status: 400 });
    }

    const apiKey = api_key || process.env.TTS_API_KEY;
    const ttsProvider = provider || process.env.TTS_PROVIDER || 'auto';

    if (apiKey) {
      try {
        let result: { buffer: Buffer; contentType: string };

        // Auto-detect provider based on API key format
        let detectedProvider = ttsProvider;
        if (detectedProvider === 'auto') {
          if (apiKey.startsWith('sk-')) {
            detectedProvider = 'openai';
          } else if (apiKey.startsWith('AIza')) {
            detectedProvider = 'google';
          } else {
            detectedProvider = 'openai'; // default
          }
        }

        if (detectedProvider === 'openai') {
          const ttsVoice = voice || process.env.TTS_VOICE || 'nova';
          result = await openAITTS(text.trim(), apiKey, ttsVoice, speed);
        } else {
          const voiceName = voice || process.env.TTS_VOICE || 'ar-XA-Standard-A';
          result = await googleTTS(text.trim(), apiKey, voiceName, speed);
        }

        return new NextResponse(result.buffer, {
          status: 200,
          headers: {
            'Content-Type': result.contentType,
            'Content-Length': result.buffer.length.toString(),
            'Cache-Control': 'no-cache',
          },
        });
      } catch (error) {
        console.error('TTS error:', error);
        return NextResponse.json(
          { error: 'فشل في توليد الصوت', details: error instanceof Error ? error.message : String(error) },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      error: 'TTS_API_KEY not configured',
      message: 'لا يوجد مفتاح API. استخدم المتصفح كخيار بديل.',
      useBrowserTTS: true,
    }, { status: 503 });

  } catch (error: unknown) {
    console.error('TTS API Error:', error);
    return NextResponse.json(
      { error: 'فشل في توليد الصوت' },
      { status: 500 }
    );
  }
}
