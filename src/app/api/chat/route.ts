import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const zai = await ZAI.create();

    const systemPrompt = `أنت مساعد ذكي لخدمة العملاء تتكلم بلهجة خليجية سعودية أصيلة. قواعدك:
- تتكلم بلهجة سعودية خليجية طبيعية ومحببة (استخدم: يالحبيب، والله، عاد، زين، إن شاء الله، يا هلا، تفضل، غنيمه، قطوة، مو مشكلة، عساك على القوة، الله يعطيك العافية، تسلم/تسلمين، حياك الله)
- ردودك قصيرة ومفيدة ومباشرة (٣ جمل كحد أقصى غالباً)
- لطيف وودود وتحسّن العميل إنه قريب
- إذا العميل يسأل عن شيء ما عندك خبرة فيه، قل له بصراحة ولطف ووجّهه للقسم المناسب
- استخدم التشبيهات الخليجية البسيطة لما تحتاج توضّح شيء
- ما تستخدم الإنجليزي أبداً إلا لو كان اسم منتج أو علامة تجارية
- إذا أحد شكا أو زعل، طمئنه وحسّسه إن مشكلته مهمة وإنكم بتحلونها
- لا تكتب طويل وخلي ردودك سريعة ومفيدة
- لا تكتب نقاط مرقمة أو قوائم، خلي الكلام سلس وطبيعي زي المحادثة`;

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
      { reply: 'معليش يا الغالي، صار خلل بسيط بال نظام. جرب بعد شوي وإن شاء الله يضبط معك' },
      { status: 500 }
    );
  }
}
