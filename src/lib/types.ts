export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
}

export interface Organisation {
  id: string;
  name: string;
  description?: string | null;
  role?: string;
  created_at: string;
  updated_at?: string;
}

export interface CaseItem {
  id: string;
  organisation_id: string;
  title: string;
  description?: string | null;
  status: 'OPEN' | 'CLOSED' | 'ARCHIVED' | string;
  case_number?: string | null;
  court?: string | null;
  case_type?: string | null;
  instructions?: string | null;
  collection_id?: string | null;
  filing_date?: string | null;
  next_hearing_date?: string | null;
  stage?: string | null;
  judge?: string | null;
  client_name?: string | null;
  opposing_party?: string | null;
  created_at: string;
  updated_at: string;
  role?: string;
}

export interface TaskItem {
  id: string;
  case_id: string;
  title: string;
  description?: string | null;
  status: 'PENDING' | 'COMPLETED' | 'OVERDUE';
  due_date?: string | null;
  assigned_to?: string | null;
  created_at: string;
  updated_at: string;
}

export interface HearingItem {
  id: string;
  case_id: string;
  date: string;
  notes?: string | null;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DocumentItem {
  _id?: string;
  id?: string;
  title: string;
  description?: string;
  type?: 'PDF' | 'LINK' | 'TEXT' | string;
  url?: string;
  content?: string;
  createdAt?: string;
  created_at?: string;
}

export interface CalendarHearingItem extends HearingItem {
  case_title?: string;
  case_number?: string;
  court?: string;
  stage?: string;
  judge?: string;
  client_name?: string;
  opposing_party?: string;
}

export interface CalendarTaskItem extends TaskItem {
  case_title?: string;
  case_number?: string;
  court?: string;
  stage?: string;
}

export interface CalendarDocket {
  hearings: CalendarHearingItem[];
  tasks: CalendarTaskItem[];
  cases: CaseItem[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  dateStr: string;
  type: 'HEARING' | 'TASK' | 'MILESTONE';
  caseId: string;
  caseTitle?: string | null;
  caseNumber?: string | null;
  court?: string | null;
  stage?: string | null;
  judge?: string | null;
  clientName?: string | null;
  opposingParty?: string | null;
  notes?: string | null;
  status?: string | null;
  priority?: string | null;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  organisation_id: string;
  case_id?: string | null;
  title: string;
  message: string;
  type: 'HEARING_ALERT' | 'TASK_DUE' | 'CASE_UPDATE' | 'AI_INSIGHT' | 'SYSTEM' | string;
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW' | string;
  link?: string | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
  case_title?: string | null;
  case_number?: string | null;
  court?: string | null;
}

export interface NotificationsResponse {
  notifications: NotificationItem[];
  unreadCount: number;
}
