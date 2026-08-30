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
  CalendarDays,
  UserCheck,
  Receipt,
  FolderArchive,
  Clock,
  CircleDollarSign,
  Layers,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  key?: string;
  icon: LucideIcon;
  badge?: string;
  badgeColor?: "primary" | "amber" | "emerald";
  /** If true, always visible in sidebar. If false, hidden under "More" section. */
  isPrimary?: boolean;
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
      { href: "/tutor/dashboard",  label: "Dashboard",     key: "dashboard", icon: LayoutDashboard, isPrimary: true },
      { href: "/tutor/notices",    label: "Notice Board",  key: "notices",   icon: Megaphone,        isPrimary: false },
      { href: "/tutor/chat",       label: "Internal Chat", key: "chat",      icon: MessageSquare,    isPrimary: false },
    ],
  },
  {
    category: "Batches & Students",
    key: "batchesStudents",
    items: [
      { href: "/tutor/batches",    label: "My Batches",          key: "batches",    icon: BookOpen,     isPrimary: true },
      { href: "/tutor/students",   label: "Students Directory",  key: "students",   icon: GraduationCap,isPrimary: true },
      { href: "/tutor/attendance", label: "Daily Attendance",    key: "attendance", icon: CalendarCheck, isPrimary: true },
      { href: "/tutor/timetable",  label: "Routine & Schedule",  key: "timetable",  icon: Clock,         isPrimary: false },
    ],
  },
  {
    category: "Teaching & Exams",
    key: "teachingExams",
    items: [
      { href: "/tutor/exams",            label: "Exams & Results",  key: "exams",          icon: Award,      isPrimary: true },
      { href: "/tutor/assignments",       label: "Assignments",      key: "assignments",     icon: FileText,   isPrimary: true },
      { href: "/tutor/materials",         label: "Study Materials",  key: "materials",       icon: BookOpen,   isPrimary: true },
      { href: "/tutor/recorded-classes",  label: "Recorded Classes", key: "recordedClasses", icon: Video,      isPrimary: false },
      { href: "/tutor/doubts",            label: "Student Doubts",   key: "doubts",          icon: HelpCircle, isPrimary: true },
    ],
  },
  {
    category: "Finance & Account",
    key: "financeAccount",
    items: [
      { href: "/tutor/fees",     label: "Fee Ledger",        key: "fees",     icon: CreditCard, isPrimary: true },
      { href: "/tutor/reports",  label: "Reports Center",    key: "reports",  icon: BarChart3,  isPrimary: false },
      { href: "/tutor/financial-management", label: "Financial ERP", key: "financialManagement", icon: CircleDollarSign, isPrimary: false, badge: "ERP", badgeColor: "emerald" },
      { href: "/tutor/documents",label: "Documents Vault",   key: "documents",icon: FolderArchive, isPrimary: false },
      { href: "/tutor/settings", label: "Profile & Settings",key: "settings", icon: Settings,   isPrimary: true },
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
    category: "Academic & Sessions",
    key: "academicSessions",
    items: [
      { href: "/tutor/academic-years", label: "Academic Years", key: "academicYears", icon: CalendarDays },
      { href: "/tutor/classes", label: "Classes & Sections", key: "classes", icon: Layers },
      { href: "/owner/batches", label: "All Batches", key: "ownerBatches", icon: BookOpen },
      { href: "/owner/students", label: "All Students", key: "ownerStudents", icon: GraduationCap },
      { href: "/owner/tutors", label: "Tutors & Faculty", key: "ownerTutors", icon: Users },
      { href: "/owner/staff", label: "Staff & Roles", key: "ownerStaff", icon: UserCheck },
    ],
  },
  {
    category: "Operations & ERP",
    key: "operationsERP",
    items: [
      { href: "/owner/attendance", label: "Attendance Overview", key: "ownerAttendance", icon: CalendarCheck },
      { href: "/tutor/financial-management", label: "Financial ERP", key: "financialManagement", icon: CircleDollarSign, badge: "ERP", badgeColor: "emerald" },
      { href: "/owner/fees", label: "Fee Reports", key: "ownerFees", icon: CreditCard },
      { href: "/owner/expenses", label: "Expenses & Payroll", key: "ownerExpenses", icon: Receipt },
    ],
  },
  {
    category: "Vault & Analytics",
    key: "vaultAnalytics",
    items: [
      { href: "/tutor/reports", label: "Reports Center", key: "reports", icon: BarChart3 },
      { href: "/tutor/documents", label: "Documents Vault", key: "documents", icon: FolderArchive },
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

