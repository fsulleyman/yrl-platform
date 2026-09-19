export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: 'About & Identity' | 'Eligibility & Non-Partisanship' | 'Interim Structure' | 'Getting Involved';
}

export const FAQ_CATEGORIES = [
  'All',
  'About & Identity',
  'Eligibility & Non-Partisanship',
  'Interim Structure',
  'Getting Involved',
] as const;

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-1',
    question: 'What does YRL stand for?',
    answer:
      'YRL stands for Youth Republic Leadership, an independent civic youth movement operating across the Republic of Ghana.',
    category: 'About & Identity',
  },
  {
    id: 'faq-2',
    question: 'What is Youth Republic Leadership (YRL)?',
    answer:
      'Youth Republic Leadership (YRL) is a voluntary, non-partisan, and non-profit youth leadership organisation in Ghana dedicated to cultivating practical leadership, civic governance, service, and active community participation among Ghanaian youth.',
    category: 'About & Identity',
  },
  {
    id: 'faq-3',
    question: 'What is the official motto and core principle of YRL?',
    answer:
      'Our official motto is "Leadership, Service and Development." Our core guiding principle is "Leadership is service, not privilege." We believe true leadership exists to serve the public good, not personal entitlement or governmental privilege.',
    category: 'About & Identity',
  },
  {
    id: 'faq-4',
    question: 'Who is eligible to participate in YRL?',
    answer:
      'All Ghanaian youth aged 18 to 40 years residing in or committed to serving any of Ghana’s 16 administrative regions are eligible to apply for interim leadership roles or join as registered civic members.',
    category: 'Eligibility & Non-Partisanship',
  },
  {
    id: 'faq-5',
    question: 'Is prior political experience required to apply for leadership?',
    answer:
      'No. Prior political experience is explicitly NOT required. YRL is an open civic platform designed to discover and equip capable, ethical young people regardless of previous political background. Selection is based strictly on character, competence, and service dedication.',
    category: 'Eligibility & Non-Partisanship',
  },
  {
    id: 'faq-6',
    question: 'Are nominations or membership registrations free?',
    answer:
      'Yes. Nominations and registrations are 100% free of charge at all stages. YRL does not charge any application, processing, or membership fees. No person or agent is authorized to collect money on behalf of YRL.',
    category: 'Eligibility & Non-Partisanship',
  },
  {
    id: 'faq-7',
    question: 'Is YRL a political party or affiliated with one?',
    answer:
      'No. YRL is strictly non-partisan and non-profit. We do not endorse political parties, run candidates in national elections, or align with any political faction. Our focus is ethical civic development and community leadership for the whole nation.',
    category: 'Eligibility & Non-Partisanship',
  },
  {
    id: 'faq-8',
    question: 'Is YRL an agency or department of the Government of Ghana?',
    answer:
      'No. YRL is an independent civil society youth initiative. Positions within YRL are civic leadership positions and are not positions within the Government of Ghana, its ministries, or the civil service.',
    category: 'Eligibility & Non-Partisanship',
  },
  {
    id: 'faq-9',
    question: 'What does an “interim” position mean in YRL?',
    answer:
      'An "interim" position is a temporary foundational leadership role established to help set up YRL’s national portfolios, regional secretariats, and membership register. Interim officers serve during this foundational phase to establish operations.',
    category: 'Interim Structure',
  },
  {
    id: 'faq-10',
    question: 'Does an interim appointment guarantee a permanent position?',
    answer:
      'No. Interim appointment does not guarantee permanent appointment, continuation in office, or election to the same or any other position. Future permanent governance will follow formal constitutional procedures.',
    category: 'Interim Structure',
  },
  {
    id: 'faq-11',
    question: 'What positions are open for nomination in YRL?',
    answer:
      'Nominations are open for 11 National Portfolios (including Chief of Staff, Attorney-General, and Ministers across education, finance, health, employment, and technology) as well as 16 Interim Regional Ministers across all regions of Ghana. Full details are available on our Structure page.',
    category: 'Interim Structure',
  },
  {
    id: 'faq-12',
    question: 'How can someone get involved with YRL?',
    answer:
      'You can participate in two primary ways: (1) Submit an Interim Leadership Nomination for a national or regional officer role, or (2) Register as a Civic Member to participate in grassroots community projects and regional youth networks. Both options are completely free.',
    category: 'Getting Involved',
  },
];
