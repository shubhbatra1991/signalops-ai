import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  ChartNoAxesCombined,
  CheckCircle2,
  CircleHelp,
  Eye,
  Filter,
  Info,
  LayoutDashboard,
  Link2,
  Menu,
  MessageSquare,
  Pause,
  Play,
  Settings,
  ShieldCheck,
  SunMoon,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";

export type AppIconName =
  | "overview"
  | "events"
  | "funnels"
  | "feedback"
  | "insights"
  | "missions"
  | "impact"
  | "settings"
  | "guest"
  | "workspace"
  | "security"
  | "appearance"
  | "evidence"
  | "success"
  | "warning"
  | "information"
  | "help"
  | "menu"
  | "pause"
  | "play"
  | "arrow-left"
  | "arrow-right";

const icons: Record<AppIconName, LucideIcon> = {
  overview: LayoutDashboard,
  events: Activity,
  funnels: Filter,
  feedback: MessageSquare,
  insights: BrainCircuit,
  missions: Target,
  impact: ChartNoAxesCombined,
  settings: Settings,
  guest: Eye,
  workspace: Users,
  security: ShieldCheck,
  appearance: SunMoon,
  evidence: Link2,
  success: CheckCircle2,
  warning: AlertTriangle,
  information: Info,
  help: CircleHelp,
  menu: Menu,
  pause: Pause,
  play: Play,
  "arrow-left": ArrowLeft,
  "arrow-right": ArrowRight,
};

/** Shared decorative icon treatment. Interactive controls retain visible text labels. */
export function AppIcon({ name, size = 20, className }: { name: AppIconName; size?: 16 | 18 | 20 | 24; className?: string }) {
  const Icon = icons[name];
  return <Icon className={className ? `app-icon ${className}` : "app-icon"} size={size} strokeWidth={1.8} aria-hidden="true" focusable="false" />;
}

export function EmptyStateIcon({ name }: { name: AppIconName }) {
  return <span className="empty-state-icon"><AppIcon name={name} size={24} /></span>;
}
