// ── Generic careers page scraper ──
// Fetches any URL, parses HTML for job-like links, and returns Job[].
// Used as a last-resort when RSS and ATS detection both fail.

import crypto from "crypto";
import { Job } from "./types";

function jobId(link: string, title: string): string {
  return crypto
    .createHash("md5")
    .update(`${link}|${title}`)
    .digest("hex")
    .slice(0, 12);
}

// Patterns that indicate a link is a job posting
const JOB_PATH_PATTERNS = [
  /\/jobs?\//i,
  /\/careers?\//i,
  /\/positions?\//i,
  /\/openings?\//i,
  /\/vacancies?\//i,
  /\/apply\//i,
  /\/role\//i,
  /\/posting\//i,
  /\/opportunity\//i,
];

// Words that suggest a link is NOT a job (navigation, footer, etc.)
const EXCLUDE_PATTERNS = [
  /^(home|about|contact|blog|faq|privacy|terms|login|sign)/i,
  /\.(png|jpg|jpeg|gif|svg|css|js|pdf)$/i,
];

// Common job title keywords to boost confidence
const TITLE_KEYWORDS =
  /engineer|developer|designer|manager|analyst|scientist|architect|lead|director|coordinator|specialist|associate|intern|consultant|strategist|writer|recruiter|administrator|executive/i;

interface ScrapedLink {
  href: string;
  text: string;
}

function extractLinks(html: string, baseUrl: string): ScrapedLink[] {
  const links: ScrapedLink[] = [];
  // Match <a> tags with href and inner text
  const anchorRe = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = anchorRe.exec(html)) !== null) {
    let href = match[1].trim();
    // Strip HTML tags from link text
    const text = match[2].replace(/<[^>]*>/g, "").trim();

    if (!href || !text || text.length < 3 || text.length > 200) continue;

    // Skip mailto, tel, javascript, anchors
    if (/^(mailto:|tel:|javascript:|#)/.test(href)) continue;

    // Resolve relative URLs
    try {
      href = new URL(href, baseUrl).href;
    } catch {
      continue;
    }

    // Skip excluded patterns
    if (EXCLUDE_PATTERNS.some((p) => p.test(text) || p.test(href))) continue;

    links.push({ href, text });
  }

  return links;
}

function scoreLink(link: ScrapedLink): number {
  let score = 0;

  // URL path looks job-related
  if (JOB_PATH_PATTERNS.some((p) => p.test(link.href))) score += 3;

  // Link text contains job title keywords
  if (TITLE_KEYWORDS.test(link.text)) score += 3;

  // Reasonable title length (not too short, not a sentence)
  if (link.text.length >= 8 && link.text.length <= 100) score += 1;

  // Contains a dash or pipe (common in "Title - Location" format)
  if (/[–—|-]/.test(link.text)) score += 1;

  return score;
}

// Try to extract location from a job title like "Software Engineer - New York"
function extractLocation(title: string): string | undefined {
  const separators = [" - ", " — ", " – ", " | ", " · "];
  for (const sep of separators) {
    if (title.includes(sep)) {
      const parts = title.split(sep);
      const last = parts[parts.length - 1].trim();
      // If last part is short and doesn't look like a job title, it's probably a location
      if (last.length <= 50 && !TITLE_KEYWORDS.test(last)) {
        return last;
      }
    }
  }
  return undefined;
}

export async function scrapeCareersPage(
  url: string
): Promise<{ companyName: string; jobs: Job[] }> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; JobAggregator/1.0; +http://localhost)",
      Accept: "text/html",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }

  const html = await res.text();

  // Extract company name from <title> tag
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const pageTitle = titleMatch
    ? titleMatch[1].replace(/&[^;]+;/g, " ").trim()
    : "";
  const companyName =
    pageTitle
      .replace(/\s*[-–—|·]\s*(careers?|jobs?|openings?|positions?|hiring).*/i, "")
      .replace(/(careers?|jobs?|openings?|positions?|hiring)\s*[-–—|·]\s*/i, "")
      .trim() || new URL(url).hostname.replace("www.", "").split(".")[0];

  // Extract and score all links
  const allLinks = extractLinks(html, url);
  const scoredLinks = allLinks
    .map((link) => ({ ...link, score: scoreLink(link) }))
    .filter((l) => l.score >= 3) // Require at least one strong signal
    .sort((a, b) => b.score - a.score);

  // Deduplicate by href
  const seen = new Set<string>();
  const uniqueLinks = scoredLinks.filter((l) => {
    if (seen.has(l.href)) return false;
    seen.add(l.href);
    return true;
  });

  const jobs: Job[] = uniqueLinks.map((link) => {
    const location = extractLocation(link.text);
    const title = location
      ? link.text.slice(0, link.text.lastIndexOf(location)).replace(/[\s\-–—|·]+$/, "").trim()
      : link.text;

    return {
      id: jobId(link.href, title),
      title: title || link.text,
      company: companyName,
      location,
      link: link.href,
      pubDate: new Date().toISOString(),
    };
  });

  if (jobs.length === 0) {
    throw new Error("No job listings found on this page");
  }

  return { companyName, jobs };
}
