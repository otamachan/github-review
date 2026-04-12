import { useState, useCallback } from "react";
import type { ReviewComment } from "../types";

export function useReviewComments() {
  const [comments, setComments] = useState<ReviewComment[]>([]);

  const addComment = useCallback(
    (
      filename: string,
      lineNumber: number,
      side: "LEFT" | "RIGHT",
      body: string,
    ) => {
      setComments((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          filename,
          lineNumber,
          side,
          body,
          createdAt: Date.now(),
        },
      ]);
    },
    [],
  );

  const removeComment = useCallback((id: string) => {
    setComments((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const clearComments = useCallback(() => {
    setComments([]);
  }, []);

  return { comments, addComment, removeComment, clearComments };
}
