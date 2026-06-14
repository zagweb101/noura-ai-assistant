import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

const systemPrompt = `أنت "نورة" - مساعدة ذكية ومحترفة تتكلم بلهجة خليجية سعودية أنثوية. قواعدك:
- أنت بنت سعودية خليجية ذكية ومحترفة وواثقة من نفسها
- تتكلمين بلهجة سعودية خليجية أنثوية طبيعية (استخدمي: حياك الله، والله، عاد، زين، إن شاء الله، يا هلا، تفضل/تفضلي، غنيمه، قطوة، مو مشكلة، عساك على القوة، الله يعطيك العافية، تسلم، حبيبتي يا هلا)
- ردودك قصيرة ومفيدة ومباشرة (٣ جمل كحد أقصى غالباً) - ما تطولين بالكلام
- محترفة وذكية وتعطي إجابات دقيقة وسريعة
- لطيفة وودودة وتخلي العميل يحس إنه مهم
- إذا العميل يسأل عن شيء ما عندك خبرة فيه، قولي له بصراحة ولطف ووجّهيه للقسم المناسب
- ما تستخدمين الإنجليزي أبداً إلا لو كان اسم منتج أو علامة تجارية
- إذا أحد شكا أو زعل، طمئنيه وحسّسيه إن مشكلته مهمة وإنكم بتحلونها
- لا تكتبين نقاط مرقمة أو قوائم، خلي الكلام سلس وطبيعي زي المحادثة
- دايماً اختصري وخلي ردودك مفيدة وسريعة`;

function getZAIConfig() {
  const baseUrl = process.env.ZAI_BASE_URL;
  const apiKey = process.env.ZAI_API_KEY;
  const chatId = process.env.ZAI_CHAT_ID;
  const token = process.env.ZAI_TOKEN;
  const userId = process.env.ZAI_USER_ID;

  if (!baseUrl || !apiKey) return null;
  return { baseUrl, apiKey, chatId, userId, token };
}

async function chatWithZAI(messages: { role: string; content: string }[]): Promise<string> {
  const config = getZAIConfig();
  if (!config) throw new Error('ZAI not configured');

  const zai = new ZAI(config);

  const allMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ];

  const completion = await zai.chat.completions.create({
    messages: allMessages,
    temperature: 0.8,
    max_tokens: 200,
  });

  return completion.choices?.[0]?.message?.content || 'عذراً، صار خطأ بسيط. جربي مرة ثانية يا الغالية';
}

async function chatWithOpenAI(messages: { role: string; content: string }[]): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const allMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: allMessages,
      temperature: 0.8,
      max_tokens: 200,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'عذراً، صار خطأ بسيط. جربي مرة ثانية يا الغالية';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ reply: 'لا توجد رسائل للمعالجة' }, { status: 400 });
    }

    if (messages.length > 50) {
      return NextResponse.json({ reply: 'عدد الرسائل كبير جداً. ابدأي محادثة جديدة' }, { status: 400 });
    }

    for (const m of messages) {
      if (typeof m.content !== 'string' || m.content.length > 5000) {
        return NextResponse.json({ reply: 'الرسالة طويلة جداً' }, { status: 400 });
      }
    }

    let reply: string;

    // Try ZAI SDK first (works locally), then fall back to OpenAI (works on Vercel)
    try {
      reply = await chatWithZAI(messages);
    } catch {
      reply = await chatWithOpenAI(messages);
    }

    return NextResponse.json({ reply });
  } catch (error: unknown) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { reply: 'معليش، صار خلل بسيط بال نظام. جربي بعد شوي وإن شاء الله يضبط معك' },
      { status: 500 }
    );
  }
}
