// ── Greenhouse JSON API fetcher ──
// Endpoint: https://boards-api.greenhouse.io/v1/boards/{slug}/jobs
// No auth required. Returns structured job data with departments and locations.

import crypto from "crypto";
import { Job } from "../types";

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  updated_at: string;
  location: { name: string };
  departments: { name: string }[];
}

export async function fetchGreenhouse(slug: string): Promise<{ companyName: string; jobs: Job[] }> {
  const res = await fetch(
    `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=false`,
    { next: { revalidate: 0 } }
  );
  if (!res.ok) throw new Error(`Greenhouse ${slug}: ${res.status}`);

  const data = await res.json();
  const companyName = data.meta?.name || slug;

  const jobs: Job[] = (data.jobs || []).map((j: GreenhouseJob) => ({
    id: crypto.createHash("md5").update(`gh-${j.id}`).digest("hex").slice(0, 12),
    title: j.title,
    company: companyName,
    department: j.departments?.[0]?.name,
    location: j.location?.name,
    link: j.absolute_url,
    pubDate: j.updated_at || new Date().toISOString(),
  }));

  return { companyName, jobs };
}
