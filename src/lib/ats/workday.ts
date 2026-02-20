// ── Workday JSON API fetcher ──
// Endpoint: POST https://{company}.{dc}.myworkdayjobs.com/wday/cxs/{company}/{site}/jobs
// No auth required. Returns paginated job listings.

import crypto from "crypto";
import { Job } from "../types";

interface WorkdayJobPosting {
  title: string;
  externalPath: string;
  locationsText: string;
  postedOn: string;
  bulletFields: string[];
}

interface WorkdayResponse {
  total: number;
  jobPostings: WorkdayJobPosting[];
}

// Parse a Workday URL into its components
// e.g. "https://analogdevices.wd1.myworkdayjobs.com/External"
// → { company: "analogdevices", dc: "wd1", site: "External" }
export function parseWorkdayUrl(url: string): {
  company: string;
  dc: string;
  site: string;
  baseUrl: string;
} | null {
  const match = url.match(
    /^https?:\/\/([a-z0-9_-]+)\.(wd\d+)\.myworkdayjobs\.com\/(?:en-US\/)?([^/?#]+)/i
  );
  if (!match) return null;
  const [, company, dc, site] = match;
  return {
    company: company.toLowerCase(),
    dc: dc.toLowerCase(),
    site,
    baseUrl: `https://${company.toLowerCase()}.${dc.toLowerCase()}.myworkdayjobs.com`,
  };
}

// Workday uses a "slug" format: "company.dc.site"
// e.g. "analogdevices.wd1.External"
export async function fetchWorkday(slug: string): Promise<{ companyName: string; jobs: Job[] }> {
  const parts = slug.split(".");
  if (parts.length !== 3) throw new Error(`Invalid Workday slug: ${slug}`);
  const [company, dc, site] = parts;
  const baseUrl = `https://${company}.${dc}.myworkdayjobs.com`;
  const apiUrl = `${baseUrl}/wday/cxs/${company}/${site}/jobs`;

  const allJobs: Job[] = [];
  let offset = 0;
  const limit = 20;
  let total = Infinity;

  // Fetch pages until we have all jobs (cap at 200 to be safe)
  while (offset < total && offset < 200) {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appliedFacets: {},
        limit,
        offset,
        searchText: "",
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) throw new Error(`Workday ${slug}: ${res.status}`);

    const data: WorkdayResponse = await res.json();
    total = data.total;

    for (const j of data.jobPostings) {
      const link = `${baseUrl}/en-US/${site}${j.externalPath}`;
      allJobs.push({
        id: crypto.createHash("md5").update(`wd-${j.externalPath}`).digest("hex").slice(0, 12),
        title: j.title,
        company,
        location: j.locationsText,
        link,
        pubDate: new Date().toISOString(),
      });
    }

    offset += limit;
  }

  // Derive a readable company name from the slug
  const companyName = company
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return { companyName, jobs: allJobs };
}
