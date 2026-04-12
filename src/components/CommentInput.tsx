import { useState, useRef, useEffect } from "react";

export default function CommentInput({
  lineNumber,
  onSubmit,
  onCancel,
}: {
  lineNumber: number;
  onSubmit: (body: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--accent)] rounded-lg mx-2 my-1 p-2">
      <div className="text-xs text-[var(--text-secondary)] mb-1">
        Comment on L{lineNumber}
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            handleSubmit();
          }
        }}
        rows={2}
        className="w-full bg-[var(--bg-tertiary)] text-sm text-[var(--text-primary)] rounded p-2 outline-none resize-none border border-[var(--border)] focus:border-[var(--accent)]"
        placeholder="Enter a comment... (Ctrl+Enter to add)"
      />
      <div className="flex justify-end gap-2 mt-1">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] active:opacity-80"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="px-3 py-1.5 text-xs rounded bg-[var(--accent)] text-white font-medium active:opacity-80"
        >
          Add
        </button>
      </div>
    </div>
  );
}
