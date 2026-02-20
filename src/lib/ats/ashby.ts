// ── Ashby JSON API fetcher ──
// Endpoint: POST https://api.ashbyhq.com/posting-api/job-board/{slug}
// No auth required. Returns job board info with postings.

import crypto from "crypto";
import { Job } from "../types";

interface AshbyJob {
  id: string;
  title: string;
  jobUrl: string;
  publishedAt: string;
  location: string;
  department: string;
  team: string;
}

export async function fetchAshby(slug: string): Promise<{ companyName: string; jobs: Job[] }> {
  const res = await fetch(
    `https://api.ashbyhq.com/posting-api/job-board/${slug}`,
    { next: { revalidate: 0 } }
  );
  if (!res.ok) throw new Error(`Ashby ${slug}: ${res.status}`);

  const data = await res.json();
  const companyName = data.jobBoard?.title || slug;

  const jobs: Job[] = (data.jobs || []).map((j: AshbyJob) => ({
    id: crypto.createHash("md5").update(`ab-${j.id}`).digest("hex").slice(0, 12),
    title: j.title,
    company: companyName,
    department: j.department || j.team,
    location: j.location,
    link: j.jobUrl,
    pubDate: j.publishedAt || new Date().toISOString(),
  }));

  return { companyName, jobs };
}
