import { useEffect, useState } from "react";
import { fetchPRDetail, fetchPRFiles } from "../lib/github";
import type { FileChange, PRDetail } from "../types";

export interface PRData {
  pr: PRDetail | null;
  files: FileChange[];
  loading: boolean;
  error: string | null;
}

export function usePRData(
  owner: string | undefined,
  repo: string | undefined,
  number: number | undefined,
): PRData {
  const [pr, setPr] = useState<PRDetail | null>(null);
  const [files, setFiles] = useState<FileChange[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!owner || !repo || number === undefined) {
      setPr(null);
      setFiles([]);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchPRDetail(owner, repo, number),
      fetchPRFiles(owner, repo, number),
    ])
      .then(([p, f]) => {
        if (cancelled) return;
        setPr(p);
        setFiles(f);
      })
      .catch((e) => {
        if (cancelled) return;
        setPr(null);
        setFiles([]);
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [owner, repo, number]);

  return { pr, files, loading, error };
}
