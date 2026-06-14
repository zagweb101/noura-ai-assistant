import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const zai = await ZAI.create();

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

    const allMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    const completion = await zai.chat.completions.create({
      messages: allMessages,
      temperature: 0.8,
      max_tokens: 200,
    });

    const reply = completion.choices?.[0]?.message?.content || 'عذراً، صار خطأ بسيط. جرب مرة ثانية يا الغالي';

    return NextResponse.json({ reply });
  } catch (error: unknown) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { reply: 'معليش، صار خلل بسيط بال نظام. جرب بعد شوي وإن شاء الله يضبط معك' },
      { status: 500 }
    );
  }
}
