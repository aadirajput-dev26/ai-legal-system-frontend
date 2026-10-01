export interface DraftTypeOption {
  value: string;
  label: string;
}

export interface DraftCategory {
  category: string;
  icon: string;
  options: DraftTypeOption[];
}

export const LEGAL_DRAFT_LIBRARY: DraftCategory[] = [
  {
    category: 'Notices',
    icon: '⚖️',
    options: [
      { value: 'LEGAL_NOTICE_RECOVERY', label: 'Legal Notice for Recovery of Dues' },
      { value: 'NOTICE_138_NI', label: 'Notice under Sec 138 NI Act (Cheque Bounce)' },
      { value: 'EVICTION_NOTICE', label: 'Eviction Notice' },
      { value: 'NOTICE_SPECIFIC_PERFORMANCE', label: 'Notice for Specific Performance' },
      { value: 'DEFAMATION_NOTICE', label: 'Defamation Notice' },
    ],
  },
  {
    category: 'Civil Suits',
    icon: '🏛️',
    options: [
      { value: 'PLAINT', label: 'Plaint (Original Suit)' },
      { value: 'WRITTEN_STATEMENT', label: 'Written Statement' },
      { value: 'INTERLOCUTORY_APPLICATION', label: 'Interlocutory Application (IA)' },
      { value: 'AFFIDAVIT_IN_CHIEF', label: 'Affidavit of Evidence (Chief)' },
      { value: 'EXECUTION_PETITION', label: 'Execution Petition' },
      { value: 'INJUNCTION_APPLICATION', label: 'Application for Temporary Injunction (O39 R1&2)' },
    ],
  },
  {
    category: 'Criminal Matters',
    icon: '🚨',
    options: [
      { value: 'CRIMINAL_COMPLAINT', label: 'Criminal Complaint (Sec 200 CrPC / BNSS)' },
      { value: 'BAIL_APPLICATION_REGULAR', label: 'Regular Bail Application' },
      { value: 'BAIL_APPLICATION_ANTICIPATORY', label: 'Anticipatory Bail Application' },
      { value: 'QUASHING_PETITION', label: 'Quashing Petition (Sec 482 CrPC / BNSS)' },
      { value: 'REVISION_PETITION_CRIMINAL', label: 'Criminal Revision Petition' },
      { value: 'DISCHARGE_APPLICATION', label: 'Discharge Application' },
    ],
  },
  {
    category: 'Family Law',
    icon: '👨‍👩‍👧',
    options: [
      { value: 'DIVORCE_PETITION_MUTUAL', label: 'Mutual Consent Divorce Petition' },
      { value: 'DIVORCE_PETITION_CONTESTED', label: 'Contested Divorce Petition' },
      { value: 'MAINTENANCE_PETITION', label: 'Maintenance Petition (Sec 125 CrPC / BNSS)' },
      { value: 'CHILD_CUSTODY_PETITION', label: 'Child Custody Petition' },
      { value: 'RESTITUTION_CONJUGAL', label: 'Restitution of Conjugal Rights (Sec 9 HMA)' },
    ],
  },
  {
    category: 'Corporate & Agreements',
    icon: '💼',
    options: [
      { value: 'NON_DISCLOSURE_AGREEMENT', label: 'Non-Disclosure Agreement (NDA)' },
      { value: 'EMPLOYMENT_AGREEMENT', label: 'Employment Agreement' },
      { value: 'MEMORANDUM_OF_UNDERSTANDING', label: 'Memorandum of Understanding (MOU)' },
      { value: 'SHAREHOLDER_AGREEMENT', label: 'Shareholder Agreement' },
      { value: 'COMMERCIAL_LEASE', label: 'Commercial Lease Agreement' },
    ],
  },
  {
    category: 'Appeals & Revisions',
    icon: '📜',
    options: [
      { value: 'CIVIL_APPEAL', label: 'Civil Appeal' },
      { value: 'CRIMINAL_APPEAL', label: 'Criminal Appeal' },
      { value: 'SPECIAL_LEAVE_PETITION', label: 'Special Leave Petition (SLP)' },
      { value: 'WRIT_PETITION', label: 'Writ Petition (Art 226 / 32)' },
    ],
  },
  {
    category: 'General Correspondence',
    icon: '✉️',
    options: [
      { value: 'EMAIL', label: 'Professional Email' },
      { value: 'WHATSAPP', label: 'WhatsApp Message' },
      { value: 'CLIENT_UPDATE', label: 'Client Update Letter' },
      { value: 'OTHER', label: 'Other Custom Draft' },
    ],
  }
];
