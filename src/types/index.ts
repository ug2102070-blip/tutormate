// ============================================
// CUSTOM CLAIMS & USER ROLES
// ============================================
export type UserRole = "tutor" | "student" | "admin" | "parent" | "owner";

export type Permission =
  | "read_own_data"
  | "write_own_batch"
  | "read_all_batches"
  | "manage_tutors"
  | "manage_billing"
  | "manage_center"
  | "view_analytics"
  | "manage_users"
  | "manage_roles";

export interface TutorClaims {
  role: "tutor";
  tutorId: string;
}

export interface StudentClaims {
  role: "student";
  tutorId: string;
  studentDocId: string;
}

export interface AdminClaims {
  role: "admin";
}

export interface OwnerClaims {
  role: "owner";
}

export interface ParentClaims {
  role: "parent";
  studentId: string;     // students.id of the linked child
  studentAuthUid: string; // auth_uid of the linked child
  tutorId: string;       // the tutor of the child
}

export type CustomClaims = TutorClaims | StudentClaims | AdminClaims | ParentClaims | OwnerClaims;

export interface UserPermissionDoc {
  id: string;
  userId: string;
  permission: Permission;
  grantedBy: string | null;
  createdAt: string;
}

// ============================================
// DATABASE DOCUMENT / ROW TYPES
// ============================================

