import { useEffect, useState } from "react";
import type { PRItem, FileChange, Route, ReviewComment } from "../types";
import { fetchPRDetail, fetchPRFiles } from "../lib/github";
import { routeToPath } from "../lib/router";
import DiffView from "./DiffView";

function statusIcon(status: string): string {
  switch (status) {
    case "added": return "+";
    case "removed": return "-";
    case "renamed": return "R";
    default: return "M";
  }
}

function statusColor(status: string): string {
  switch (status) {
    case "added": return "var(--diff-add-line)";
    case "removed": return "var(--diff-del-line)";
    default: return "var(--text-secondary)";
  }
}

export default function PRDetail({
  owner,
  repo,
  number,
  navigate,
  viewed,
  onToggleViewed,
  comments,
  onAddComment,
  onRemoveComment,
  wordWrap,
  fontSize,
}: {
  owner: string;
  repo: string;
  number: number;
  navigate: (route: Route) => void;
  viewed: Set<string>;
  onToggleViewed: (filename: string) => void;
  comments: ReviewComment[];
  onAddComment: (
    filename: string,
    lineNumber: number,
    side: "LEFT" | "RIGHT",
    body: string,
  ) => void;
  onRemoveComment: (id: string) => void;
  wordWrap: boolean;
  fontSize: number;
}) {
  const [pr, setPr] = useState<PRItem | null>(null);
  const [files, setFiles] = useState<FileChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "all">("all");

  useEffect(() => {
    Promise.all([
      fetchPRDetail(owner, repo, number),
      fetchPRFiles(owner, repo, number),
    ])
      .then(([prData, filesData]) => {
        setPr(prData);
        setFiles(filesData);
      })
      .finally(() => setLoading(false));
  }, [owner, repo, number]);

  if (loading || !pr) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[var(--text-secondary)]">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      {/* PR info */}
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-1">
          <span>{owner}/{repo}#{number}</span>
          <a
            href={pr.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] active:opacity-80"
          >
            Open on GitHub ↗
          </a>
        </div>
        <h2 className="text-lg font-bold leading-snug">{pr.title}</h2>
        <div className="flex items-center gap-2 mt-2 text-xs text-[var(--text-secondary)]">
          <span>{pr.head.ref}</span>
          <span>→</span>
          <span>{pr.base.ref}</span>
        </div>
        <div className="flex gap-4 mt-2 text-xs">
          <span className="text-[var(--diff-add-line)]">+{pr.additions}</span>
          <span className="text-[var(--diff-del-line)]">-{pr.deletions}</span>
          <span className="text-[var(--text-secondary)]">
            {pr.changed_files} files
          </span>
          <span className="text-[var(--text-secondary)]">
            ({viewed.size}/{files.length} viewed)
          </span>
        </div>
      </div>

      {/* Description */}
      {pr.body && (
        <div className="px-4 py-3 border-b border-[var(--border)] text-sm text-[var(--text-secondary)] whitespace-pre-wrap break-words">
          {pr.body}
        </div>
      )}

      {/* View mode toggle */}
      <div className="flex border-b border-[var(--border)]">
        <button
          onClick={() => setViewMode("all")}
          className={`flex-1 py-2 text-xs text-center ${
            viewMode === "all"
              ? "text-[var(--accent)] border-b-2 border-[var(--accent)]"
              : "text-[var(--text-secondary)]"
          }`}
        >
          Full diff
        </button>
        <button
          onClick={() => setViewMode("list")}
          className={`flex-1 py-2 text-xs text-center ${
            viewMode === "list"
              ? "text-[var(--accent)] border-b-2 border-[var(--accent)]"
              : "text-[var(--text-secondary)]"
          }`}
        >
          File list
        </button>
      </div>

      {viewMode === "list" ? (
        /* File list */
        <div className="divide-y divide-[var(--border)]">
          {files.map((file, i) => (
            <div key={file.filename} className="flex items-center">
              {/* Checkbox */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleViewed(file.filename);
                }}
                className="flex-shrink-0 w-10 flex items-center justify-center"
              >
                <div
                  className={`w-4 h-4 rounded border ${
                    viewed.has(file.filename)
                      ? "bg-[var(--accent)] border-[var(--accent)]"
                      : "border-[var(--border)]"
                  } flex items-center justify-center`}
                >
                  {viewed.has(file.filename) && (
                    <span className="text-white text-[10px]">✓</span>
                  )}
                </div>
              </button>
              {/* File info */}
              <a
                href={routeToPath({
                  page: "diff",
                  owner,
                  repo,
                  number,
                  fileIndex: i,
                })}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                  e.preventDefault();
                  navigate({ page: "diff", owner, repo, number, fileIndex: i });
                }}
                className={`flex-1 text-left py-3 pr-4 active:bg-[var(--bg-tertiary)] transition-colors no-underline text-inherit ${
                  viewed.has(file.filename) ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-mono font-bold w-4 text-center"
                    style={{ color: statusColor(file.status) }}
                  >
                    {statusIcon(file.status)}
                  </span>
                  <span className="text-sm truncate flex-1 mono">
                    {file.filename}
                  </span>
                </div>
                <div className="flex gap-3 ml-6 mt-1 text-xs">
                  {file.additions > 0 && (
                    <span className="text-[var(--diff-add-line)]">+{file.additions}</span>
                  )}
                  {file.deletions > 0 && (
                    <span className="text-[var(--diff-del-line)]">-{file.deletions}</span>
                  )}
                </div>
              </a>
            </div>
          ))}
        </div>
      ) : (
        /* All diffs scrollable */
        <div>
          {files.map((file) => (
            <div key={file.filename} className="border-b border-[var(--border)]">
              {/* File header with checkbox */}
              <div className="sticky top-[44px] z-10 flex items-center gap-2 px-3 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
                <button
                  onClick={() => onToggleViewed(file.filename)}
                  className="flex-shrink-0"
                >
                  <div
                    className={`w-4 h-4 rounded border ${
                      viewed.has(file.filename)
                        ? "bg-[var(--accent)] border-[var(--accent)]"
                        : "border-[var(--border)]"
                    } flex items-center justify-center`}
                  >
                    {viewed.has(file.filename) && (
                      <span className="text-white text-[10px]">✓</span>
                    )}
                  </div>
                </button>
                <span className="font-medium mono text-xs truncate">{file.filename}</span>
              </div>
              {file.patch ? (
                <DiffView
                  filename={file.filename}
                  patch={file.patch}
                  comments={comments}
                  onAddComment={onAddComment}
                  onRemoveComment={onRemoveComment}
                  showHeader={false}
                  wordWrap={wordWrap}
                  fontSize={fontSize}
                />
              ) : (
                <div className="p-4 text-center text-[var(--text-secondary)] text-xs">
                  Binary file or diff unavailable
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
