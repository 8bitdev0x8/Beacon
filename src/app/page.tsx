// ── Home Page (Server Component) ──
// Fetches feeds server-side, reads pipeline URLs from store,
// then passes everything to the client-side TabShell.

import TabShell from "@/components/TabShell";
import { aggregateAllFeeds } from "@/lib/aggregator";
import { markJobsSeen, readStore } from "@/lib/storage";

// Disable caching so we always get fresh job data
export const dynamic = "force-dynamic";

export default async function HomePage() {
  let storedFeedUrls: string[] = [];
  let storedPipelineUrls: string[] = [];
  let feeds: Awaited<ReturnType<typeof aggregateAllFeeds>> = [];

  try {
    const store = readStore();
    storedFeedUrls = store.feeds ?? [];
    storedPipelineUrls = store.pipelineUrls ?? [];
  } catch (err) {
    console.error("Failed to read store:", err);
  }

  try {
    feeds = await aggregateAllFeeds();
    // Mark all currently visible jobs as seen
    const allJobIds = feeds.flatMap((f) => f.jobs.map((j) => j.id));
    markJobsSeen(allJobIds);
  } catch (err) {
    console.error("Failed to load feeds:", err);
    feeds = [];
  }

  return (
    <TabShell
      initialFeeds={feeds}
      storedFeedUrls={storedFeedUrls}
      storedPipelineUrls={storedPipelineUrls}
    />
  );
}
