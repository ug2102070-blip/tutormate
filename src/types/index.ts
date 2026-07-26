// ============================================
// CUSTOM CLAIMS & USER ROLES
// ============================================
export type UserRole = "tutor" | "student" | "admin";

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

export type CustomClaims = TutorClaims | StudentClaims | AdminClaims;

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
  plan: "free_trial" | "starter" | "pro" | "pro_plus";
  status: "active" | "past_due" | "canceled";
  validUntil: string;
  maxStudents: number;
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
  subscription: SubscriptionInfo;
  stats: TutorStats;
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
  deadline: string;
  maxMarks: number;
  isPublished: boolean;
  createdAt: string;
}

export interface SubmissionDoc {
  id: string;
  assignmentId: string;
  studentId: string;
  filePath: string | null;
  submittedAt: string | null;
  marksObtained: number | null;
  feedback: string | null;
  status: "pending" | "submitted" | "graded" | "late";
  updatedAt: string;
}
