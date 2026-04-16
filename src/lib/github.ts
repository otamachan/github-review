import { Octokit } from "@octokit/rest";
import type { FileChange, PRItem, ReviewComment } from "../types";

const TOKEN_KEY = "github-review-pat";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function createClient(): Octokit {
  const token = getToken();
  if (!token) throw new Error("No token");
  return new Octokit({ auth: token });
}

export type PRFilter = "mine" | "review";

export async function fetchMyPRs(filter: PRFilter = "mine"): Promise<PRItem[]> {
  const client = createClient();
  const user = await client.users.getAuthenticated();
  const login = user.data.login;

  const query =
    filter === "mine"
      ? `is:pr is:open author:${login}`
      : `is:pr is:open review-requested:${login}`;

  const result = await client.search.issuesAndPullRequests({
    q: query,
    sort: "updated",
    order: "desc",
    per_page: 30,
  });

  const seen = new Set<number>();
  const all: PRItem[] = [];

  for (const item of result.data.items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);

    const repoUrl = item.repository_url;
    const parts = repoUrl.split("/");
    const owner = parts[parts.length - 2]!;
    const repo = parts[parts.length - 1]!;

    all.push({
      id: item.id,
      number: item.number,
      title: item.title,
      state: item.state,
      draft: item.draft ?? false,
      user: {
        login: item.user?.login ?? "",
        avatar_url: item.user?.avatar_url ?? "",
      },
      created_at: item.created_at,
      updated_at: item.updated_at,
      additions: 0,
      deletions: 0,
      changed_files: 0,
      html_url: item.html_url,
      body: item.body ?? null,
      labels: (item.labels ?? []).map((l) => ({
        name: typeof l === "string" ? l : (l.name ?? ""),
        color: typeof l === "string" ? "8b949e" : (l.color ?? "8b949e"),
      })),
      head: { ref: "" },
      base: { ref: "" },
      repo: { owner, name: repo, full_name: `${owner}/${repo}` },
    });
  }

  all.sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );

  return all;
}

export async function fetchPRStats(
  owner: string,
  repo: string,
  number: number,
): Promise<{ additions: number; deletions: number; changed_files: number }> {
  const client = createClient();
  const { data } = await client.pulls.get({ owner, repo, pull_number: number });
  return {
    additions: data.additions,
    deletions: data.deletions,
    changed_files: data.changed_files,
  };
}

export async function fetchPRDetail(
  owner: string,
  repo: string,
  number: number,
): Promise<PRItem> {
  const client = createClient();
  const { data } = await client.pulls.get({ owner, repo, pull_number: number });
  return {
    id: data.id,
    number: data.number,
    title: data.title,
    state: data.state,
    draft: data.draft ?? false,
    user: {
      login: data.user?.login ?? "",
      avatar_url: data.user?.avatar_url ?? "",
    },
    created_at: data.created_at,
    updated_at: data.updated_at,
    additions: data.additions,
    deletions: data.deletions,
    changed_files: data.changed_files,
    html_url: data.html_url,
    body: data.body,
    labels: (data.labels ?? []).map((l) => ({
      name: l.name ?? "",
      color: l.color ?? "8b949e",
    })),
    head: { ref: data.head.ref },
    base: { ref: data.base.ref },
    repo: {
      owner,
      name: repo,
      full_name: `${owner}/${repo}`,
    },
  };
}

export async function fetchPRFiles(
  owner: string,
  repo: string,
  number: number,
): Promise<FileChange[]> {
  const client = createClient();
  // Paginate so large PRs (>100 changed files) are fully loaded instead of
  // silently truncated. GitHub caps listFiles at 3000 total files per PR.
  const data = await client.paginate(client.pulls.listFiles, {
    owner,
    repo,
    pull_number: number,
    per_page: 100,
  });
  return data.map((f) => ({
    filename: f.filename,
    status: f.status,
    additions: f.additions,
    deletions: f.deletions,
    patch: f.patch,
  }));
}

export async function postReview(
  owner: string,
  repo: string,
  number: number,
  body: string,
  comments: ReviewComment[],
  event: "COMMENT" | "APPROVE" | "REQUEST_CHANGES" = "COMMENT",
): Promise<void> {
  const client = createClient();
  await client.pulls.createReview({
    owner,
    repo,
    pull_number: number,
    event,
    body: body || undefined,
    comments: comments.map((c) => ({
      path: c.filename,
      line: c.lineNumber,
      side: c.side,
      body: c.body,
    })),
  });
}
