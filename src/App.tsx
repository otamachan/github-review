import { useCallback, useEffect, useState } from "react";
import FileNavigator from "./components/FileNavigator";
import PRDetail from "./components/PRDetail";
import PRList from "./components/PRList";
import ReviewSummary from "./components/ReviewSummary";
import TokenInput from "./components/TokenInput";
import { useReviewComments } from "./hooks/useReviewComments";
import { type Theme, useTheme } from "./hooks/useTheme";
import { useViewedFiles } from "./hooks/useViewedFiles";
import {
  clearToken,
  fetchPRDetail,
  fetchPRFiles,
  getToken,
  type PRFilter,
} from "./lib/github";
import { pathToRoute, routeToPath } from "./lib/router";
import type { FileChange, PRItem, Route } from "./types";

const THEME_LABELS: Record<Theme, string> = {
  dark: "Dark",
  light: "Light",
  system: "Auto",
};
const THEME_ORDER: Theme[] = ["system", "dark", "light"];

const WRAP_KEY = "github-review-wordwrap";
const FONT_SIZE_KEY = "github-review-fontsize";
const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 20;

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [route, setRouteState] = useState<Route>(() =>
    pathToRoute(window.location.pathname),
  );
  const [pr, setPr] = useState<PRItem | null>(null);
  const [files, setFiles] = useState<FileChange[]>([]);
  const { comments, addComment, removeComment, clearComments } =
    useReviewComments();
  const { theme, setTheme } = useTheme();
  const { viewed, toggleViewed } = useViewedFiles();
  const [wordWrap, setWordWrap] = useState(() => {
    return localStorage.getItem(WRAP_KEY) === "true";
  });
  const [fontSize, setFontSize] = useState<number>(() => {
    const stored = parseInt(localStorage.getItem(FONT_SIZE_KEY) ?? "", 10);
    return Number.isFinite(stored) &&
      stored >= MIN_FONT_SIZE &&
      stored <= MAX_FONT_SIZE
      ? stored
      : 12;
  });
  const [prFilter, setPrFilter] = useState<PRFilter>("mine");

  const adjustFontSize = (delta: number) => {
    setFontSize((prev) => {
      const next = Math.min(
        MAX_FONT_SIZE,
        Math.max(MIN_FONT_SIZE, prev + delta),
      );
      localStorage.setItem(FONT_SIZE_KEY, String(next));
      return next;
    });
  };

  const toggleWordWrap = () => {
    setWordWrap((prev) => {
      const next = !prev;
      localStorage.setItem(WRAP_KEY, String(next));
      return next;
    });
  };

  const setRoute = useCallback((r: Route) => {
    setRouteState(r);
    const path = routeToPath(r);
    if (window.location.pathname !== path) {
      window.history.pushState({}, "", path);
    }
  }, []);

  const navigate = useCallback(
    (r: Route) => {
      setRoute(r);
      if (r.page === "detail" || r.page === "diff") {
        if (!pr || pr.number !== r.number) {
          fetchPRDetail(r.owner, r.repo, r.number).then(setPr);
          fetchPRFiles(r.owner, r.repo, r.number).then(setFiles);
        }
      }
    },
    [pr, setRoute],
  );

  // Sync route with browser history (back/forward)
  useEffect(() => {
    const handlePop = () => {
      const r = pathToRoute(window.location.pathname);
      setRouteState(r);
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  // Load PR/files when route changes (e.g. on direct URL access or back/forward)
  // biome-ignore lint/correctness/useExhaustiveDependencies: `pr` is read but excluded from deps to avoid refetching whenever it changes
  useEffect(() => {
    if (route.page === "detail" || route.page === "diff") {
      if (!authed) return;
      if (!pr || pr.number !== route.number) {
        fetchPRDetail(route.owner, route.repo, route.number).then(setPr);
        fetchPRFiles(route.owner, route.repo, route.number).then(setFiles);
      }
    } else {
      setPr(null);
      setFiles([]);
    }
  }, [route, authed]);

  const handleBack = () => {
    if (route.page === "diff") {
      setRoute({
        page: "detail",
        owner: route.owner,
        repo: route.repo,
        number: route.number,
      });
    } else if (route.page === "detail") {
      setRoute({ page: "list" });
    }
  };

  const handleLogout = () => {
    clearToken();
    setAuthed(false);
    setRoute({ page: "list" });
  };

  const cycleTheme = () => {
    const idx = THEME_ORDER.indexOf(theme);
    setTheme(THEME_ORDER[(idx + 1) % THEME_ORDER.length]!);
  };

  if (!authed) {
    return <TokenInput onAuth={() => setAuthed(true)} />;
  }

  const showDiff = route.page === "diff" || route.page === "detail";

  return (
    <div className="min-h-screen pb-16">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center h-[44px] px-3 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
        {route.page !== "list" ? (
          <button
            onClick={handleBack}
            className="text-[var(--accent)] text-sm active:opacity-80 mr-2"
          >
            ← Back
          </button>
        ) : (
          <span className="font-bold text-sm">GitHub Review</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {showDiff && (
            <>
              <button
                onClick={() => adjustFontSize(-1)}
                className="text-xs active:opacity-80 px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
              >
                A−
              </button>
              <button
                onClick={() => adjustFontSize(1)}
                className="text-xs active:opacity-80 px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
              >
                A+
              </button>
              <button
                onClick={toggleWordWrap}
                className={`text-xs active:opacity-80 px-2 py-1 rounded ${
                  wordWrap
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                }`}
              >
                Wrap
              </button>
            </>
          )}
          <button
            onClick={cycleTheme}
            className="text-xs text-[var(--text-secondary)] active:opacity-80 px-2 py-1 rounded bg-[var(--bg-tertiary)]"
          >
            {THEME_LABELS[theme]}
          </button>
          <button
            onClick={handleLogout}
            className="text-xs text-[var(--text-secondary)] active:opacity-80"
          >
            Log out
          </button>
        </div>
      </header>

      {/* Main content */}
      {route.page === "list" && (
        <PRList navigate={navigate} filter={prFilter} setFilter={setPrFilter} />
      )}
      {route.page === "detail" && (
        <PRDetail
          owner={route.owner}
          repo={route.repo}
          number={route.number}
          navigate={navigate}
          viewed={viewed}
          onToggleViewed={toggleViewed}
          comments={comments}
          onAddComment={addComment}
          onRemoveComment={removeComment}
          wordWrap={wordWrap}
          fontSize={fontSize}
        />
      )}
      {route.page === "diff" && files.length > 0 && (
        <FileNavigator
          files={files}
          initialIndex={route.fileIndex}
          comments={comments}
          onAddComment={addComment}
          onRemoveComment={removeComment}
          viewed={viewed}
          onToggleViewed={toggleViewed}
          wordWrap={wordWrap}
          fontSize={fontSize}
        />
      )}

      {/* Review summary bar */}
      {pr && route.page !== "list" && (
        <ReviewSummary pr={pr} comments={comments} onClear={clearComments} />
      )}
    </div>
  );
}
