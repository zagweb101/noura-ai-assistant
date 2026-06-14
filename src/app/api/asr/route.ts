import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(req: NextRequest) {
  try {
    const { audio_base64 } = await req.json();

    if (!audio_base64) {
      return NextResponse.json({ error: 'الصوت مطلوب' }, { status: 400 });
    }

    if (typeof audio_base64 !== 'string' || audio_base64.length > 10_000_000) {
      return NextResponse.json({ error: 'حجم الصوت كبير جداً' }, { status: 400 });
    }

    const zai = await ZAI.create();

    const response = await zai.audio.asr.create({
      file_base64: audio_base64,
    });

    const transcription = response.text || '';

    if (!transcription.trim()) {
      return NextResponse.json({
        success: true,
        text: '',
        message: 'ما سمعت شي، جرب تتكلم مرة ثانية',
      });
    }

    return NextResponse.json({
      success: true,
      text: transcription,
    });
  } catch (error: unknown) {
    console.error('ASR API Error:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في التعرف على الصوت', text: '' },
      { status: 500 }
    );
  }
}
