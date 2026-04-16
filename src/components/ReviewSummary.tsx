import { useState } from "react";
import { copyToClipboard, formatReviewMarkdown } from "../lib/clipboard";
import { postReview } from "../lib/github";
import type { PRItem, ReviewComment } from "../types";

export default function ReviewSummary({
  pr,
  comments,
  onClear,
}: {
  pr: PRItem;
  comments: ReviewComment[];
  onClear: () => void;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const [showPreview, setShowPreview] = useState(false);
  const [showPost, setShowPost] = useState(false);
  const [postBody, setPostBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");

  if (comments.length === 0) return null;

  const markdown = formatReviewMarkdown(pr, comments);

  const handleCopy = async () => {
    const ok = await copyToClipboard(markdown);
    setCopyState(ok ? "copied" : "failed");
    setTimeout(() => setCopyState("idle"), 2000);
  };

  const handlePost = async (
    event: "COMMENT" | "APPROVE" | "REQUEST_CHANGES",
  ) => {
    setPosting(true);
    setPostError("");
    try {
      await postReview(
        pr.repo.owner,
        pr.repo.name,
        pr.number,
        postBody,
        comments,
        event,
      );
      onClear();
      setPostBody("");
      setShowPost(false);
    } catch (e) {
      setPostError(e instanceof Error ? e.message : String(e));
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[var(--bg-secondary)] border-t border-[var(--border)] px-4 py-3 z-20">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setShowPreview((v) => !v)}
          className="text-sm text-[var(--text-secondary)] active:opacity-80 flex items-center gap-1"
        >
          <span>
            {comments.length} comment{comments.length === 1 ? "" : "s"}
          </span>
          <span className="text-xs">{showPreview ? "▼" : "▶"}</span>
        </button>
        <div className="flex gap-2">
          <button
            onClick={onClear}
            className="px-3 py-1.5 text-xs rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] active:opacity-80"
          >
            Clear
          </button>
          <button
            onClick={handleCopy}
            className={`px-3 py-1.5 text-xs rounded active:opacity-80 ${
              copyState === "failed"
                ? "bg-[var(--diff-del-line)] text-white"
                : "bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
            }`}
          >
            {copyState === "copied"
              ? "Copied"
              : copyState === "failed"
                ? "Copy failed"
                : "Copy"}
          </button>
          <button
            onClick={() => setShowPost((v) => !v)}
            className={`px-3 py-1.5 text-xs rounded font-medium active:opacity-80 ${
              showPost
                ? "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                : "bg-[var(--accent)] text-white"
            }`}
          >
            {showPost ? "Cancel" : "Submit"}
          </button>
        </div>
      </div>
      {showPreview && (
        <pre className="mt-2 p-2 bg-[var(--bg-tertiary)] rounded text-xs text-[var(--text-primary)] whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
          {markdown}
        </pre>
      )}
      {showPost && (
        <div className="mt-2 p-2 bg-[var(--bg-tertiary)] rounded">
          <textarea
            value={postBody}
            onChange={(e) => setPostBody(e.target.value)}
            placeholder="Overall review comment (optional)"
            rows={2}
            className="w-full bg-[var(--bg-primary)] text-xs text-[var(--text-primary)] rounded p-2 outline-none resize-none border border-[var(--border)] focus:border-[var(--accent)]"
          />
          {postError && (
            <p className="mt-1 text-[var(--diff-del-line)] text-xs">
              {postError}
            </p>
          )}
          <div className="flex gap-1 mt-2">
            <button
              onClick={() => handlePost("COMMENT")}
              disabled={posting}
              className="flex-1 py-1.5 text-xs rounded bg-[var(--bg-primary)] text-[var(--text-primary)] active:opacity-80 disabled:opacity-50"
            >
              Comment
            </button>
            <button
              onClick={() => handlePost("APPROVE")}
              disabled={posting}
              className="flex-1 py-1.5 text-xs rounded bg-[var(--diff-add-line)] text-white font-medium active:opacity-80 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={() => handlePost("REQUEST_CHANGES")}
              disabled={posting}
              className="flex-1 py-1.5 text-xs rounded bg-[var(--diff-del-line)] text-white font-medium active:opacity-80 disabled:opacity-50"
            >
              Request changes
            </button>
          </div>
          {posting && (
            <p className="mt-1 text-xs text-[var(--text-secondary)] text-center">
              Submitting...
            </p>
          )}
        </div>
      )}
    </div>
  );
}
