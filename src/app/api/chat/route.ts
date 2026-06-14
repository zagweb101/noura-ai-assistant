import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ reply: 'لا توجد رسائل للمعالجة' }, { status: 400 });
    }

    // Debug: Check env vars
    const config = {
      baseUrl: process.env.ZAI_BASE_URL,
      apiKey: process.env.ZAI_API_KEY,
      chatId: process.env.ZAI_CHAT_ID,
      userId: process.env.ZAI_USER_ID,
      token: process.env.ZAI_TOKEN,
    };

    console.log('Config available:', {
      hasBaseUrl: !!config.baseUrl,
      hasApiKey: !!config.apiKey,
      hasChatId: !!config.chatId,
      hasUserId: !!config.userId,
      hasToken: !!config.token,
    });

    if (!config.baseUrl || !config.apiKey) {
      return NextResponse.json({ 
        reply: 'النظام غير مُهيأ', 
        debug: { hasBaseUrl: !!config.baseUrl, hasApiKey: !!config.apiKey }
      }, { status: 500 });
    }

    const zai = new ZAI(config);

    const systemPrompt = `أنت "نورة" - مساعدة ذكية ومحترفة تتكلم بلهجة خليجية سعودية أنثوية. ردودك قصيرة ومفيدة.`;

    const allMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    console.log('Sending to ZAI API...');
    const completion = await zai.chat.completions.create({
      messages: allMessages,
      temperature: 0.8,
      max_tokens: 200,
    });
    console.log('ZAI API response:', JSON.stringify(completion).substring(0, 200));

    const reply = completion.choices?.[0]?.message?.content || 'عذراً، صار خطأ بسيط.';
    return NextResponse.json({ reply });
  } catch (error: unknown) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { reply: 'معليش، صار خلل بسيط. جربي بعد شوي', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
