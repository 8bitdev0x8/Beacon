// ── JSON Pipeline processor ──
// Fetches a JSON URL containing employer data, then checks each
// employer's career page for job listings using the smart detection cascade.

import { Employer, EmployerResult, Job } from "./types";
import { smartDetect } from "./ats/resolve";
import { readStore } from "./storage";

// Convert GitHub blob URLs to raw URLs
function toRawUrl(url: string): string {
  const ghMatch = url.match(
    /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/
  );
  if (ghMatch) {
    return `https://raw.githubusercontent.com/${ghMatch[1]}/${ghMatch[2]}/${ghMatch[3]}`;
  }
  return url;
}

// Fetch and parse the JSON source
export async function fetchPipelineJson(url: string): Promise<Employer[]> {
  const rawUrl = toRawUrl(url);
  const res = await fetch(rawUrl, {
    signal: AbortSignal.timeout(15000),
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${rawUrl}`);
  const data = await res.json();

  if (!Array.isArray(data)) throw new Error("Expected a JSON array");

  // Validate and normalize
  return data
    .filter((item: unknown) => {
      if (typeof item !== "object" || item === null) return false;
      const obj = item as Record<string, unknown>;
      return typeof obj.employer_name === "string";
    })
    .map((item: Record<string, unknown>) => ({
      employer_name: item.employer_name as string,
      permits_total: typeof item.permits_total === "number" ? item.permits_total : 0,
      career_page: typeof item.career_page === "string" ? item.career_page : null,
    }));
}

// Process a single employer — check their career page for jobs
async function processEmployer(employer: Employer, seenIds: Set<string>): Promise<EmployerResult> {
  if (!employer.career_page) {
    return {
      ...employer,
      jobs: [],
      jobCount: 0,
      status: "no_career_page",
    };
  }

  try {
    const detected = await smartDetect(employer.career_page);
    if (!detected) {
      return { ...employer, jobs: [], jobCount: 0, status: "no_jobs" };
    }

    // Fetch the actual jobs using fetchByKey
    const { fetchByKey } = await import("./ats/resolve");
    const result = await fetchByKey(detected.feedKey);

    // Pipeline shows ALL jobs (no tech filter — these are user-specified employers)
    const jobs: Job[] = result.jobs.map((j) => ({
      ...j,
      company: employer.employer_name,
      isNew: !seenIds.has(j.id),
    }));

    return {
      ...employer,
      jobs,
      jobCount: jobs.length,
      status: jobs.length > 0 ? "ok" : "no_jobs",
    };
  } catch (err) {
    return {
      ...employer,
      jobs: [],
      jobCount: 0,
      status: "error",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// Process all employers from a pipeline URL
export async function processPipeline(url: string): Promise<{
  employers: EmployerResult[];
  totalJobs: number;
  withCareerPage: number;
  withJobs: number;
}> {
  const employers = await fetchPipelineJson(url);
  const store = readStore();
  const seenIds = new Set(store.seenJobIds);

  // Process employers with career pages in parallel (limit concurrency)
  const withPage = employers.filter((e) => e.career_page);
  const withoutPage = employers.filter((e) => !e.career_page);

  // Process in batches of 5 to avoid overwhelming external APIs
  const BATCH_SIZE = 5;
  const results: EmployerResult[] = [];

  for (let i = 0; i < withPage.length; i += BATCH_SIZE) {
    const batch = withPage.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map((e) => processEmployer(e, seenIds))
    );
    for (const r of batchResults) {
      results.push(
        r.status === "fulfilled"
          ? r.value
          : { employer_name: "Unknown", permits_total: 0, career_page: null, jobs: [], jobCount: 0, status: "error", error: "Processing failed" }
      );
    }
  }

  // Add employers without career pages
  for (const e of withoutPage) {
    results.push({ ...e, jobs: [], jobCount: 0, status: "no_career_page" });
  }

  // Sort: employers with jobs first, then by job count desc
  results.sort((a, b) => b.jobCount - a.jobCount);

  const totalJobs = results.reduce((sum, e) => sum + e.jobCount, 0);
  const withJobs = results.filter((e) => e.jobCount > 0).length;

  return {
    employers: results,
    totalJobs,
    withCareerPage: withPage.length,
    withJobs,
  };
}
