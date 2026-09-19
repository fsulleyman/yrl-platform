export interface NoticePoint {
  id: number;
  title: string;
  shortSummary: string;
  description: string;
  badge: string;
}

export const NOTICE_POINTS: NoticePoint[] = [
  {
    id: 1,
    title: 'Nominations and Registrations are 100% Free',
    shortSummary: 'Zero fees at any stage of nomination or membership.',
    description:
      'All nomination, registration, and civic participation processes within Youth Republic Leadership (YRL) are strictly free of charge. No officer, representative, committee member, or third-party agent is authorized to solicit, demand, or accept any fee or financial consideration from any applicant. If anyone demands payment to facilitate your nomination or membership, report it immediately.',
    badge: '100% Free',
  },
  {
    id: 2,
    title: 'Interim Setup Phase is Non-Permanent',
    shortSummary: 'Interim appointments are established solely for the setup term.',
    description:
      'Youth Republic Leadership is actively in its foundational interim setup phase. All positions currently open for nomination—both national ministerial portfolios and regional secretariats—are interim roles created to establish our operational frameworks, regional coordination units, and foundational membership register across Ghana.',
    badge: 'Foundational Setup',
  },
  {
    id: 3,
    title: 'No Guarantee of Permanent Appointment or Election',
    shortSummary: 'Interim tenure does not guarantee future permanent office.',
    description:
      'Appointment to an interim national or regional role does not guarantee permanent appointment, continuation in office, or election to the same or any other position within YRL. Permanent leadership structures and future governance transitions will be conducted in accordance with YRL’s established constitutional guidelines.',
    badge: 'No Permanent Guarantee',
  },
  {
    id: 4,
    title: 'Independent, Voluntary, Non-Partisan & Non-Profit',
    shortSummary: 'Strictly non-partisan civil society youth movement.',
    description:
      'Youth Republic Leadership is an independent, non-partisan, and voluntary youth civil society organisation. YRL operates without political party affiliation, political campaign alignment, or partisan agenda. Membership and leadership are open to young Ghanaians from all political backgrounds, but partisan activity is strictly prohibited within the organisation.',
    badge: 'Strictly Non-Partisan',
  },
  {
    id: 5,
    title: 'Not Government of Ghana Positions',
    shortSummary: 'YRL roles are civil society roles, not public sector jobs.',
    description:
      'Positions within Youth Republic Leadership—including National Ministers, Chief of Staff, Attorney-General, and Interim Regional Ministers—are civil society leadership roles within an independent non-governmental organisation. They are NOT positions within the Government of Ghana, the Civil Service of Ghana, or any statutory state agency.',
    badge: 'Civil Society Organisation',
  },
  {
    id: 6,
    title: 'Strict Prohibition on False Claims of State Authority',
    shortSummary: 'Illegal to claim governmental power or seek personal benefits.',
    description:
      'Applicants, members, and appointed interim officers must not use YRL’s name, logo, seal, or position to claim governmental authority, represent state agencies, solicit funds on behalf of public institutions, or obtain personal benefits. Any such unauthorized representation constitutes a severe violation of YRL regulations and will result in immediate disqualification and legal referral.',
    badge: 'Integrity Requirement',
  },
];
