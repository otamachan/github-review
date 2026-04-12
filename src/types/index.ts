export interface Label {
  name: string;
  color: string;
}

export interface PRItem {
  id: number;
  number: number;
  title: string;
  state: string;
  draft: boolean;
  user: { login: string; avatar_url: string };
  created_at: string;
  updated_at: string;
  additions: number;
  deletions: number;
  changed_files: number;
  html_url: string;
  body: string | null;
  labels: Label[];
  head: { ref: string };
  base: { ref: string };
  repo: { owner: string; name: string; full_name: string };
}

export interface FileChange {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
}

export interface ReviewComment {
  id: string;
  filename: string;
  lineNumber: number;
  side: "LEFT" | "RIGHT";
  body: string;
  createdAt: number;
}

export type Route =
  | { page: "list" }
  | { page: "detail"; owner: string; repo: string; number: number }
  | { page: "diff"; owner: string; repo: string; number: number; fileIndex: number };
