// AI Tax Advisor - Turkish Tax/SGK Knowledge Base
// Keyword-matched Q&A engine (offline, no external API required)

export interface TaxAdvice {
  keywords: string[];
  question: string;
  answer: string;
  category: 'sgk' | 'vergi' | 'mesai' | 'izin' | 'tazminat' | 'genel';
}

export const TAX_KB: TaxAdvice[] = [
  {
    keywords: ['sgk', 'sosyal güvenlik', 'sigorta', 'prim'],
    category: 'sgk',
    question: 'SGK primi nedir? Ne kadar ödenir?',
    answer: '📊 **SGK Primleri (2025)**\n\nSGK primleri, brüt maaşınız üzerinden hesaplanır:\n\n• İşçi payı: %14 (SGK) + %1 (İşsizlik) = **%15**\n• İşveren payı: %20.5 (SGK) + %2 (İşsizlik) = **%22.5**\n\n**Örnek:** Brüt maaşınız ₺30.000 ise:\n• İşçi SGK kesintisi: ₺4.500\n• İşveren maliyeti: +₺6.750\n\n✅ Prim tabanı: ₺26.005,50 (asgari ücret)\n⚠️ Prim tavanı: ₺195.041,40 (asgari ücret × 7.5)',
  },
  {
    keywords: ['gelir vergisi', 'stopaj', 'vergi dilimi', 'dilim'],
    category: 'vergi',
    question: 'Gelir vergisi dilimleri nelerdir?',
    answer: '💰 **2025 Gelir Vergisi Dilimleri (Ücret)**\n\n• ₺0 - ₺158.000 → **%15**\n• ₺158.001 - ₺330.000 → **%20**\n• ₺330.001 - ₺1.200.000 → **%27**\n• ₺1.200.001 - ₺4.300.000 → **%35**\n• ₺4.300.001 üzeri → **%40**\n\n💡 Dilimler kumülatif matraha göre işler; yıl boyunca kazancınız arttıkça üst dilime geçersiniz. Bu yüzden yıl sonuna doğru net maaşınız düşebilir.',
  },
  {
    keywords: ['damga', 'damga vergisi'],
    category: 'vergi',
    question: 'Damga vergisi nedir?',
    answer: '📋 **Damga Vergisi**\n\nÜcret ödemelerinde damga vergisi oranı **binde 7,59** (%0.759).\n\n**Örnek:** Brüt maaş ₺30.000 → damga vergisi ₺227,70\n\n✅ Asgari ücret tutarı damga vergisinden **muaftır**.',
  },
  {
    keywords: ['asgari', 'asgari ücret', 'minimum'],
    category: 'genel',
    question: '2025 asgari ücret ne kadar?',
    answer: '💵 **2025 Asgari Ücret**\n\n• Brüt: **₺26.005,50**\n• Net: **₺22.104,67**\n• İşverene maliyeti: **₺30.621,48**\n\n🎁 Asgari ücret tutarına kadar gelir vergisi **istisnası** uygulanır. Bu yüzden asgari ücret üzeri kazançlarda vergi hesabı asgari ücretten sonrasına uygulanır.',
  },
  {
    keywords: ['fazla mesai', 'mesai', 'overtime', 'fazla çalışma'],
    category: 'mesai',
    question: 'Fazla mesai nasıl hesaplanır?',
    answer: '⏰ **Fazla Mesai Hesabı (4857 SK Md. 41)**\n\nHaftalık 45 saati aşan çalışma fazla mesaidir.\n\n**Zammı %50 fazlasıyla ödenir:**\n• Normal saat ücreti × **1.5** = fazla mesai ücreti\n\n**Yıllık sınır:** 270 saat\n**Başka seçenek:** Serbest zaman (her 1 saat mesai = 1.5 saat izin)\n\n🔥 **Tatil günleri:**\n• Ulusal bayram/genel tatil: **%100** zam (×2)\n• Hafta tatili: **%50** zam (×1.5)\n\n💡 Mesai+ uygulaması bu çarpanları otomatik uygular!',
  },
  {
    keywords: ['yıllık izin', 'izin', 'tatil', 'yıllık'],
    category: 'izin',
    question: 'Yıllık izin ne kadar?',
    answer: '🏖️ **Yıllık Ücretli İzin Süresi (4857 SK Md. 53)**\n\n• 1-5 yıl kıdemli: **14 gün**\n• 5-15 yıl kıdemli: **20 gün**\n• 15+ yıl kıdemli: **26 gün**\n\n🎓 18 yaşın altı ve 50 yaşın üstü: en az **20 gün**\n\n⚠️ Kullanılmayan yıllık izin kaybolmaz; iş akdi son bulursa ücrete dönüşereği ödenir (izin ücreti tazminatı).',
  },
  {
    keywords: ['kıdem', 'kıdem tazminatı', 'severance'],
    category: 'tazminat',
    question: 'Kıdem tazminatı nasıl hesaplanır?',
    answer: '💼 **Kıdem Tazminatı (1475 SK Md. 14)**\n\n**Formula:** Her tam yıl için **30 günlük brüt ücret**\n\n**Koşullar:**\n• En az **1 yıl** çalışmış olma\n• Haklı nedenle işveren feshi hariç tamamen çıkarılıyorsanız\n• Emeklilik, askerlik, evlilik (kadın çalışanlar), ölüm\n\n**2025 Kıdem Tavanı:** ₺46.655,43 / yıl\n\n**Örnek:** 10 yıl çalışan, aylara göre yaklaşık ₺40.000 brüt → 10 × 40.000 = **₺400.000**\n\n✨ Mesai+ uygulamasının **Kıdem Tazminatı** hesaplayıcısını kullanabilirsin.',
  },
  {
    keywords: ['ihbar', 'ihbar süresi', 'ihbar tazminatı'],
    category: 'tazminat',
    question: 'İhbar süresi ve tazminatı',
    answer: '📢 **İhbar Süresi (4857 SK Md. 17)**\n\nHer iki taraf da önceden bildirim yapmak zorundadır:\n\n• 0-6 ay: **2 hafta**\n• 6-18 ay: **4 hafta**\n• 18 ay-3 yıl: **6 hafta**\n• 3+ yıl: **8 hafta**\n\n✅ İhbar süresi kullanılmazsa **ihbar tazminatı** ödenir (bu süredeki brüt ücret).\n\n⚠️ Deneme süresinde (2 ay) ihbar zorunluluğu yoktur.',
  },
  {
    keywords: ['işsizlik', 'işsizlik maaşı', 'işsizlik ödeneği'],
    category: 'tazminat',
    question: 'İşsizlik maaşı alır mıyım?',
    answer: '📉 **İşsizlik Ödeneği (İşKUR)**\n\n**Koşullar:**\n• Son 120 gün sürekli prim ödemiş olma\n• Son 3 yılda toplam **600 gün** prim\n• Kendi isteği/kusuru olmadan işsiz kalma\n• 30 gün içinde İşKUR’a başvurma\n\n**Süre:**\n• 600-899 gün prim: **180 gün** ödenek\n• 900-1079 gün: **240 gün**\n• 1080+ gün: **300 gün**\n\n**Miktar:** Son 4 ay ortalama brüt kazancının **%40**\u2019ı (asgari ücret brütünün %80’inden fazla olamaz)\n\n✨ Mesai+ uygulamasının **İşsizlik Maaşı** hesaplayıcısını kullanabilirsin.',
  },
  {
    keywords: ['bordro', 'maaş bordrosu', 'bordro nedir'],
    category: 'genel',
    question: 'Bordroda hangi kalemler yer alır?',
    answer: '📄 **Maaş Bordrosu Kalemleri**\n\n**Kesintiler (işçi):**\n• SGK primi %14\n• İşsizlik sigortası %1\n• Gelir vergisi (dilime göre)\n• Damga vergisi binde 7,59\n\n**Ekler:**\n• Fazla mesai\n• Prim / bonus\n• Yol / yemek yardımı\n• Gece zımmı\n\n**Hesap:**\nBrüt = Net + Kesintiler\nİşveren maliyeti = Brüt + İşveren SGK’ları',
  },
  {
    keywords: ['gece', 'gece çalışma', 'gece zımmı', 'gece vardiya'],
    category: 'mesai',
    question: 'Gece çalışması nedir?',
    answer: '🌙 **Gece Çalışması (4857 SK Md. 69-73)**\n\n• Gece: **20:00 – 06:00** arası\n• Maksimum günlük çalışma: **7.5 saat**\n• Fazla çalışma yasağı (bazı istisnalar hariç)\n\n💤 Sağlık kontrolü: 2 yılda bir zorunlu\n\n⚠️ Yasal olarak "gece zımmı" (zorunlu ek ücret) yoktur, ancak toplu sözleşmelerde belirlenebilir.',
  },
  {
    keywords: ['doğum izni', 'analık', 'analik', 'annelik'],
    category: 'izin',
    question: 'Doğum izni ne kadar?',
    answer: '👶 **Doğum İzni (4857 SK Md. 74)**\n\n• Doğum öncesi: **8 hafta**\n• Doğum sonrası: **8 hafta**\n• Toplam: **16 hafta**\n• Çoğul gebelik: 8 hafta öncesi + **2 hafta ek** = 18 hafta\n\n**Ücret:**\nSGK → **geçici iş göremezlik ödeneği** (ücretin yaklaşık 2/3’ü)\n\n**Ekstra haklar:**\n• 3 saat süt izni (ilk 1 yıl)\n• 6 ay yarı zamanlı çalışma hakkı\n• Ücretsiz izin: 6 ay',
  },
  {
    keywords: ['hafta tatili', 'pazar', 'hafta sonu'],
    category: 'mesai',
    question: 'Hafta tatilinde çalışırsam ne olur?',
    answer: '📅 **Hafta Tatili Çalışması (4857 SK Md. 46-47)**\n\n• Haftada en az **1 gün** (24 saat) tatil\n• Genellikle **Pazar** günü\n\n**Tatilde çalışırsan:**\n• O gün için **1 yevmiye ücret** + **%50 zamlı ek** = **1.5 yevmiye**\n• Eğer o gün aynı zamanda fazla mesai ise çarpanlar birleşir\n\n💡 Mesai+ uygulaması Cumartesi ve Pazar için ayrı çarpanlar uygular (varsayılan: Cmt ×1.5, Paz ×2).',
  },
  {
    keywords: ['bes', 'bireysel emeklilik'],
    category: 'genel',
    question: 'BES katkı payı zorunlu mu?',
    answer: '🏦 **Otomatik Katılım BES**\n\n• Çalışanlar otomatik olarak dahil edilir\n• Katılım payı: **brüt ücretin %3’ü**\n• Devlet katkısı: **%25**\n\n✅ **Çıkabilirsin:** İlk 2 ay içinde iptal, tam iade\n⚠️ 3 yıl dolmadan çıkarsan devlet katkısını alamazsın',
  },
  {
    keywords: ['istifa', 'ayrılma', 'ayrilma'],
    category: 'tazminat',
    question: 'İstifa edersem kıdem alır mıyım?',
    answer: '🚪 **İstifa ve Kıdem Tazminatı**\n\n❌ **Genel kural:** İstifa ederseniz kıdem alamazsınız.\n\n✅ **İstisnalar (kıdem alabilirsin):**\n• **Emeklilik** için ayrılma (yaş/prim yılı tamamlandıysa)\n• **Askerlik** için ayrılma\n• **Evlilik** (kadın çalışan, evlilikten sonra 1 yıl içinde)\n• **Sağlık** nedeni (hekim raporuyla)\n• **Haklı fesih** (ücret ödenmemesi, mobbing, vb.)\n\n⚠️ 15 yıl + 3600 gün prim şartı ile emeklilik için işten ayrılma da kıdem hakkı verir (SGK yazısı gerekir).',
  },
  {
    keywords: ['agi', 'asgari geçim'],
    category: 'vergi',
    question: 'AGİ nedir? Hala uygulanıyor mu?',
    answer: '❌ **AGİ Kaldırıldı**\n\nAsgari Geçim İndirimi (AGİ) **2022’de kaldırıldı**.\n\n**Yerine gelen:** Asgari ücret tutarına kadar **gelir vergisi ve damga vergisi istisnası** getirildi.\n\n✅ Bu sayede tüm çalışanlar asgari ücret tutarı kadarında vergi ödemiyor — üzerinde kazandıkları miktar için vergi hesaplanıyor.',
  },
  {
    keywords: ['maaş hesap', 'net brüt', 'brutten net'],
    category: 'genel',
    question: 'Brüt maaştan neti nasıl hesaplarım?',
    answer: '🧮 **Brüt → Net Hesap Adımları**\n\n1. **Brüt maaş** alın (ör: ₺40.000)\n2. **SGK işçi payı** çıkar: %14 → ₺5.600\n3. **İşsizlik primi** çıkar: %1 → ₺400\n4. **Gelir vergisi matrahı:** Brüt - SGK - İşsizlik = ₺34.000\n5. **Gelir vergisi hesabı:** dilimlere göre (asgari ücret kısmı istisna)\n6. **Damga vergisi:** Brüt × %0.759 (asgari kısmı muaf)\n7. **Net = Brüt - Tüm Kesintiler**\n\n✨ Mesai+ **Maaş Hesaplayıcı** ile bunu otomatik yapabilirsin.',
  },
  {
    keywords: ['deneme', 'deneme süresi'],
    category: 'genel',
    question: 'Deneme süresi kuralları?',
    answer: '🔍 **Deneme Süresi (4857 SK Md. 15)**\n\n• Maksimum **2 ay**\n• Toplu iş sözleşmesiyle **4 aya** kadar uzatılabilir\n• Her iki taraf da **ihbarsız** feshedebilir\n• Çalışılan günler için ücret ödenir\n• Kıdem tazminatı hakkı doğmaz\n\n✅ SGK bildirimleri deneme süresinde de yapılmalıdır.',
  },
];

export interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: number;
  suggestions?: string[];
}

function normalize(s: string): string {
  return s.toLowerCase()
    .replace(/i̇/g, 'i')
    .replace(/[ç]/g, 'c')
    .replace(/[ğ]/g, 'g')
    .replace(/[ı]/g, 'i')
    .replace(/[ö]/g, 'o')
    .replace(/[ş]/g, 's')
    .replace(/[ü]/g, 'u');
}

export function findAnswer(query: string): TaxAdvice | null {
  const nq = normalize(query);
  let bestMatch: TaxAdvice | null = null;
  let bestScore = 0;

  for (const item of TAX_KB) {
    let score = 0;
    for (const kw of item.keywords) {
      const nk = normalize(kw);
      if (nq.includes(nk)) {
        score += nk.length; // longer matches score higher
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = item;
    }
  }

  return bestScore > 2 ? bestMatch : null;
}

export function getSuggestedQuestions(count: number = 4): string[] {
  const shuffled = [...TAX_KB].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(x => x.question);
}

export function generateResponse(query: string): { content: string; suggestions: string[] } {
  const trimmed = query.trim();
  if (!trimmed) return { content: 'Lütfen bir soru yazın.', suggestions: getSuggestedQuestions(3) };

  const match = findAnswer(trimmed);
  if (match) {
    // Suggest related from same or different category
    const related = TAX_KB
      .filter(x => x.question !== match.question)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(x => x.question);
    return { content: match.answer, suggestions: related };
  }

  // No match
  return {
    content:
      '🤔 Bu konu hakkında spesifik bilgim yok. Şu konularda yardımcı olabilirim:\n\n• SGK primleri ve prim tabanı/tavanı\n• Gelir vergisi dilimleri\n• Fazla mesai hesabı\n• Kıdem ve ihbar tazminatı\n• Yıllık izin, doğum izni\n• İşsizlik ödeneği\n• Brüt/net maaş hesabı\n\nAşağıdaki sorulardan birine dokun veya farklı şekilde sor:',
    suggestions: getSuggestedQuestions(4),
  };
}
