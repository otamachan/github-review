import { useCallback, useEffect, useRef, useState } from "react";
import { useSwipeable } from "react-swipeable";
import type { FileChange, ReviewComment } from "../types";
import DiffView from "./DiffView";

export default function FileNavigator({
  files,
  initialIndex,
  loading,
  error,
  comments,
  onAddComment,
  onRemoveComment,
  viewed,
  onToggleViewed,
  wordWrap,
  fontSize,
}: {
  files: FileChange[];
  initialIndex: number;
  loading: boolean;
  error: string | null;
  comments: ReviewComment[];
  onAddComment: (
    filename: string,
    lineNumber: number,
    side: "LEFT" | "RIGHT",
    body: string,
  ) => void;
  onRemoveComment: (id: string) => void;
  viewed: Set<string>;
  onToggleViewed: (filename: string) => void;
  wordWrap: boolean;
  fontSize: number;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  // Keep the view in sync when initialIndex changes (e.g., browser back/forward
  // to a different file), or clamp when the underlying files list shrinks.
  useEffect(() => {
    setCurrentIndex((prev) => {
      if (initialIndex !== prev) return initialIndex;
      if (prev >= files.length) return Math.max(0, files.length - 1);
      return prev;
    });
  }, [initialIndex, files.length]);
  const file = files[currentIndex];
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<{ time: number; x: number } | null>(null);

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };
  const goNext = () => {
    if (currentIndex < files.length - 1) setCurrentIndex(currentIndex + 1);
  };

  // Handle double tap on left/right half for file navigation
  const handleTap = (e: React.PointerEvent<HTMLDivElement>) => {
    // Ignore taps on interactive elements (buttons, textareas, etc.)
    const target = e.target as HTMLElement;
    if (target.closest("button, textarea, input, a")) return;

    const now = Date.now();
    const x = e.clientX;
    const last = lastTapRef.current;

    if (last && now - last.time < 400 && Math.abs(x - last.x) < 40) {
      // Double tap detected
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const middle = rect.left + rect.width / 2;
        if (x < middle) {
          goPrev();
        } else {
          goNext();
        }
      }
      lastTapRef.current = null;
    } else {
      lastTapRef.current = { time: now, x };
    }
  };

  // Only query elements that opt in to horizontal scroll via Tailwind's
  // `.overflow-x-auto` class. Previously this walked every descendant,
  // forcing layout reads across the whole DOM subtree on each swipe.
  const isHorizontallyScrolled = useCallback(() => {
    if (!containerRef.current) return false;
    const scrollables =
      containerRef.current.querySelectorAll(".overflow-x-auto");
    for (const el of scrollables) {
      if (el.scrollWidth > el.clientWidth && el.scrollLeft > 0) {
        return true;
      }
    }
    return false;
  }, []);

  const canScrollRight = useCallback(() => {
    if (!containerRef.current) return false;
    const scrollables =
      containerRef.current.querySelectorAll(".overflow-x-auto");
    for (const el of scrollables) {
      if (
        el.scrollWidth > el.clientWidth &&
        el.scrollLeft + el.clientWidth < el.scrollWidth - 1
      ) {
        return true;
      }
    }
    return false;
  }, []);

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (canScrollRight()) return;
      goNext();
    },
    onSwipedRight: () => {
      if (isHorizontallyScrolled()) return;
      goPrev();
    },
    trackMouse: false,
    delta: 50,
  });

  if (error) {
    return (
      <div className="p-4 text-[var(--diff-del-line)] text-sm">
        Failed to load PR: {error}
      </div>
    );
  }

  if (loading && files.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[var(--text-secondary)]">Loading...</div>
      </div>
    );
  }

  if (!file) return null;

  return (
    <div
      {...handlers}
      ref={containerRef}
      onPointerUp={handleTap}
      className="min-h-screen"
    >
      {/* File indicator */}
      <div className="sticky top-[44px] z-10 flex items-center justify-between px-3 py-1.5 bg-[var(--bg-primary)] border-b border-[var(--border)]">
        <button
          onClick={() => currentIndex > 0 && setCurrentIndex(currentIndex - 1)}
          className={`px-2 py-1 rounded text-sm ${
            currentIndex > 0
              ? "text-[var(--accent)] active:opacity-80"
              : "text-[var(--bg-tertiary)]"
          }`}
        >
          ←
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => onToggleViewed(file.filename)}>
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
          <span className="text-xs text-[var(--text-secondary)]">
            {currentIndex + 1} / {files.length}
          </span>
        </div>
        <button
          onClick={() =>
            currentIndex < files.length - 1 && setCurrentIndex(currentIndex + 1)
          }
          className={`px-2 py-1 rounded text-sm ${
            currentIndex < files.length - 1
              ? "text-[var(--accent)] active:opacity-80"
              : "text-[var(--bg-tertiary)]"
          }`}
        >
          →
        </button>
      </div>

      {file.patch ? (
        <DiffView
          filename={file.filename}
          patch={file.patch}
          comments={comments}
          onAddComment={onAddComment}
          onRemoveComment={onRemoveComment}
          wordWrap={wordWrap}
          fontSize={fontSize}
        />
      ) : (
        <div className="p-4 text-center text-[var(--text-secondary)]">
          Binary file or diff unavailable
        </div>
      )}
    </div>
  );
}
