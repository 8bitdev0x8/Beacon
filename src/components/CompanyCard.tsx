"use client";

import { useState } from "react";
import { CompanyFeed } from "@/lib/types";
import JobCard from "./JobCard";

// Derive a display URL from the feed key
function feedSource(feedUrl: string): string {
  if (feedUrl.startsWith("scrape:")) return feedUrl.slice(7);
  if (feedUrl.startsWith("http")) return feedUrl;
  if (feedUrl.includes(":")) {
    const [platform, slug] = feedUrl.split(":");
    if (platform === "greenhouse") return `boards.greenhouse.io/${slug}`;
    if (platform === "lever") return `jobs.lever.co/${slug}`;
    if (platform === "ashby") return `jobs.ashbyhq.com/${slug}`;
    if (platform === "smartrecruiters") return `jobs.smartrecruiters.com/${slug}`;
    if (platform === "workday") {
      const [company, dc, site] = slug.split(".");
      return `${company}.${dc}.myworkdayjobs.com/${site}`;
    }
    return feedUrl;
  }
  return feedUrl;
}

export default function CompanyCard({
  feed,
  onAction,
}: {
  feed: CompanyFeed;
  onAction: (feedUrl: string, action: "pin" | "save" | "remove") => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`rounded-xl border transition-colors duration-150 overflow-hidden ${
        feed.isPinned
          ? "border-[var(--border-active)] bg-[var(--bg-secondary)]"
          : "border-[var(--border-default)] bg-[var(--bg-card)] hover:border-[var(--border-hover)]"
      }`}
    >
      {/* ── Header row ── */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          {/* Company initial — plain black/white */}
          <div className="shrink-0 w-10 h-10 rounded-lg bg-[var(--text-primary)]
                          flex items-center justify-center text-white font-semibold text-[15px]">
            {feed.name.charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-semibold text-[var(--text-primary)] truncate">
                {feed.name}
              </h3>
              {feed.isPinned && (
                <span className="text-[var(--text-tertiary)] text-[11px]" title="Pinned">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                </span>
              )}
              {feed.isSaved && (
                <span className="text-[var(--text-tertiary)] text-[11px]" title="Saved">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 01-1.085.67L12 18.089l-7.165 3.583A.75.75 0 013.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z" />
                  </svg>
                </span>
              )}
            </div>
            <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5 truncate font-[family-name:var(--font-geist-mono)] max-w-full"
               title={feedSource(feed.feedUrl)}>
              {feedSource(feed.feedUrl)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[12px] text-[var(--text-tertiary)]">
            {feed.jobs.length} job{feed.jobs.length !== 1 ? "s" : ""}
          </span>
          {feed.newJobCount > 0 && (
            <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full
                             bg-[var(--text-primary)] text-white">
              {feed.newJobCount} new
            </span>
          )}
          <svg
            className={`w-4 h-4 text-[var(--text-tertiary)] transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </button>

      {/* ── Expanded body ── */}
      {expanded && (
        <div className="px-4 pb-4 animate-fade-in">
          {/* Quick actions toolbar */}
          <div className="flex gap-1.5 mb-4 pb-4 border-b border-[var(--border-default)]">
            <ActionBtn
              active={feed.isPinned}
              onClick={() => onAction(feed.feedUrl, "pin")}
              label={feed.isPinned ? "Pinned" : "Pin"}
            />
            <ActionBtn
              active={feed.isSaved}
              onClick={() => onAction(feed.feedUrl, "save")}
              label={feed.isSaved ? "Saved" : "Save"}
            />
            <ActionBtn
              active={false}
              onClick={() => onAction(feed.feedUrl, "remove")}
              label="Remove"
            />
          </div>

          {/* Job list */}
          {feed.jobs.length === 0 ? (
            <p className="text-[13px] text-[var(--text-tertiary)] italic py-4 text-center">
              No matching tech jobs found
            </p>
          ) : (
            <div className="grid gap-1.5 max-h-[400px] overflow-y-auto pr-1">
              {feed.jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ActionBtn({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg
                  border transition-colors duration-150 ${
        active
          ? "border-[var(--border-active)] bg-[var(--bg-elevated)] text-[var(--text-primary)]"
          : "border-[var(--border-default)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]"
      }`}
    >
      {label}
    </button>
  );
}
