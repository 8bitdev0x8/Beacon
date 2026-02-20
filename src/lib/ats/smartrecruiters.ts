// ── SmartRecruiters JSON API fetcher ──
// Endpoint: https://api.smartrecruiters.com/v1/companies/{slug}/postings
// No auth required. Returns paginated job postings.

import crypto from "crypto";
import { Job } from "../types";

interface SRPosting {
  id: string;
  name: string;
  ref: string;
  releasedDate: string;
  location: { city?: string; country?: string; region?: string };
  department: { label?: string };
  company: { name?: string };
}

export async function fetchSmartRecruiters(slug: string): Promise<{ companyName: string; jobs: Job[] }> {
  const res = await fetch(
    `https://api.smartrecruiters.com/v1/companies/${slug}/postings?limit=100`,
    { next: { revalidate: 0 } }
  );
  if (!res.ok) throw new Error(`SmartRecruiters ${slug}: ${res.status}`);

  const data = await res.json();
  const postings: SRPosting[] = data.content || [];
  const companyName = postings[0]?.company?.name || slug;

  const jobs: Job[] = postings.map((p) => ({
    id: crypto.createHash("md5").update(`sr-${p.id}`).digest("hex").slice(0, 12),
    title: p.name,
    company: companyName,
    department: p.department?.label,
    location: [p.location?.city, p.location?.country].filter(Boolean).join(", ") || undefined,
    link: p.ref || `https://jobs.smartrecruiters.com/${slug}/${p.id}`,
    pubDate: p.releasedDate || new Date().toISOString(),
  }));

  return { companyName, jobs };
}
