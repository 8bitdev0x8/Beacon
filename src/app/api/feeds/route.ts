// ── /api/feeds ──
// GET  → Returns all company feeds with filtered tech jobs
// POST → Adds a new feed (URL or company slug with auto-detect)
// DELETE → Removes a feed

import { NextRequest, NextResponse } from "next/server";
import { aggregateAllFeeds } from "@/lib/aggregator";
import { addFeed, removeFeed, markJobsSeen, readStore } from "@/lib/storage";
import { resolveSlug, smartDetect } from "@/lib/ats/resolve";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const feeds = await aggregateAllFeeds();
    const allJobIds = feeds.flatMap((f) => f.jobs.map((j) => j.id));
    markJobsSeen(allJobIds);

    const store = readStore();
    return NextResponse.json({ feeds, storedFeedUrls: store.feeds });
  } catch (err) {
    console.error("Failed to aggregate feeds:", err);
    return NextResponse.json(
      { error: "Failed to fetch feeds" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Input is required" }, { status: 400 });
  }

  const input = url.trim();

  // If it looks like a full URL, use smart detection
  if (input.startsWith("http://") || input.startsWith("https://")) {
    const detected = await smartDetect(input);
    if (detected) {
      addFeed(detected.feedKey);
      return NextResponse.json({
        ok: true,
        feedKey: detected.feedKey,
        type: detected.type,
        platform: detected.platform,
        companyName: detected.companyName,
        jobCount: detected.jobCount,
      });
    }
    // Nothing detected — store as RSS anyway so user can retry later
    addFeed(input);
    return NextResponse.json({ ok: true, feedKey: input, type: "rss", warning: "Could not verify jobs from this URL. It was added as an RSS feed." });
  }

  // If it already has a platform prefix (e.g. "greenhouse:discord"), store directly
  if (/^(greenhouse|lever|ashby|smartrecruiters):/.test(input)) {
    addFeed(input);
    return NextResponse.json({ ok: true, feedKey: input, type: "ats" });
  }

  // Otherwise treat as a company slug — auto-detect which ATS platform
  const result = await resolveSlug(input);
  if (result) {
    addFeed(result.feedKey);
    return NextResponse.json({
      ok: true,
      feedKey: result.feedKey,
      type: "ats",
      platform: result.platform,
      companyName: result.companyName,
      jobCount: result.jobCount,
    });
  }

  return NextResponse.json(
    { error: `Could not find "${input}" on any ATS platform (Greenhouse, Lever, Ashby, SmartRecruiters). Try pasting a direct RSS URL instead.` },
    { status: 404 }
  );
}

export async function DELETE(req: NextRequest) {
  const { url } = await req.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }
  removeFeed(url);
  return NextResponse.json({ ok: true });
}
