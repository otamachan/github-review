import { useCallback, useEffect, useState } from "react";
import FileNavigator from "./components/FileNavigator";
import PRDetail from "./components/PRDetail";
import PRList from "./components/PRList";
import ReviewSummary from "./components/ReviewSummary";
import TokenInput from "./components/TokenInput";
import { usePRData } from "./hooks/usePRData";
import { useReviewComments } from "./hooks/useReviewComments";
import { type Theme, useTheme } from "./hooks/useTheme";
import { useViewedFiles } from "./hooks/useViewedFiles";
import { clearToken, getToken, type PRFilter } from "./lib/github";
import { pathToRoute, routeToPath } from "./lib/router";
import type { Route } from "./types";

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
  const showsPR = route.page === "detail" || route.page === "diff";
  const { pr, files, loading, error } = usePRData(
    showsPR && authed ? route.owner : undefined,
    showsPR && authed ? route.repo : undefined,
    showsPR && authed ? route.number : undefined,
  );
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

  const navigate = useCallback((r: Route) => {
    setRouteState(r);
    const path = routeToPath(r);
    if (window.location.pathname !== path) {
      window.history.pushState({}, "", path);
    }
  }, []);

  // Sync route with browser history (back/forward)
  useEffect(() => {
    const handlePop = () => {
      const r = pathToRoute(window.location.pathname);
      setRouteState(r);
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  const handleBack = () => {
    if (route.page === "diff") {
      navigate({
        page: "detail",
        owner: route.owner,
        repo: route.repo,
        number: route.number,
      });
    } else if (route.page === "detail") {
      navigate({ page: "list" });
    }
  };

  const handleLogout = () => {
    clearToken();
    setAuthed(false);
    navigate({ page: "list" });
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
          pr={pr}
          files={files}
          loading={loading}
          error={error}
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
      {route.page === "diff" && (
        <FileNavigator
          files={files}
          initialIndex={route.fileIndex}
          loading={loading}
          error={error}
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
