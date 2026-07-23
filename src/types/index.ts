import { Timestamp } from "firebase/firestore";

// ============================================
// CUSTOM CLAIMS (from JWT token)
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
// FIRESTORE DOCUMENT TYPES
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
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SubscriptionInfo {
  plan: "free_trial" | "starter" | "pro" | "pro_plus";
  status: "active" | "past_due" | "canceled";
  validUntil: Timestamp;
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
  createdAt: Timestamp;
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
  createdAt: Timestamp;
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
  createdAt: Timestamp;
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
  timestamp: Timestamp;
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
  paidAt: Timestamp | null;
  updatedAt: Timestamp;
}

export type DoubtStatus = "pending" | "answered" | "resolved";

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
  status: DoubtStatus;
  lastMessageAt: Timestamp;
  unreadByTutor: boolean;
  unreadByStudent: boolean;
  createdAt: Timestamp;
}

export interface MessageDoc {
  id: string;
  senderUid: string;
  senderRole: "tutor" | "student";
  text: string;
  attachmentPath: string | null;
  attachmentType: "image" | null;
  createdAt: Timestamp;
}
