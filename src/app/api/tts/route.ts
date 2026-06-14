import { NextRequest, NextResponse } from 'next/server';

// Google Cloud TTS with Arabic voices
async function googleTTS(text: string, apiKey: string, voiceName: string, speed: number): Promise<Buffer> {
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
  return audioBuffer;
}

export async function POST(req: NextRequest) {
  try {
    const { text, speed = 1.0, api_key } = await req.json();

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'النص مطلوب' }, { status: 400 });
    }

    if (text.length > 5000) {
      return NextResponse.json({ error: 'النص طويل جداً' }, { status: 400 });
    }

    // Try API key from request body first, then from env variable
    const apiKey = api_key || process.env.GOOGLE_TTS_API_KEY;

    if (apiKey) {
      try {
        const voiceName = process.env.GOOGLE_TTS_VOICE || 'ar-XA-Standard-A';
        const audioBuffer = await googleTTS(text.trim(), apiKey, voiceName, speed);

        return new NextResponse(audioBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioBuffer.length.toString(),
            'Cache-Control': 'no-cache',
          },
        });
      } catch (error) {
        console.error('Google TTS error:', error);
        return NextResponse.json(
          { error: 'فشل في توليد الصوت من Google TTS', details: error instanceof Error ? error.message : String(error) },
          { status: 500 }
        );
      }
    }

    // No API key configured
    return NextResponse.json({
      error: 'GOOGLE_TTS_API_KEY not configured',
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
