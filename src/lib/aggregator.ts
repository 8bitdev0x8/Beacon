// ── Central aggregator ──
// Fetches all monitored feeds (RSS URLs or ATS platform:slug keys),
// filters for tech jobs, and annotates each company with new-job
// counts and pin/save status.

import { fetchByKey } from "./ats/resolve";
import { filterTechJobs } from "./filter";
import { readStore } from "./storage";
import { CompanyFeed, Job } from "./types";

export async function aggregateAllFeeds(): Promise<CompanyFeed[]> {
  const store = readStore();
  const seenSet = new Set(store.seenJobIds);

  // Fetch all feeds in parallel; if one fails, skip it gracefully
  const results = await Promise.allSettled(
    store.feeds.map(async (feedKey) => {
      const { companyName, jobs } = await fetchByKey(feedKey);
      const techJobs = filterTechJobs(jobs);

      // Sort newest first
      techJobs.sort(
        (a, b) =>
          new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
      );

      // Mark which jobs are new (not in seenJobIds)
      const annotated: Job[] = techJobs.map((j) => ({
        ...j,
        isNew: !seenSet.has(j.id),
      }));

      const feed: CompanyFeed = {
        name: companyName,
        feedUrl: feedKey,
        jobs: annotated,
        newJobCount: annotated.filter((j) => j.isNew).length,
        isPinned: store.pinnedFeeds.includes(feedKey),
        isSaved: store.savedFeeds.includes(feedKey),
        lastFetched: new Date().toISOString(),
      };
      return feed;
    })
  );

  const feeds: CompanyFeed[] = results
    .filter(
      (r): r is PromiseFulfilledResult<CompanyFeed> => r.status === "fulfilled"
    )
    .map((r) => r.value);

  // Pinned companies float to the top, then sort by new job count
  feeds.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return b.newJobCount - a.newJobCount;
  });

  return feeds;
}
