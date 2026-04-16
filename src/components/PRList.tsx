import { useEffect, useState } from "react";
import { fetchMyPRs, fetchPRStats, type PRFilter } from "../lib/github";
import { routeToPath } from "../lib/router";
import type { PRListItem, PRStats, Route } from "../types";

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
const STATS_CONCURRENCY = 3;

function isValidCachedPR(v: unknown): v is PRListItem {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  const repo = r.repo as Record<string, unknown> | undefined;
  return (
    typeof r.id === "number" &&
    typeof r.number === "number" &&
    typeof r.title === "string" &&
    !!repo &&
    typeof repo.owner === "string" &&
    typeof repo.name === "string" &&
    "stats" in r
  );
}

function loadCache(filter: PRFilter): PRListItem[] | null {
  try {
    const raw = localStorage.getItem(`${CACHE_KEY}-${filter}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || !parsed.every(isValidCachedPR)) {
      // Stale or mismatched schema — discard so we don't crash later.
      localStorage.removeItem(`${CACHE_KEY}-${filter}`);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveCache(filter: PRFilter, prs: PRListItem[]) {
  try {
    localStorage.setItem(`${CACHE_KEY}-${filter}`, JSON.stringify(prs));
  } catch {
    // Cache writes are best-effort: localStorage quota exceeded is non-fatal,
    // the next reload simply refetches from the API.
  }
}

// Fetch stats for each PR with bounded concurrency so we don't fire N
// simultaneous requests into GitHub's secondary rate limit.
async function fetchStatsPool(
  prs: PRListItem[],
  limit: number,
  onStats: (pr: PRListItem, stats: PRStats) => void,
  onError: (pr: PRListItem, message: string) => void,
  isCancelled: () => boolean,
) {
  let index = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, prs.length) }, async () => {
      while (index < prs.length && !isCancelled()) {
        const pr = prs[index++]!;
        try {
          const stats = await fetchPRStats(
            pr.repo.owner,
            pr.repo.name,
            pr.number,
          );
          if (isCancelled()) return;
          onStats(pr, stats);
        } catch (e) {
          if (isCancelled()) return;
          onError(pr, e instanceof Error ? e.message : String(e));
        }
      }
    }),
  );
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
  const [prs, setPrs] = useState<PRListItem[]>(() => loadCache(filter) ?? []);
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
        const merged: PRListItem[] = list.map((pr) => {
          const prev = prevMap.get(pr.id);
          return prev?.stats ? { ...pr, stats: prev.stats } : pr;
        });
        setPrs(merged);
        setLoading(false);
        setRefreshing(false);
        saveCache(filter, merged);

        // Lazy-fetch stats in background with bounded concurrency; per-PR
        // failures are isolated so a rate-limit on one request doesn't
        // cascade to the rest. Errors are logged rather than silently
        // swallowed so they're at least observable in the console.
        void fetchStatsPool(
          merged,
          STATS_CONCURRENCY,
          (pr, stats) => {
            setPrs((prev) => {
              const next = prev.map((p) =>
                p.id === pr.id ? { ...p, stats } : p,
              );
              saveCache(filter, next);
              return next;
            });
          },
          (pr, message) => {
            console.warn(
              `[github-review] failed to fetch stats for ${pr.repo.full_name}#${pr.number}: ${message}`,
            );
          },
          () => cancelled,
        );
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
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0)
                    return;
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
                <div className="text-sm font-medium leading-snug">
                  {pr.title}
                </div>
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
                  {pr.stats && (
                    <>
                      <span className="text-[var(--diff-add-line)]">
                        +{pr.stats.additions}
                      </span>
                      <span className="text-[var(--diff-del-line)]">
                        -{pr.stats.deletions}
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
