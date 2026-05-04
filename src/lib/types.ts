export type BugStatus =
  | "pending"
  | "in_progress"
  | "pending_acceptance"
  | "done";
export type BugSeverity = "P0" | "P1" | "P2" | "P3";

export const STATUS_LABEL: Record<BugStatus, string> = {
  pending: "待處理",
  in_progress: "處理中",
  pending_acceptance: "待驗收",
  done: "已完成",
};

export const STATUS_OPTIONS: { value: BugStatus; label: string }[] = [
  { value: "pending", label: "待處理" },
  { value: "in_progress", label: "處理中" },
  { value: "pending_acceptance", label: "待驗收" },
  { value: "done", label: "已完成" },
];

export const SEVERITY_LABEL: Record<BugSeverity, string> = {
  P0: "P0 阻擋",
  P1: "P1 嚴重",
  P2: "P2 一般",
  P3: "P3 小問題",
};

export const SEVERITY_OPTIONS: { value: BugSeverity; label: string }[] = [
  { value: "P0", label: "P0 阻擋" },
  { value: "P1", label: "P1 嚴重" },
  { value: "P2", label: "P2 一般" },
  { value: "P3", label: "P3 小問題" },
];

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
};

export type Module = {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  sort_order: number;
};

export type Bug = {
  id: string;
  title: string;
  description: string;
  module_id: string | null;
  severity: BugSeverity;
  status: BugStatus;
  reporter_id: string;
  assignee_id: string | null;
  external_task_id: string | null;
  created_at: string;
  updated_at: string;
  module?: Module | null;
  reporter?: Profile | null;
  assignee?: Profile | null;
};

export type Comment = {
  id: string;
  bug_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author?: Profile | null;
};
