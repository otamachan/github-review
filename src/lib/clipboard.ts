import type { PRDetail, PRListItem, ReviewComment } from "../types";

export function formatReviewMarkdown(
  pr: PRListItem | PRDetail,
  comments: ReviewComment[],
): string {
  if (comments.length === 0) return "";

  const grouped = new Map<string, ReviewComment[]>();
  for (const c of comments) {
    const list = grouped.get(c.filename) ?? [];
    list.push(c);
    grouped.set(c.filename, list);
  }

  const lines: string[] = [
    `## PR Review: ${pr.repo.full_name}#${pr.number} - ${pr.title}`,
    "",
  ];

  for (const [filename, fileComments] of grouped) {
    lines.push(`### ${filename}`);
    for (const c of fileComments.sort((a, b) => a.lineNumber - b.lineNumber)) {
      const prefix = c.side === "LEFT" ? "L(old)" : "L";
      lines.push(`- ${prefix}${c.lineNumber}: ${c.body}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
