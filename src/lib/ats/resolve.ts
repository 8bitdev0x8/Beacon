// ── ATS Resolver ──
// Given a company slug, tries each ATS platform until one succeeds.
// Returns the platform identifier (e.g. "greenhouse:discord") to store.

import { fetchGreenhouse } from "./greenhouse";
import { fetchLever } from "./lever";
import { fetchAshby } from "./ashby";
import { fetchSmartRecruiters } from "./smartrecruiters";
import { Job } from "../types";

export type ATSPlatform = "greenhouse" | "lever" | "ashby" | "smartrecruiters";

// Order matters — Greenhouse and Lever are the most common for tech companies
const PLATFORMS: { name: ATSPlatform; fetcher: (slug: string) => Promise<{ companyName: string; jobs: Job[] }> }[] = [
  { name: "greenhouse", fetcher: fetchGreenhouse },
  { name: "lever", fetcher: fetchLever },
  { name: "ashby", fetcher: fetchAshby },
  { name: "smartrecruiters", fetcher: fetchSmartRecruiters },
];

export interface ResolveResult {
  feedKey: string;     // e.g. "greenhouse:discord"
  platform: ATSPlatform;
  companyName: string;
  jobCount: number;
}

// Try each ATS platform for this slug and return the first that works
export async function resolveSlug(slug: string): Promise<ResolveResult | null> {
  const cleanSlug = slug.trim().toLowerCase().replace(/\s+/g, "-");

  for (const { name, fetcher } of PLATFORMS) {
    try {
      const { companyName, jobs } = await fetcher(cleanSlug);
      // Only count it as a match if the API actually returned data
      if (jobs.length > 0 || companyName !== cleanSlug) {
        return {
          feedKey: `${name}:${cleanSlug}`,
          platform: name,
          companyName,
          jobCount: jobs.length,
        };
      }
    } catch {
      // This platform didn't have this company — try next
    }
  }

  return null;
}

// Known ATS URL patterns → { platform, slug }
const ATS_URL_PATTERNS: { pattern: RegExp; platform: ATSPlatform }[] = [
  { pattern: /boards\.greenhouse\.io\/(\w[\w-]*)/, platform: "greenhouse" },
  { pattern: /jobs\.lever\.co\/(\w[\w-]*)/, platform: "lever" },
  { pattern: /jobs\.ashbyhq\.com\/(\w[\w-]*)/, platform: "ashby" },
  { pattern: /jobs\.smartrecruiters\.com\/(\w[\w-]*)/, platform: "smartrecruiters" },
];

// Try to extract an ATS platform and slug from a URL
export function parseATSUrl(url: string): { platform: ATSPlatform; slug: string } | null {
  for (const { pattern, platform } of ATS_URL_PATTERNS) {
    const match = url.match(pattern);
    if (match) {
      return { platform, slug: match[1].toLowerCase() };
    }
  }
  return null;
}

// Extract a likely company slug from a generic URL (last resort)
export function extractSlugFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    // Try pathname segments first (e.g. /company-name/careers)
    const segments = u.pathname.split("/").filter(Boolean);
    if (segments.length > 0) {
      // Use first meaningful segment, clean it
      const candidate = segments[0].toLowerCase().replace(/[^a-z0-9-]/g, "");
      if (candidate.length >= 2 && !["jobs", "careers", "job", "career", "apply", "www"].includes(candidate)) {
        return candidate;
      }
      // Try second segment if first was generic
      if (segments.length > 1) {
        const alt = segments[1].toLowerCase().replace(/[^a-z0-9-]/g, "");
        if (alt.length >= 2) return alt;
      }
    }
    // Fall back to hostname subdomain or name
    const hostParts = u.hostname.replace("www.", "").split(".");
    if (hostParts.length >= 2) {
      return hostParts[0].toLowerCase();
    }
  } catch {
    // Invalid URL
  }
  return null;
}

export type DetectType = "rss" | "ats" | "scrape";

export interface SmartDetectResult {
  feedKey: string;
  type: DetectType;
  platform?: ATSPlatform;
  companyName?: string;
  jobCount?: number;
}

