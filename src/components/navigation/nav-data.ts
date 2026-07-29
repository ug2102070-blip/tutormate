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
  LucideIcon,
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
