# GitHub Review

A mobile-friendly Pull Request reviewer, built as a PWA.

Live: https://otamachan.github.io/github-review/

## Motivation

Coding with AI agents on a phone works well — until it comes time to review the pull request. GitHub's web UI for diffs is hard to use on a small screen: small tap targets, horizontal scrolling, comment inputs that are hard to hit, no quick way to jump between files.

This app is a focused alternative for that one step: **reviewing PRs from a phone**, then handing the feedback back to an agent. All diffs for a PR are shown on a single scrollable page with large tap targets, so reviewing is just scrolling and tapping.

## Features

- **PR list** — your own PRs and PRs where you are requested as a reviewer. Cached in `localStorage` so the last list appears instantly on open.
- **All-diffs-on-one-page view** — every changed file's diff is rendered on a single scrollable page with sticky file headers. Unchanged hunks collapse; changed lines get syntax highlighting via `highlight.js`. Font size and line-wrap are adjustable from the header.
- **Viewed-file checkboxes** — mark files as viewed to keep track of progress across a long PR.
- **Inline comments** — tap a line to leave a comment. Comments live in memory during the review session.
- **Export as Markdown** — one tap copies the whole review (grouped by file, with line numbers) to the clipboard, ready to paste into a coding agent.
- **Post review to GitHub** — or skip the clipboard and submit the review directly as Comment, Approve, or Request changes.
- **Dark / light / auto theme** — toggle from the header.
- **PWA** — installable to the home screen, launches standalone without browser chrome, and remembers your token between sessions.

## Authentication

Authentication is a GitHub **Personal Access Token** (PAT) that you paste in once. The token is stored in `localStorage` on your device and never sent anywhere except to `api.github.com`. Required scope: `repo`.

To create a token: GitHub → Settings → Developer settings → Personal access tokens.

## Development

```sh
npm install
npm run dev
```

Build:

```sh
npm run build
npm run preview
```

## Deployment

The app is built as a static site with `base: "/github-review/"` and is intended to be hosted on GitHub Pages. `404.html` is generated from `index.html` at build time so that direct URL access works for client-side routing.
