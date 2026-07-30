import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarCheck,
  CreditCard,
  HelpCircle,
  Settings,
  BookOpen,
  FileText,
  Award,
  Sparkles,
  Video,
  Building2,
  Gem,
  MessageSquare,
  StickyNote,
  LucideIcon,
  QrCode,
  BarChart3,
  Bell,
  UserCircle,
  ShieldCheck,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  key?: string;
  icon: LucideIcon;
  badge?: string;
  badgeColor?: "primary" | "amber" | "emerald";
}

export interface NavCategory {
  category: string;
  key?: string;
  items: NavItem[];
}

export const tutorNavCategories: NavCategory[] = [
  {
    category: "Overview",
    key: "overview",
    items: [
      { href: "/tutor/dashboard", label: "Dashboard", key: "dashboard", icon: LayoutDashboard },
      { href: "/tutor/ai-assistant", label: "AI Assistant", key: "aiAssistant", icon: Sparkles, badge: "AI", badgeColor: "primary" },
      { href: "/tutor/chat", label: "Internal Chat", key: "chat", icon: MessageSquare },
      { href: "/tutor/notes", label: "Personal Notes", key: "notes", icon: StickyNote },
    ],
  },
  {
    category: "Academic",
    key: "academic",
    items: [
      { href: "/tutor/batches", label: "Batches", key: "batches", icon: Users },
      { href: "/tutor/students", label: "Students", key: "students", icon: GraduationCap },
      { href: "/tutor/attendance", label: "Attendance", key: "attendance", icon: CalendarCheck },
      { href: "/tutor/recorded-classes", label: "Recorded Classes", key: "recordedClasses", icon: Video },
      { href: "/tutor/doubts", label: "Student Doubts", key: "doubts", icon: HelpCircle },
      { href: "/tutor/materials", label: "Study Materials", key: "materials", icon: BookOpen },
      { href: "/tutor/assignments", label: "Assignments", key: "assignments", icon: FileText },
      { href: "/tutor/exams", label: "Exams", key: "exams", icon: Award },
    ],
  },
  {
    category: "Finance & Management",
    key: "finance",
    items: [
      { href: "/tutor/fees", label: "Fee Ledger", key: "fees", icon: CreditCard },
      { href: "/tutor/coaching", label: "Coaching Center", key: "coaching", icon: Building2 },
      { href: "/tutor/settings", label: "Settings", key: "settings", icon: Settings },
    ],
  },
];

export const studentNavCategories: NavCategory[] = [
  {
    category: "Overview",
    key: "overview",
    items: [
      { href: "/student/dashboard", label: "Dashboard", key: "dashboard", icon: LayoutDashboard },
      { href: "/student/chat", label: "Class Chat", key: "classChat", icon: MessageSquare },
      { href: "/student/notes", label: "Personal Notes", key: "notes", icon: StickyNote },
    ],
  },
  {
    category: "Academic",
    key: "academic",
    items: [
      { href: "/student/recorded-classes", label: "Recorded Classes", key: "recordedClasses", icon: Video },
      { href: "/student/doubts", label: "Ask Doubts", key: "askDoubts", icon: HelpCircle },
      { href: "/student/materials", label: "Study Materials", key: "materials", icon: BookOpen },
      { href: "/student/assignments", label: "Assignments", key: "assignments", icon: FileText },
      { href: "/student/exams", label: "Exams", key: "exams", icon: Award },
    ],
  },
  {
    category: "Account & Finance",
    key: "accountFinance",
    items: [
      { href: "/student/attendance", label: "My Attendance", key: "myAttendance", icon: CalendarCheck },
      { href: "/student/fees", label: "Payment History", key: "paymentHistory", icon: CreditCard },
    ],
  },
];

export const ownerNavCategories: NavCategory[] = [
  {
    category: "Center Overview",
    key: "centerOverview",
    items: [
      { href: "/owner/dashboard", label: "Dashboard", key: "ownerDashboard", icon: LayoutDashboard },
      { href: "/owner/invite", label: "Invite & QR Code", key: "ownerInvite", icon: QrCode },
    ],
  },
  {
    category: "Management",
    key: "ownerManagement",
    items: [
      { href: "/owner/tutors", label: "Tutors", key: "ownerTutors", icon: Users },
      { href: "/owner/students", label: "All Students", key: "ownerStudents", icon: GraduationCap },
      { href: "/owner/batches", label: "All Batches", key: "ownerBatches", icon: BookOpen },
    ],
  },
  {
    category: "Finance & Analytics",
    key: "ownerFinance",
    items: [
      { href: "/owner/fees", label: "Fee Reports", key: "ownerFees", icon: CreditCard },
      { href: "/owner/attendance", label: "Attendance Overview", key: "ownerAttendance", icon: CalendarCheck },
    ],
  },
  {
    category: "My Teaching (Tutor Mode)",
    key: "ownerTeaching",
    items: [
      { href: "/tutor/dashboard", label: "Tutor Dashboard", key: "ownerTutorDash", icon: BarChart3 },
      { href: "/tutor/batches", label: "My Batches", key: "ownerMyBatches", icon: Users },
      { href: "/tutor/students", label: "My Students", key: "ownerMyStudents", icon: GraduationCap },
      { href: "/tutor/fees", label: "My Fee Ledger", key: "ownerMyFees", icon: CreditCard },
    ],
  },
  {
    category: "Settings",
    key: "ownerSettings",
    items: [
      { href: "/owner/settings", label: "Center Settings", key: "ownerCenterSettings", icon: Building2 },
      { href: "/tutor/settings", label: "My Profile", key: "ownerMyProfile", icon: Settings },
    ],
  },
];

export const parentNavCategories: NavCategory[] = [
  {
    category: "Overview",
    key: "parentOverview",
    items: [
      { href: "/parent/dashboard", label: "Dashboard", key: "parentDashboard", icon: LayoutDashboard },
      { href: "/parent/notifications", label: "Notifications", key: "parentNotifications", icon: Bell },
    ],
  },
  {
    category: "Child Progress",
    key: "parentChildProgress",
    items: [
      { href: "/parent/attendance", label: "Attendance", key: "parentAttendance", icon: CalendarCheck },
      { href: "/parent/fees", label: "Fee Status", key: "parentFees", icon: CreditCard },
      { href: "/parent/assignments", label: "Assignments", key: "parentAssignments", icon: FileText },
      { href: "/parent/results", label: "Results", key: "parentResults", icon: Award },
    ],
  },
  {
    category: "Account",
    key: "parentAccount",
    items: [
      { href: "/parent/settings", label: "Settings", key: "parentSettings", icon: Settings },
    ],
  },
];

