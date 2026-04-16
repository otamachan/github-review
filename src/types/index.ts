export interface Label {
  name: string;
  color: string;
}

export type PRState = "open" | "closed";
export type FileChangeStatus =
  | "added"
  | "removed"
  | "modified"
  | "renamed"
  | "copied"
  | "changed"
  | "unchanged";

export interface PRStats {
  additions: number;
  deletions: number;
  changed_files: number;
}

/**
 * Fields returned by the search endpoint used for PR lists. Branch refs and
 * change stats are not part of this response, so they have no place on this
 * type — fetchPRStats fills `stats` in lazily.
 */
export interface PRListItem {
  id: number;
  number: number;
  title: string;
  state: PRState;
  draft: boolean;
  user: { login: string; avatar_url: string };
  created_at: string;
  updated_at: string;
  html_url: string;
  body: string | null;
  labels: Label[];
  repo: { owner: string; name: string; full_name: string };
  /** null until fetchPRStats populates it. */
  stats: PRStats | null;
}

/** From pulls.get. Superset of PRListItem with the extra fields guaranteed. */
export interface PRDetail extends Omit<PRListItem, "stats"> {
  stats: PRStats;
  head: { ref: string };
  base: { ref: string };
}

export interface FileChange {
  filename: string;
  status: FileChangeStatus;
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
  | {
      page: "diff";
      owner: string;
      repo: string;
      number: number;
      fileIndex: number;
    };