export interface UserDoc {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber: string | null;
  photoURL: string | null;
  role: UserRole;
  tutorId: string | null;
  studentDocId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionInfo {
  plan: "free_trial" | "starter" | "pro";
  status: "active" | "past_due" | "canceled";
  validUntil: string;
  maxStudents: number;
  maxBatches: number;
  allowAiFeatures: boolean;
  priceBDT?: number;
}

export interface TutorStats {
  totalStudents: number;
  activeBatches: number;
  pendingDoubtsCount: number;
}

export interface TutorDoc {
  id: string;
  fullName: string;
  institution: string;
  contactPhone: string;
  bkashNumber: string | null;
  nagadNumber: string | null;
  bio?: string | null;
  address?: string | null;
  subscription: SubscriptionInfo;
  stats: TutorStats;
  coachingCenterId?: string | null;
  createdAt: string;
}

export interface ScheduleEntry {
  day: string;
  time: string;
}

export interface BatchDoc {
  id: string;
  tutorId: string;
  name: string;
  subject: string;
  gradeClass: string;
  monthlyFee: number;
  schedule: ScheduleEntry[];
  studentCount: number;
  isArchived: boolean;
  createdAt: string;
}

export interface StudentDoc {
  id: string;
  tutorId: string;
  authUid: string | null;
  inviteCode: string;
  fullName: string;
  phone: string;
  guardianPhone: string | null;
  institution: string | null;
  enrolledBatchIds: string[];
  status: "active" | "archived";
  createdAt: string;
  updatedAt?: string;
}

export interface AttendanceRecord {
  status: "present" | "absent" | "late";
  remarks: string | null;
}

export interface AttendanceDoc {
  id: string;
  tutorId: string;
  batchId: string;
  date: string; // YYYY-MM-DD
  timestamp: string;
  records: Record<string, AttendanceRecord>;
}

export interface FeeDoc {
  id: string;
  tutorId: string;
  studentId: string;
  batchId: string;
  year: number;
  month: number; // 1-12
  amountDue: number;
  amountPaid: number;
  status: "paid" | "unpaid" | "partial";
  paymentMethod: "cash" | "bkash" | "nagad" | "other" | null;
  paidAt: string | null;
  updatedAt: string;
}

export type DoubtStatus = "pending" | "answered" | "resolved";
export type AttachmentType = "image" | "file" | "audio" | null;

export interface DoubtDoc {
  id: string;
  tutorId: string;
  studentDocId: string;
  studentAuthUid: string;
  studentName: string;
  batchId: string;
  title: string;
  initialQuestion: string;
  attachmentPath: string | null;
  attachmentType?: AttachmentType;
  attachmentName?: string | null;
  attachmentSize?: number | null;
  status: DoubtStatus;
  lastMessageAt: string;
  unreadByTutor: boolean;
  unreadByStudent: boolean;
  createdAt: string;
}

export interface MessageDoc {
  id: string;
  senderUid: string;
  senderRole: "tutor" | "student";
  text: string;
  attachmentPath: string | null;
  attachmentType: AttachmentType;
  attachmentName?: string | null;
  attachmentSize?: number | null;
  createdAt: string;
}

export interface UserPresence {
  uid: string;
  isOnline: boolean;
  lastSeen: string;
}

export interface MaterialDoc {
  id: string;
  tutorId: string;
  batchId: string | null;
  title: string;
  description: string | null;
  filePath: string;
  fileType: "pdf" | "video" | "image" | "docx" | "ppt" | "other";
  fileSize: number | null;
  isPublished: boolean;
  createdAt: string;
}

export interface AssignmentDoc {
  id: string;
  tutorId: string;
  batchId: string;
  title: string;
  description: string | null;
  filePath?: string | null;
  deadline: string;
  maxMarks: number;
  isPublished: boolean;
  createdAt: string;
  batchName?: string;
  batchSubject?: string;
  totalStudents?: number;
  submittedCount?: number;
  gradedCount?: number;
  pendingCount?: number;
  averageScore?: number | null;
}

export interface SubmissionDoc {
  id: string;
  assignmentId: string;
  studentId: string;
  filePath: string | null;
  studentNotes?: string | null;
  submittedAt: string | null;
  marksObtained: number | null;
  feedback: string | null;
  status: "pending" | "submitted" | "graded" | "late";
  updatedAt: string;
  studentName?: string;
  studentPhone?: string;
  studentAvatar?: string | null;
  assignmentTitle?: string;
  assignmentDeadline?: string;
  assignmentMaxMarks?: number;
  assignmentDescription?: string | null;
  assignmentFilePath?: string | null;
  batchName?: string;
}


export interface ExamDoc {
  id: string;
  tutorId: string;
  batchId: string;
  title: string;
  subject: string | null;
  examDate: string; // YYYY-MM-DD
  totalMarks: number;
  passMarks: number | null;
  createdAt: string;
}

export interface ExamWithStatsDoc extends ExamDoc {
  batchName?: string;
  gradeClass?: string;
  markedCount: number;
  absentCount: number;
  totalStudents: number;
  averagePercentage: string | null;
  highestMarks: number | null;
  lowestMarks: number | null;
  passCount: number;
  failCount: number;
}

export interface ExamResultDoc {
  id: string;
  examId: string;
  studentId: string;
  marksObtained: number | null;
  grade: string | null;
  position: number | null;
  remarks: string | null;
  isAbsent: boolean;
  createdAt: string;
}

export interface EventDoc {
  id: string;
  tutorId: string;
  batchId: string | null;
  title: string;
  eventDate: string; // YYYY-MM-DD
  type: "holiday" | "announcement" | "other";
  createdAt: string;
}

export type CalendarEvent = {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  type: "class" | "exam" | "assignment" | "event";
  batchId?: string;
  batchName?: string;
  color: string; // mapped from type
  extraData?: Record<string, unknown>; // For any extra context like marks, etc.
};

// ============================================
// FEATURE 11: NOTIFICATIONS
// ============================================

export type NotificationType = 'assignment' | 'material' | 'exam' | 'fee' | 'doubt' | 'announcement';

export interface NotificationDoc {
  id: string;
  userId: string;                // profiles.id of the recipient
  title: string;
  body: string | null;
  type: NotificationType;
  referenceId: string | null;   // e.g. exam_id, assignment_id
  referenceType: string | null; // 'exam' | 'assignment' | etc.
  isRead: boolean;
  createdAt: string;
}

// ============================================
// FEATURE 12: PARENT PORTAL
// ============================================

export interface ParentLinkDoc {
  id: string;
  parentUid: string;   // profiles.id of the parent
  studentId: string;   // students.id of the child
  createdAt: string;
}

// ============================================
// FEATURE 17: QR ATTENDANCE
// ============================================

export interface QRTokenDoc {
  id: string;
  tutorId: string;
  batchId: string;
  date: string;
  token: string;
  shortCode: string;
  expiresAt: string;
  isUsed: boolean;
  createdAt: string;
}

// ============================================
// FEATURE 18: MULTI-TUTOR / COACHING CENTER
// ============================================

export interface CoachingCenterDoc {
  id: string;
  ownerUid: string;
  name: string;
  address: string | null;
  contactPhone: string | null;
  logoUrl: string | null;
  code: string;
  createdAt: string;
}

export interface CenterTutorDoc {
  tutorId: string;
  userId: string;
  fullName: string;
  institution: string;
  contactPhone: string;
  batchCount: number;
  studentCount: number;
  isOwner: boolean;
  joinedAt: string;
}

export interface CenterAnalyticsDoc {
  totalTutors: number;
  totalStudents: number;
  totalBatches: number;
  monthlyRevenue: number;
  attendanceRate: number;
}

// ============================================
// FEATURE 23: INTERNAL CHAT SYSTEM
// ============================================

export interface ConversationDoc {
  id: string;
  tutorId: string;
  participantUids: string[];
  type: "direct" | "announcement";
  batchId?: string | null;
  title?: string | null;
  createdAt: string;
  lastMessage?: string;
  lastMessageAt?: string;
}

export interface ChatMessageDoc {
  id: string;
  conversationId: string;
  senderUid: string;
  senderRole: "tutor" | "student" | "parent" | "admin" | "owner";
  text: string;
  attachmentPath?: string | null;
  createdAt: string;
  senderName?: string;
}

// ============================================
// FEATURE 28: RELATIONAL BATCH ENROLLMENT
// ============================================

export interface BatchEnrollmentDoc {
  studentId: string;
  batchId: string;
  enrolledAt: string;
}

// ============================================
// FEATURE 29: CENTER INVITE STATS
// ============================================

export interface CenterInviteStats {
  tutorCount: number;
  recentTutors: Array<{ id: string; name: string; joinedAt: string }>;
}

// ============================================
// FEATURE 30: SUBSCRIPTION PLAN HISTORY & OWNER ERP
// ============================================

export interface SubscriptionPlanHistoryDoc {
  id: string;
  tutorId: string;
  plan: "free_trial" | "starter" | "pro";
  status: "active" | "canceled" | "expired" | "trial" | "past_due";
  billingCycle: "monthly" | "yearly" | null;
  amountPaid: number;
  validFrom: string;
  validUntil: string | null;
  paymentMethod: string | null;
  paymentRef: string | null;
  createdAt: string;
}

export interface CoachingStaffDoc {
  id: string;
  centerId: string;
  name: string;
  email: string;
  phone: string;
  role: "Accountant" | "Receptionist" | "Manager" | "Other";
  status: "active" | "inactive";
  joinedDate: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CoachingExpenseDoc {
  id: string;
  centerId: string;
  title: string;
  category: "Rent" | "Utilities" | "Payroll" | "Marketing" | "Maintenance" | "Other";
  amount: number;
  date: string;
  paidTo?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt?: string;
}

