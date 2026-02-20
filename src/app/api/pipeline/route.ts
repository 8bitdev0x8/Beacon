// ── /api/pipeline ──
// GET  → Process all stored pipeline URLs and return employer results
// POST → Add a new pipeline JSON URL
// DELETE → Remove a pipeline JSON URL

import { NextRequest, NextResponse } from "next/server";
import { readStore, addPipelineUrl, removePipelineUrl, markJobsSeen } from "@/lib/storage";
import { processPipeline, fetchPipelineJson } from "@/lib/pipeline";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const store = readStore();
    const urls = store.pipelineUrls ?? [];

    if (urls.length === 0) {
      return NextResponse.json({
        pipelines: [],
        storedPipelineUrls: [],
      });
    }

    // Process all pipeline URLs
    const results = await Promise.allSettled(
      urls.map(async (url) => {
        const result = await processPipeline(url);
        return { url, ...result };
      })
    );

    const pipelines = results.map((r, i) =>
      r.status === "fulfilled"
        ? r.value
        : { url: urls[i], employers: [], totalJobs: 0, withCareerPage: 0, withJobs: 0, error: "Failed to process" }
    );

    // Mark all jobs as seen
    const allJobIds = pipelines.flatMap((p) =>
      p.employers.flatMap((e) => e.jobs.map((j) => j.id))
    );
    if (allJobIds.length > 0) markJobsSeen(allJobIds);

    return NextResponse.json({
      pipelines,
      storedPipelineUrls: urls,
    });
  } catch (err) {
    console.error("Pipeline GET failed:", err);
    return NextResponse.json({ error: "Failed to process pipelines" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  const input = url.trim();

  // Validate the URL by trying to fetch and parse it
  try {
    const employers = await fetchPipelineJson(input);
    addPipelineUrl(input);
    const withPage = employers.filter((e) => e.career_page).length;
    return NextResponse.json({
      ok: true,
      url: input,
      employerCount: employers.length,
      withCareerPage: withPage,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch or parse the JSON URL" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const { url } = await req.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }
  removePipelineUrl(url.trim());
  return NextResponse.json({ ok: true });
}
