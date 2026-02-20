// ── Lever JSON API fetcher ──
// Endpoint: https://api.lever.co/v0/postings/{slug}
// No auth required. Returns an array of postings with categories.

import crypto from "crypto";
import { Job } from "../types";

interface LeverPosting {
  id: string;
  text: string;
  hostedUrl: string;
  createdAt: number;
  categories: {
    team?: string;
    location?: string;
    commitment?: string;
    department?: string;
  };
}

export async function fetchLever(slug: string): Promise<{ companyName: string; jobs: Job[] }> {
  const res = await fetch(
    `https://api.lever.co/v0/postings/${slug}`,
    { next: { revalidate: 0 } }
  );
  if (!res.ok) throw new Error(`Lever ${slug}: ${res.status}`);

  const postings: LeverPosting[] = await res.json();
  // Lever doesn't return a company name in the response; derive from slug
  const companyName = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");

  const jobs: Job[] = postings.map((p) => ({
    id: crypto.createHash("md5").update(`lv-${p.id}`).digest("hex").slice(0, 12),
    title: p.text,
    company: companyName,
    department: p.categories?.team || p.categories?.department,
    location: p.categories?.location,
    link: p.hostedUrl,
    pubDate: new Date(p.createdAt).toISOString(),
  }));

  return { companyName, jobs };
}
