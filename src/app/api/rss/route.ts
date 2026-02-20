// ── GET /api/rss ──
// Generates an RSS 2.0 XML feed of all filtered tech jobs across
// every monitored company. Subscribe to this in any RSS reader.

import { NextResponse } from "next/server";
import { aggregateAllFeeds } from "@/lib/aggregator";
import { Job } from "@/lib/types";

export const dynamic = "force-dynamic";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const feeds = await aggregateAllFeeds();

  // Flatten all jobs, newest first
  const allJobs: Job[] = feeds
    .flatMap((f) => f.jobs)
    .sort(
      (a, b) =>
        new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
    );

  const items = allJobs
    .map(
      (job) => `
    <item>
      <title>${escapeXml(job.title)}</title>
      <link>${escapeXml(job.link)}</link>
      <description>${escapeXml(
        [job.company, job.department, job.location]
          .filter(Boolean)
          .join(" · ")
      )}</description>
      <pubDate>${new Date(job.pubDate).toUTCString()}</pubDate>
      <guid isPermaLink="false">${escapeXml(job.id)}</guid>
      <category>${escapeXml(job.company)}</category>
    </item>`
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Tech Job Aggregator</title>
    <description>Aggregated tech jobs from multiple company RSS feeds</description>
    <link>${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}</link>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    }/api/rss" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "s-maxage=300, stale-while-revalidate",
    },
  });
}