// Smart URL detection: parse ATS URL → try RSS → try ATS slug → scrape page
export async function smartDetect(url: string): Promise<SmartDetectResult | null> {
  // 1. Check if URL matches a known ATS board pattern
  const atsMatch = parseATSUrl(url);
  if (atsMatch) {
    const fetchers: Record<ATSPlatform, (slug: string) => Promise<{ companyName: string; jobs: Job[] }>> = {
      greenhouse: fetchGreenhouse,
      lever: fetchLever,
      ashby: fetchAshby,
      smartrecruiters: fetchSmartRecruiters,
    };
    try {
      const result = await fetchers[atsMatch.platform](atsMatch.slug);
      return {
        feedKey: `${atsMatch.platform}:${atsMatch.slug}`,
        type: "ats",
        platform: atsMatch.platform,
        companyName: result.companyName,
        jobCount: result.jobs.length,
      };
    } catch {
      // ATS URL matched pattern but fetch failed — continue to RSS
    }
  }

  // 2. Try RSS
  try {
    const { fetchFeed } = await import("../rss");
    const result = await fetchFeed(url);
    if (result.jobs.length > 0) {
      return { feedKey: url, type: "rss", companyName: result.companyName, jobCount: result.jobs.length };
    }
  } catch {
    // RSS failed — try ATS fallback
  }

  // 3. Try extracting a slug and auto-detecting ATS platform
  const slug = extractSlugFromUrl(url);
  if (slug) {
    const resolved = await resolveSlug(slug);
    if (resolved) {
      return {
        feedKey: resolved.feedKey,
        type: "ats",
        platform: resolved.platform,
        companyName: resolved.companyName,
        jobCount: resolved.jobCount,
      };
    }
  }

  // 4. Last resort: scrape the page for job links
  try {
    const { scrapeCareersPage } = await import("../scraper");
    const result = await scrapeCareersPage(url);
    if (result.jobs.length > 0) {
      return {
        feedKey: `scrape:${url}`,
        type: "scrape",
        companyName: result.companyName,
        jobCount: result.jobs.length,
      };
    }
  } catch {
    // Scraping failed too
  }

  return null;
}

// Parse a stored feed key to determine how to fetch it
export function parseFeedKey(
  feedKey: string
): { type: "rss"; url: string } | { type: "ats"; platform: ATSPlatform; slug: string } | { type: "scrape"; url: string } {
  // scrape:https://... format
  if (feedKey.startsWith("scrape:")) {
    return { type: "scrape", url: feedKey.slice(7) };
  }
  const colonIdx = feedKey.indexOf(":");
  if (colonIdx === -1 || feedKey.startsWith("http://") || feedKey.startsWith("https://")) {
    return { type: "rss", url: feedKey };
  }
  const platform = feedKey.slice(0, colonIdx) as ATSPlatform;
  const slug = feedKey.slice(colonIdx + 1);
  if (["greenhouse", "lever", "ashby", "smartrecruiters"].includes(platform)) {
    return { type: "ats", platform, slug };
  }
  // Unrecognised prefix — treat as RSS URL
  return { type: "rss", url: feedKey };
}

// Fetch jobs for any stored feed key (RSS URL, ATS key, or scrape URL)
export async function fetchByKey(feedKey: string): Promise<{ companyName: string; jobs: Job[] }> {
  const parsed = parseFeedKey(feedKey);
  if (parsed.type === "scrape") {
    const { scrapeCareersPage } = await import("../scraper");
    return scrapeCareersPage(parsed.url);
  }
  if (parsed.type === "rss") {
    const { fetchFeed } = await import("../rss");
    return fetchFeed(parsed.url);
  }
  // ATS platform fetch
  const platformFetchers: Record<ATSPlatform, (slug: string) => Promise<{ companyName: string; jobs: Job[] }>> = {
    greenhouse: fetchGreenhouse,
    lever: fetchLever,
    ashby: fetchAshby,
    smartrecruiters: fetchSmartRecruiters,
  };
  return platformFetchers[parsed.platform](parsed.slug);
}
