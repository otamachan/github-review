import { useState } from "react";
import { Octokit } from "@octokit/rest";
import { setToken } from "../lib/github";

export default function TokenInput({ onAuth }: { onAuth: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;

    setToken(trimmed);
    try {
      const client = new Octokit({ auth: trimmed });
      await client.users.getAuthenticated();
      onAuth();
    } catch {
      setError("Authentication failed. Please check your token.");
      setToken("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4"
        action="#"
        method="post"
      >
        <h1 className="text-2xl font-bold text-center">GitHub Review</h1>
        <p className="text-[var(--text-secondary)] text-sm text-center">
          Enter your GitHub Personal Access Token.
          <br />
          The <code className="text-xs">repo</code> scope is required.
        </p>
        {/* Hidden username field helps password managers associate the credential */}
        <input
          type="text"
          name="username"
          value="github-pat"
          autoComplete="username"
          readOnly
          hidden
        />
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError("");
          }}
          placeholder="ghp_xxxxxxxxxxxx"
          className="w-full px-3 py-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] text-base outline-none focus:border-[var(--accent)]"
          autoFocus
        />
        {error && <p className="text-[var(--diff-del-line)] text-sm">{error}</p>}
        <button
          type="submit"
          className="w-full py-3 rounded-lg bg-[var(--accent)] text-white font-medium text-base active:opacity-80"
        >
          Log in
        </button>
      </form>
    </div>
  );
}
