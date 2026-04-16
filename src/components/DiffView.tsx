import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import cpp from "highlight.js/lib/languages/cpp";
import css from "highlight.js/lib/languages/css";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
// Register common languages
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import kotlin from "highlight.js/lib/languages/kotlin";
import markdown from "highlight.js/lib/languages/markdown";
import python from "highlight.js/lib/languages/python";
import ruby from "highlight.js/lib/languages/ruby";
import rust from "highlight.js/lib/languages/rust";
import sql from "highlight.js/lib/languages/sql";
import swift from "highlight.js/lib/languages/swift";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";
import parseDiff from "parse-diff";
import { useMemo, useState } from "react";
import type { ReviewComment } from "../types";
import CommentInput from "./CommentInput";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("java", java);
hljs.registerLanguage("go", go);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("css", css);
hljs.registerLanguage("json", json);
hljs.registerLanguage("yaml", yaml);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("markdown", markdown);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("ruby", ruby);
hljs.registerLanguage("swift", swift);
hljs.registerLanguage("kotlin", kotlin);
hljs.registerLanguage("dockerfile", dockerfile);

const EXT_TO_LANG: Record<string, string> = {
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  tsx: "typescript",
  mts: "typescript",
  py: "python",
  pyw: "python",
  java: "java",
  go: "go",
  rs: "rust",
  c: "cpp",
  cc: "cpp",
  cpp: "cpp",
  h: "cpp",
  hpp: "cpp",
  css: "css",
  scss: "css",
  json: "json",
  yml: "yaml",
  yaml: "yaml",
  html: "xml",
  xml: "xml",
  svg: "xml",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  md: "markdown",
  mdx: "markdown",
  sql: "sql",
  rb: "ruby",
  swift: "swift",
  kt: "kotlin",
  kts: "kotlin",
  Dockerfile: "dockerfile",
};

function detectLanguage(filename: string): string | undefined {
  const base = filename.split("/").pop() ?? "";
  if (EXT_TO_LANG[base]) return EXT_TO_LANG[base];
  const ext = base.split(".").pop() ?? "";
  return EXT_TO_LANG[ext];
}

