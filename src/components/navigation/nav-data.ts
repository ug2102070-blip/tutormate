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
  Megaphone,
  Calendar,
  UserCheck,
  Receipt,
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
      { href: "/tutor/notices", label: "Notice Board", key: "notices", icon: Megaphone },
      { href: "/tutor/chat", label: "Internal Chat", key: "chat", icon: MessageSquare },
      { href: "/tutor/notes", label: "Personal Notes", key: "notes", icon: StickyNote },
    ],
  },
  {
    category: "Classes & Students",
    key: "classesStudents",
    items: [
      { href: "/tutor/batches", label: "Batches", key: "batches", icon: Users },
      { href: "/tutor/calendar", label: "Class Routine", key: "schedule", icon: Calendar },
      { href: "/tutor/students", label: "Students", key: "students", icon: GraduationCap },
      { href: "/tutor/attendance", label: "Attendance", key: "attendance", icon: CalendarCheck },
      { href: "/tutor/recorded-classes", label: "Recorded Classes", key: "recordedClasses", icon: Video },
    ],
  },
  {
    category: "Learning & Assessment",
    key: "learningExams",
    items: [
      { href: "/tutor/doubts", label: "Student Doubts", key: "doubts", icon: HelpCircle },
      { href: "/tutor/materials", label: "Study Materials", key: "materials", icon: BookOpen },
      { href: "/tutor/assignments", label: "Assignments", key: "assignments", icon: FileText },
      { href: "/tutor/exams", label: "Exams & Results", key: "exams", icon: Award },
    ],
  },
  {
    category: "Finance & Center",
    key: "financeCenter",
    items: [
      { href: "/tutor/fees", label: "Fee Ledger", key: "fees", icon: CreditCard },
      { href: "/tutor/coaching", label: "Coaching Center", key: "coaching", icon: Building2 },
    ],
  },
  {
    category: "Account",
    key: "account",
    items: [
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
      { href: "/owner/notices", label: "Center Notice Board", key: "ownerNotices", icon: Megaphone },
    ],
  },
  {
    category: "Institution Management",
    key: "institutionManagement",
    items: [
      { href: "/owner/tutors", label: "Tutors", key: "ownerTutors", icon: Users },
      { href: "/owner/staff", label: "Staff & Roles", key: "ownerStaff", icon: UserCheck },
      { href: "/owner/students", label: "All Students", key: "ownerStudents", icon: GraduationCap },
      { href: "/owner/batches", label: "All Batches", key: "ownerBatches", icon: BookOpen },
    ],
  },
  {
    category: "Finance & Operations",
    key: "financeAnalytics",
    items: [
      { href: "/owner/fees", label: "Fee Reports", key: "ownerFees", icon: CreditCard },
      { href: "/owner/expenses", label: "Expenses & Payroll", key: "ownerExpenses", icon: Receipt },
      { href: "/owner/attendance", label: "Attendance Overview", key: "ownerAttendance", icon: CalendarCheck },
    ],
  },
  {
    category: "Settings & Profile",
    key: "settingsProfile",
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

