export interface NavItem {
  label: string;
  href: string;
  description?: string;
  isExternal?: boolean;
}

export interface SocialLink {
  platform: string;
  href: string;
  label: string;
  isPlaceholder: boolean;
}

export const SITE_IDENTITY = {
  name: 'Youth Republic Leadership',
  shortName: 'YRL',
  tagline: 'A Nation Built by Young Leaders',
  motto: 'Leadership, Service and Development.',
  corePrinciple: 'Leadership is service, not privilege.',
  country: 'Ghana',
  notice:
    'Nominations are 100% FREE. Interim positions within YRL are voluntary and are not positions in the Government of Ghana.',
  summary:
    'A civic, youth-led leadership organisation in Ghana recruiting interim national and regional officers and members aged 18–40 to establish our foundational governance structure.',
};

export const HEADER_NAV: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'About YRL', href: '/about' },
  { label: 'Structure', href: '/structure' },
  { label: 'News', href: '/news' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Contact', href: '/contact' },
];

export const GET_INVOLVED_NAV: NavItem[] = [
  {
    label: 'Nominate Yourself',
    href: '/get-involved/nominate',
    description: 'Apply for an interim leadership role',
  },
  {
    label: 'Join as Member',
    href: '/get-involved/join',
    description: 'Become a verified civic member',
  },
];

export const FOOTER_NAV = {
  main: [
    { label: 'Home', href: '/' },
    { label: 'About YRL', href: '/about' },
    { label: 'Organisational Structure', href: '/structure' },
    { label: 'News & Updates', href: '/news' },
    { label: 'Frequently Asked Questions', href: '/faq' },
    { label: 'Contact', href: '/contact' },
  ],
  civic: [
    { label: 'Submit Nomination', href: '/get-involved/nominate' },
    { label: 'Join as Member', href: '/get-involved/join' },
    { label: 'Official Notice Board', href: '/notice' },
  ],
  legal: [
    { label: 'Official Notices', href: '/notice' },
    { label: 'Privacy Policy (Act 843)', href: '/privacy-policy' },
  ],
};

// Social media URLs placeholder per Rule: Do not invent social media URLs.
export const SOCIAL_LINKS: SocialLink[] = [
  { platform: 'Twitter / X', href: '#', label: 'Follow YRL on X (Coming Soon)', isPlaceholder: true },
  { platform: 'LinkedIn', href: '#', label: 'Connect on LinkedIn (Coming Soon)', isPlaceholder: true },
  { platform: 'Facebook', href: '#', label: 'Follow YRL on Facebook (Coming Soon)', isPlaceholder: true },
  { platform: 'Instagram', href: '#', label: 'Follow YRL on Instagram (Coming Soon)', isPlaceholder: true },
];
