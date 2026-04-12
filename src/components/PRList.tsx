import { useEffect, useState } from "react";
import type { PRItem, Route } from "../types";
import { fetchMyPRs, fetchPRStats, type PRFilter } from "../lib/github";
import { routeToPath } from "../lib/router";

export type { PRFilter };

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

const CACHE_KEY = "github-review-prlist-cache";

function loadCache(filter: PRFilter): PRItem[] | null {
  try {
    const raw = localStorage.getItem(`${CACHE_KEY}-${filter}`);
    if (!raw) return null;
    return JSON.parse(raw) as PRItem[];
  } catch {
    return null;
  }
}

function saveCache(filter: PRFilter, prs: PRItem[]) {
  try {
    localStorage.setItem(`${CACHE_KEY}-${filter}`, JSON.stringify(prs));
  } catch {
    // Ignore quota errors
  }
}

export default function PRList({
  navigate,
  filter,
  setFilter,
}: {
  navigate: (route: Route) => void;
  filter: PRFilter;
  setFilter: (f: PRFilter) => void;
}) {
  const [prs, setPrs] = useState<PRItem[]>(() => loadCache(filter) ?? []);
  const [loading, setLoading] = useState(() => loadCache(filter) === null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const cached = loadCache(filter);
    if (cached) {
      setPrs(cached);
      setLoading(false);
      setRefreshing(true);
    } else {
      setPrs([]);
      setLoading(true);
      setRefreshing(false);
    }
    setError("");

    fetchMyPRs(filter)
      .then((list) => {
        if (cancelled) return;
        // Preserve previously fetched stats when PR id matches
        const prevMap = new Map(cached?.map((p) => [p.id, p]));
        const merged = list.map((pr) => {
          const prev = prevMap.get(pr.id);
          return prev
            ? {
                ...pr,
                additions: prev.additions,
                deletions: prev.deletions,
                changed_files: prev.changed_files,
              }
            : pr;
        });
        setPrs(merged);
        setLoading(false);
        setRefreshing(false);
        saveCache(filter, merged);

        // Lazy-fetch stats in background; update each PR when ready.
        for (const pr of merged) {
          fetchPRStats(pr.repo.owner, pr.repo.name, pr.number)
            .then((stats) => {
              if (cancelled) return;
              setPrs((prev) => {
                const next = prev.map((p) =>
                  p.id === pr.id ? { ...p, ...stats } : p,
                );
                saveCache(filter, next);
                return next;
              });
            })
            .catch(() => {});
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.message);
        setLoading(false);
        setRefreshing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filter]);

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex border-b border-[var(--border)]">
        <button
          onClick={() => setFilter("mine")}
          className={`flex-1 py-2.5 text-sm text-center ${
            filter === "mine"
              ? "text-[var(--accent)] border-b-2 border-[var(--accent)]"
              : "text-[var(--text-secondary)]"
          }`}
        >
          My PRs
        </button>
        <button
          onClick={() => setFilter("review")}
          className={`flex-1 py-2.5 text-sm text-center ${
            filter === "review"
              ? "text-[var(--accent)] border-b-2 border-[var(--accent)]"
              : "text-[var(--text-secondary)]"
          }`}
        >
          Review requested
        </button>
      </div>

      {refreshing && (
        <div className="px-4 py-1 text-[10px] text-[var(--text-secondary)] text-center bg-[var(--bg-secondary)]">
          Refreshing...
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-[var(--text-secondary)]">Loading...</div>
        </div>
      ) : error ? (
        <div className="p-4 text-[var(--diff-del-line)]">Error: {error}</div>
      ) : prs.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-[var(--text-secondary)]">
          No PRs found
        </div>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {prs.map((pr) => {
            const route: Route = {
              page: "detail",
              owner: pr.repo.owner,
              repo: pr.repo.name,
              number: pr.number,
            };
            return (
            <a
              key={pr.id}
              href={routeToPath(route)}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                e.preventDefault();
                navigate(route);
              }}
              className="block w-full text-left px-4 py-3 active:bg-[var(--bg-tertiary)] transition-colors text-inherit no-underline"
            >
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-1">
                <span>{pr.repo.full_name}</span>
                <span>#{pr.number}</span>
                <span className="ml-auto">{timeAgo(pr.updated_at)}</span>
              </div>
              <div className="text-sm font-medium leading-snug">{pr.title}</div>
              {pr.labels.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {pr.labels.map((label) => (
                    <span
                      key={label.name}
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                      style={{
                        backgroundColor: `#${label.color}33`,
                        color: `#${label.color}`,
                        border: `1px solid #${label.color}66`,
                      }}
                    >
                      {label.name}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-secondary)]">
                <img
                  src={pr.user.avatar_url}
                  alt=""
                  className="w-4 h-4 rounded-full"
                />
                <span>{pr.user.login}</span>
                {pr.draft && (
                  <span className="px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                    Draft
                  </span>
                )}
                {(pr.additions > 0 || pr.deletions > 0) && (
                  <>
                    <span className="text-[var(--diff-add-line)]">
                      +{pr.additions}
                    </span>
                    <span className="text-[var(--diff-del-line)]">
                      -{pr.deletions}
                    </span>
                  </>
                )}
              </div>
            </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
