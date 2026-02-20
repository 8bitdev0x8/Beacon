// ── RSS feed fetching and parsing ──
// Uses rss-parser to fetch any Greenhouse/Lever/SmartRecruiters/generic RSS feed
// and normalises each item into our Job type.

import RSSParser from "rss-parser";
import crypto from "crypto";
import { Job } from "./types";

const parser = new RSSParser();

// Generate a stable ID for a job so we can track seen/new status
function jobId(link: string, title: string): string {
  return crypto
    .createHash("md5")
    .update(`${link}|${title}`)
    .digest("hex")
    .slice(0, 12);
}

export async function fetchFeed(
  feedUrl: string
): Promise<{ companyName: string; jobs: Job[] }> {
  const feed = await parser.parseURL(feedUrl);

  const companyName =
    feed.title?.replace(/ - Jobs$| Careers$| Job Board$/i, "").trim() ||
    new URL(feedUrl).hostname;

  const jobs: Job[] = (feed.items || []).map((item) => ({
    id: jobId(item.link || feedUrl, item.title || ""),
    title: item.title || "Untitled",
    company: companyName,
    // Many ATS feeds put department in the category field
    department: item.categories?.[0] || undefined,
    // Lever puts location in content; Greenhouse in the title suffix
    location: extractLocation(item),
    link: item.link || feedUrl,
    pubDate: item.isoDate || item.pubDate || new Date().toISOString(),
  }));

  return { companyName, jobs };
}

// Best-effort location extraction from various ATS formats
function extractLocation(item: RSSParser.Item): string | undefined {
  // Greenhouse: "Software Engineer - New York"
  if (item.title?.includes(" - ")) {
    const parts = item.title.split(" - ");
    if (parts.length > 1) return parts[parts.length - 1].trim();
  }
  // Lever/SmartRecruiters: location in contentSnippet
  if (item.contentSnippet) {
    const match = item.contentSnippet.match(
      /(?:Location|Office):\s*(.+?)(?:\n|$)/i
    );
    if (match) return match[1].trim();
  }
  return undefined;
}
