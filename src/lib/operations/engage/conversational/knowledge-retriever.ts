export interface KnowledgeArticle {
  id: string;
  topic: string;
  keywords: string[];
  content: string;
  actionLink?: string;
}

export const INSTITUTIONAL_KB: KnowledgeArticle[] = [
  {
    id: 'kb_library_hours',
    topic: 'Library Timings & Study Spaces',
    keywords: ['library', 'library hours', 'study space', 'open time', 'library timing'],
    content: 'The Central Campus Library is open Monday–Friday 07:30 to 22:00, and Saturday 09:00 to 18:00. Quiet study rooms can be reserved via the portal.',
    actionLink: '/portal/library/booking',
  },
  {
    id: 'kb_fee_payment',
    topic: 'Tuition Payment Methods & Installments',
    keywords: ['fee', 'tuition', 'pay tuition', 'installment', 'bank transfer', 'payment gateway'],
    content: 'Tuition fees can be paid via credit/debit card, UPI/NetBanking, or direct NEFT transfer. 3-month split installment plans are available under the Finance tab.',
    actionLink: '/finance/payments',
  },
  {
    id: 'kb_exam_regulations',
    topic: 'Exam Hall Regulations & Admit Cards',
    keywords: ['exam', 'admit card', 'hall ticket', 'exam rules', 'calculator'],
    content: 'Hall tickets are released 7 days prior to finals. Students must bring their physical campus ID and arrive 15 minutes before exam commencement.',
    actionLink: '/academics/exams',
  },
  {
    id: 'kb_shuttle_transport',
    topic: 'Campus Shuttle Bus Schedule',
    keywords: ['bus', 'shuttle', 'transit', 'pickup', 'bus stop', 'shuttle timings', 'bus schedule', 'transport'],
    content: 'Campus shuttles run every 20 minutes from Metro Station Gate 3 to North & South Campuses between 07:00 and 20:30.',
    actionLink: '/campus/transport',
  },
];

export class KnowledgeRetriever {
  private static instance: KnowledgeRetriever;

  public static getInstance(): KnowledgeRetriever {
    if (!KnowledgeRetriever.instance) {
      KnowledgeRetriever.instance = new KnowledgeRetriever();
    }
    return KnowledgeRetriever.instance;
  }

  public search(query: string): KnowledgeArticle | null {
    const clean = query.toLowerCase();
    let bestMatch: KnowledgeArticle | null = null;
    let maxScore = 0;

    for (const article of INSTITUTIONAL_KB) {
      let score = 0;
      for (const kw of article.keywords) {
        if (clean.includes(kw.toLowerCase())) {
          // Weight longer exact phrase matches higher
          score += kw.length;
        }
      }
      if (score > maxScore) {
        maxScore = score;
        bestMatch = article;
      }
    }

    return bestMatch;
  }
}
