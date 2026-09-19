export interface NationalPosition {
  id: string;
  title: string;
  category: 'Executive' | 'Ministerial' | 'Legal';
  scope: string;
  iconName: 'Shield' | 'Scale' | 'Award' | 'BookOpen' | 'Briefcase' | 'Cpu' | 'Radio' | 'Heart' | 'Sprout' | 'Users' | 'Building';
}

export interface RegionInfo {
  name: string;
  code: string;
  role: string;
  description: string;
}

export const NATIONAL_POSITIONS: NationalPosition[] = [
  {
    id: 'chief-of-staff',
    title: 'Chief of Staff',
    category: 'Executive',
    scope:
      'Coordinates national interim executive operations, central secretariat administration, and strategic portfolio alignment.',
    iconName: 'Shield',
  },
  {
    id: 'attorney-general',
    title: 'Attorney-General and Minister for Justice',
    category: 'Legal',
    scope:
      'Oversees constitutional compliance, legal integrity, organisational ethics, and governance guidelines across all YRL activities.',
    iconName: 'Scale',
  },
  {
    id: 'finance',
    title: 'Minister for Finance',
    category: 'Ministerial',
    scope:
      'Manages resource stewardship, voluntary financial transparency, budget planning, and accountable reporting standards.',
    iconName: 'Award',
  },
  {
    id: 'education',
    title: 'Minister for Education',
    category: 'Ministerial',
    scope:
      'Coordinates youth civic education programs, leadership training modules, literacy initiatives, and academic partnerships.',
    iconName: 'BookOpen',
  },
  {
    id: 'employment',
    title: 'Minister for Youth Employment and Entrepreneurship',
    category: 'Ministerial',
    scope:
      'Drives youth skills acquisition, enterprise development frameworks, vocational innovation, and youth economic capacity.',
    iconName: 'Briefcase',
  },
  {
    id: 'research',
    title: 'Minister for Research, Science and Technology',
    category: 'Ministerial',
    scope:
      'Leads policy research, digital infrastructure initiatives, scientific advocacy, and technological enablement across YRL.',
    iconName: 'Cpu',
  },
  {
    id: 'communications',
    title: 'Minister for Communications',
    category: 'Ministerial',
    scope:
      'Manages civic information dissemination, public relations, press communications, and nationwide digital engagement.',
    iconName: 'Radio',
  },
  {
    id: 'health',
    title: 'Minister for Health',
    category: 'Ministerial',
    scope:
      'Advocates for youth mental and physical wellness, public health awareness, community medical outreach, and health policy.',
    iconName: 'Heart',
  },
  {
    id: 'agriculture',
    title: 'Minister for Agriculture',
    category: 'Ministerial',
    scope:
      'Promotes youth engagement in modern agribusiness, rural youth empowerment, food sustainability, and cooperative farming models.',
    iconName: 'Sprout',
  },
  {
    id: 'gender',
    title: 'Minister for Gender, Women and Social Protection',
    category: 'Ministerial',
    scope:
      'Champions gender equity, female youth leadership development, social inclusion, and welfare initiatives for vulnerable youth.',
    iconName: 'Users',
  },
  {
    id: 'local-government',
    title: 'Minister for Local Government and Community Development',
    category: 'Ministerial',
    scope:
      'Liaises directly with regional secretariats, grassroots district units, and community service initiatives nationwide.',
    iconName: 'Building',
  },
];

export const GHANA_REGIONS: RegionInfo[] = [
  {
    name: 'Ahafo',
    code: 'AH',
    role: 'Interim Regional Minister',
    description: 'Regional youth leadership and community coordination across the Ahafo Region.',
  },
  {
    name: 'Ashanti',
    code: 'AS',
    role: 'Interim Regional Minister',
    description: 'Regional youth leadership and community coordination across the Ashanti Region.',
  },
  {
    name: 'Bono',
    code: 'BO',
    role: 'Interim Regional Minister',
    description: 'Regional youth leadership and community coordination across the Bono Region.',
  },
  {
    name: 'Bono East',
    code: 'BE',
    role: 'Interim Regional Minister',
    description: 'Regional youth leadership and community coordination across the Bono East Region.',
  },
  {
    name: 'Central',
    code: 'CP',
    role: 'Interim Regional Minister',
    description: 'Regional youth leadership and community coordination across the Central Region.',
  },
  {
    name: 'Eastern',
    code: 'EP',
    role: 'Interim Regional Minister',
    description: 'Regional youth leadership and community coordination across the Eastern Region.',
  },
  {
    name: 'Greater Accra',
    code: 'GA',
    role: 'Interim Regional Minister',
    description: 'Regional youth leadership and community coordination across the Greater Accra Region.',
  },
  {
    name: 'North East',
    code: 'NE',
    role: 'Interim Regional Minister',
    description: 'Regional youth leadership and community coordination across the North East Region.',
  },
  {
    name: 'Northern',
    code: 'NP',
    role: 'Interim Regional Minister',
    description: 'Regional youth leadership and community coordination across the Northern Region.',
  },
  {
    name: 'Oti',
    code: 'OT',
    role: 'Interim Regional Minister',
    description: 'Regional youth leadership and community coordination across the Oti Region.',
  },
  {
    name: 'Savannah',
    code: 'SV',
    role: 'Interim Regional Minister',
    description: 'Regional youth leadership and community coordination across the Savannah Region.',
  },
  {
    name: 'Upper East',
    code: 'UE',
    role: 'Interim Regional Minister',
    description: 'Regional youth leadership and community coordination across the Upper East Region.',
  },
  {
    name: 'Upper West',
    code: 'UW',
    role: 'Interim Regional Minister',
    description: 'Regional youth leadership and community coordination across the Upper West Region.',
  },
  {
    name: 'Volta',
    code: 'VR',
    role: 'Interim Regional Minister',
    description: 'Regional youth leadership and community coordination across the Volta Region.',
  },
  {
    name: 'Western',
    code: 'WP',
    role: 'Interim Regional Minister',
    description: 'Regional youth leadership and community coordination across the Western Region.',
  },
  {
    name: 'Western North',
    code: 'WN',
    role: 'Interim Regional Minister',
    description: 'Regional youth leadership and community coordination across the Western North Region.',
  },
];
