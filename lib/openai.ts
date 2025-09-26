import OpenAI from 'openai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

export interface ContentGenerationParams {
  prompt: string;
  tone?: string;
  platform?: string;
  maxTokens?: number;
  language?: string;
}

export interface CaptionGenerationParams {
  title: string;
  content: string;
  platform?: string;
  tone?: string;
  language?: string;
}

export async function generateContent({
  prompt,
  tone = 'profesyonel',
  platform = 'genel',
  maxTokens = 500,
  language = 'Türkçe'
}: ContentGenerationParams): Promise<string> {
  const systemPrompt = `Sen profesyonel bir sosyal medya içerik uzmanısın. Kullanıcıların isteklerine göre ${language} dilinde, ${tone} tonunda, ${platform} platformu için uygun içerikler oluşturuyorsun.

Platform özelliklerine göre içerik kuralları:
- Instagram: Görsel odaklı, hashtag kullanımı, emoji'ler, hikaye anlatımı
- Twitter: Kısa ve öz, trending konular, mention'lar, hashtag'ler
- Facebook: Detaylı açıklamalar, tartışma başlatıcı sorular, topluluk odaklı
- LinkedIn: Profesyonel ton, iş dünyası odaklı, uzmanlık paylaşımı
- Genel: Tüm platformlarda kullanılabilir esnek içerik

Ton özelliklerine göre yazım stili:
- Ciddi: Formal dil, açık ve net ifadeler
- Kurumsal: Marka kimliği odaklı, profesyonel yaklaşım
- Samimi: Dostça yaklaşım, kişisel dokunuşlar
- Eğlenceli: Mizahi öğeler, yaratıcı anlatım
- Bilgilendirici: Eğitici içerik, faydalı bilgiler
- Motive edici: İlham verici, harekete geçirici

Lütfen sadece içeriği ver, ek açıklama yapma.`;

  const userPrompt = `${prompt}`;

  try {
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
      presence_penalty: 0.6,
      frequency_penalty: 0.3,
    });

    const generatedContent = completion.choices[0]?.message?.content?.trim();
    
    if (!generatedContent) {
      throw new Error('OpenAI did not return content');
    }

    return generatedContent;
  } catch (error: any) {
    console.error('OpenAI API Error:', error);
    
    if (error.status === 401) {
      throw new Error('OpenAI API key is invalid');
    } else if (error.status === 429) {
      throw new Error('OpenAI API rate limit exceeded');
    } else if (error.status >= 500) {
      throw new Error('OpenAI service is temporarily unavailable');
    }
    
    throw new Error(`Content generation failed: ${error.message}`);
  }
}

export async function generateCaption({
  title,
  content,
  platform = 'genel',
  tone = 'profesyonel',
  language = 'Türkçe'
}: CaptionGenerationParams): Promise<string> {
  const systemPrompt = `Sen profesyonel bir sosyal medya caption uzmanısın. Verilen başlık ve içeriğe göre ${language} dilinde, ${tone} tonunda, ${platform} platformu için uygun caption (başlık/özet) oluşturuyorsun.

Platform özelliklerine göre caption kuralları:
- Instagram: Dikkat çekici, hashtag'li, emoji'li, maksimum 2200 karakter
- Twitter: Çok kısa ve öz, maksimum 280 karakter
- Facebook: Orta uzunlukta, tartışma başlatıcı
- LinkedIn: Profesyonel, uzmanlık odaklı, detaylı
- Genel: Orta uzunlukta, evrensel kullanım

Caption'lar:
- Ana içeriği özetlemeli
- Dikkat çekici olmalı
- Call-to-action içermeli
- Platform normlarına uymalı

Lütfen sadece caption'ı ver, ek açıklama yapma.`;

  const userPrompt = `Başlık: ${title}\n\nİçerik: ${content}\n\nBu içerik için uygun bir caption oluştur.`;

  try {
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: platform === 'twitter' ? 100 : 300,
      temperature: 0.7,
      presence_penalty: 0.4,
      frequency_penalty: 0.2,
    });

    const generatedCaption = completion.choices[0]?.message?.content?.trim();
    
    if (!generatedCaption) {
      throw new Error('OpenAI did not return caption');
    }

    return generatedCaption;
  } catch (error: any) {
    console.error('OpenAI Caption API Error:', error);
    
    if (error.status === 401) {
      throw new Error('OpenAI API key is invalid');
    } else if (error.status === 429) {
      throw new Error('OpenAI API rate limit exceeded');
    } else if (error.status >= 500) {
      throw new Error('OpenAI service is temporarily unavailable');
    }
    
    throw new Error(`Caption generation failed: ${error.message}`);
  }
}

export async function checkOpenAIHealth(): Promise<boolean> {
  try {
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: 'Test' }],
      max_tokens: 5,
    });

    return !!completion.choices[0]?.message?.content;
  } catch {
    return false;
  }
}