function highlightCode(code: string, lang: string | undefined): string {
  if (!lang) return escapeHtml(code);
  try {
    return hljs.highlight(code, { language: lang }).value;
  } catch {
    return escapeHtml(code);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

interface DiffLine {
  type: "add" | "del" | "normal" | "hunk";
  content: string;
  oldLine?: number;
  newLine?: number;
}

function parsePatch(patch: string): DiffLine[] {
  const diffStr = `diff --git a/f b/f\n--- a/f\n+++ b/f\n${patch}`;
  const parsed = parseDiff(diffStr);
  const file = parsed[0];
  if (!file) return [];

  const lines: DiffLine[] = [];
  for (const chunk of file.chunks) {
    lines.push({
      type: "hunk",
      content: chunk.content,
    });
    for (const change of chunk.changes) {
      if (change.type === "add") {
        lines.push({
          type: "add",
          content: change.content,
          newLine: change.ln,
        });
      } else if (change.type === "del") {
        lines.push({
          type: "del",
          content: change.content,
          oldLine: change.ln,
        });
      } else {
        lines.push({
          type: "normal",
          content: change.content,
          oldLine: change.ln1,
          newLine: change.ln2,
        });
      }
    }
  }
  return lines;
}

const CONTEXT_LINES = 3;

export default function DiffView({
  filename,
  patch,
  comments,
  onAddComment,
  onRemoveComment,
  showHeader = true,
  wordWrap,
  fontSize,
}: {
  filename: string;
  patch: string;
  comments: ReviewComment[];
  onAddComment: (
    filename: string,
    lineNumber: number,
    side: "LEFT" | "RIGHT",
    body: string,
  ) => void;
  onRemoveComment: (id: string) => void;
  showHeader?: boolean;
  wordWrap: boolean;
  fontSize: number;
}) {
  const [commentLine, setCommentLine] = useState<{
    line: number;
    side: "LEFT" | "RIGHT";
  } | null>(null);
  // Regions the user has explicitly expanded. Empty set means every
  // collapsible region starts collapsed, which matches the previous behavior
  // without needing to sync state with `regions` on every re-render.
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const lang = useMemo(() => detectLanguage(filename), [filename]);
  const lines = useMemo(() => parsePatch(patch), [patch]);

  // Pre-highlight all lines
  const highlightedLines = useMemo(() => {
    return lines.map((line) => {
      if (line.type === "hunk") return "";
      return highlightCode(line.content.slice(1), lang);
    });
  }, [lines, lang]);

  const regions = useMemo(() => {
    const result: { start: number; end: number }[] = [];
    let runStart: number | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (line.type === "normal") {
        if (runStart === null) runStart = i;
      } else {
        if (runStart !== null) {
          const runLen = i - runStart;
          if (runLen > CONTEXT_LINES * 2) {
            result.push({
              start: runStart + CONTEXT_LINES,
              end: i - CONTEXT_LINES,
            });
          }
          runStart = null;
        }
      }
    }
    if (runStart !== null) {
      const runLen = lines.length - runStart;
      if (runLen > CONTEXT_LINES * 2) {
        result.push({
          start: runStart + CONTEXT_LINES,
          end: lines.length - CONTEXT_LINES,
        });
      }
    }
    return result;
  }, [lines]);

  const fileComments = comments.filter((c) => c.filename === filename);

  const isHidden = (index: number): boolean => {
    for (const r of regions) {
      if (!expanded.has(r.start) && index >= r.start && index < r.end)
        return true;
    }
    return false;
  };

  const getCollapseRegion = (
    index: number,
  ): { start: number; end: number } | null => {
    for (const r of regions) {
      if (r.start === index) return r;
    }
    return null;
  };

  const lineNumber = (line: DiffLine): number => {
    return line.newLine ?? line.oldLine ?? 0;
  };

  return (
    <div style={{ fontSize: `${fontSize}px`, lineHeight: 1.4 }}>
      {showHeader && (
        <div className="sticky top-0 z-10 px-3 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border)] font-medium mono truncate">
          {filename}
        </div>
      )}

      <div className={wordWrap ? "" : "overflow-x-auto"}>
        <div className={wordWrap ? "" : "min-w-max"}>
          {lines.map((line, i) => {
            if (isHidden(i)) return null;

            const region = getCollapseRegion(i);
            if (region && !expanded.has(region.start)) {
              return (
                <button
                  key={`collapse-${i}`}
                  onClick={() => {
                    setExpanded((prev) => {
                      const next = new Set(prev);
                      next.add(region.start);
                      return next;
                    });
                  }}
                  className="w-full text-center py-1 bg-[var(--bg-tertiary)] text-[var(--accent)] text-xs active:opacity-80 border-y border-[var(--border)]"
                >
                  ▼ Expand {region.end - region.start} lines
                </button>
              );
            }

            if (line.type === "hunk") {
              return (
                <div
                  key={`hunk-${i}`}
                  className="px-3 py-1 bg-[var(--bg-tertiary)] text-[var(--accent)] mono select-none whitespace-pre"
                >
                  {line.content}
                </div>
              );
            }

            const ln = lineNumber(line);
            const side: "LEFT" | "RIGHT" =
              line.type === "del" ? "LEFT" : "RIGHT";
            const lineComments = fileComments.filter(
              (c) => c.lineNumber === ln && c.side === side,
            );

            const bgClass =
              line.type === "add"
                ? "bg-[var(--diff-add-bg)]"
                : line.type === "del"
                  ? "bg-[var(--diff-del-bg)]"
                  : "";

            return (
              <div key={`line-${i}`}>
                <div
                  className={`flex ${bgClass} active:opacity-80`}
                  onClick={() => {
                    if (line.type !== "hunk" && ln > 0) {
                      setCommentLine(
                        commentLine?.line === ln && commentLine?.side === side
                          ? null
                          : { line: ln, side },
                      );
                    }
                  }}
                >
                  <div
                    className="flex-shrink-0 text-right pr-1 text-[var(--text-secondary)] select-none mono"
                    style={{ width: "4ch" }}
                  >
                    {line.oldLine ?? ""}
                  </div>
                  <div
                    className="flex-shrink-0 text-right pr-1 text-[var(--text-secondary)] select-none mono"
                    style={{ width: "4ch" }}
                  >
                    {line.newLine ?? ""}
                  </div>
                  <div
                    className="flex-shrink-0 text-center select-none mono"
                    style={{
                      width: "1.5ch",
                      color:
                        line.type === "add"
                          ? "var(--diff-add-line)"
                          : line.type === "del"
                            ? "var(--diff-del-line)"
                            : "transparent",
                    }}
                  >
                    {line.type === "add"
                      ? "+"
                      : line.type === "del"
                        ? "-"
                        : " "}
                  </div>
                  <div
                    className={`flex-1 mono pr-2 ${wordWrap ? "whitespace-pre-wrap break-all" : "whitespace-pre"}`}
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: highlight.js output; source already HTML-escaped
                    dangerouslySetInnerHTML={{
                      __html: highlightedLines[i] ?? "",
                    }}
                  />
                </div>

                {lineComments.map((c) => (
                  <div
                    key={c.id}
                    className="mx-2 my-1 px-2 py-1.5 bg-[var(--bg-secondary)] border-l-2 border-[var(--accent)] rounded text-xs"
                  >
                    <div className="flex justify-between items-start">
                      <span>{c.body}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveComment(c.id);
                        }}
                        className="ml-2 text-[var(--text-secondary)] active:text-[var(--diff-del-line)] flex-shrink-0"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}

                {commentLine?.line === ln && commentLine?.side === side && (
                  <CommentInput
                    lineNumber={ln}
                    onSubmit={(body) => {
                      onAddComment(filename, ln, side, body);
                      setCommentLine(null);
                    }}
                    onCancel={() => setCommentLine(null)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
