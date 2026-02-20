"use client";

import { useCallback, useMemo, useState } from "react";
import { CompanyFeed } from "@/lib/types";
import { useJobPolling } from "@/hooks/useJobPolling";
import CompanyCard from "./CompanyCard";
import AddFeedForm from "./AddFeedForm";

// Preset location filters — "All" shows everything
const LOCATION_FILTERS = [
  { label: "All", value: "" },
  { label: "Ireland", value: "ireland" },
  { label: "Remote", value: "remote" },
  { label: "US", value: "united states,usa, us," },
  { label: "UK", value: "united kingdom,uk,london,england" },
  { label: "Europe", value: "ireland,uk,london,berlin,amsterdam,paris,europe,germany,france,netherlands,spain,portugal,poland,sweden,denmark,finland,norway,switzerland,austria,belgium,italy" },
] as const;

export default function Dashboard({
  initialFeeds,
  storedFeedUrls,
}: {
  initialFeeds: CompanyFeed[];
  storedFeedUrls: string[];
}) {
  const [feeds, setFeeds] = useState<CompanyFeed[]>(initialFeeds ?? []);
  const [feedUrls, setFeedUrls] = useState<string[]>(storedFeedUrls ?? []);
  const [loading, setLoading] = useState(false);
  const [locationFilter, setLocationFilter] = useState("");
  const [customLocation, setCustomLocation] = useState("");

  const { updateSeenJobs } = useJobPolling({ feeds, setFeeds, setFeedUrls });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/feeds");
      const data = await res.json();
      const newFeeds = data.feeds ?? [];
      setFeeds(newFeeds);
      setFeedUrls(data.storedFeedUrls ?? []);
      updateSeenJobs(newFeeds);
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      setLoading(false);
    }
  }, [updateSeenJobs]);

  async function handleAction(
    feedUrl: string,
    action: "pin" | "save" | "remove"
  ) {
    if (action === "remove") {
      await fetch("/api/feeds", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: feedUrl }),
      });
    } else {
      await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedUrl, action }),
      });
    }
    await refresh();
  }

  // Active filter keywords (from preset or custom input)
  const activeFilter = customLocation || locationFilter;

  // Filter jobs within each company by location, then exclude empty companies
  const filteredFeeds = useMemo(() => {
    if (!activeFilter) return feeds;
    const keywords = activeFilter.toLowerCase().split(",").map((k) => k.trim()).filter(Boolean);
    return feeds
      .map((f) => {
        const filtered = f.jobs.filter((j) => {
          const loc = (j.location || "").toLowerCase();
          return keywords.some((kw) => loc.includes(kw));
        });
        return { ...f, jobs: filtered, newJobCount: filtered.filter((j) => j.isNew).length };
      })
      .filter((f) => f.jobs.length > 0);
  }, [feeds, activeFilter]);

  const totalJobs = filteredFeeds.reduce((sum, f) => sum + f.jobs.length, 0);
  const totalNew = filteredFeeds.reduce((sum, f) => sum + f.newJobCount, 0);

  return (
    <div className="animate-fade-in">
      {/* ── Hero section ── */}
      <div className="mb-10">
        <h1 className="text-[32px] font-bold tracking-tight text-[var(--text-primary)] mb-2">
          Your Job Feed
        </h1>
        <p className="text-[15px] text-[var(--text-secondary)]">
          Aggregated tech positions from {feeds.length} {feeds.length === 1 ? "company" : "companies"}
          {activeFilter && <span> &middot; filtered by location</span>}
        </p>
      </div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Companies" value={feeds.length} />
        <StatCard label="Tech Jobs" value={totalJobs} />
        <StatCard label="New" value={totalNew} />
      </div>

      {/* ── Add feed + manage ── */}
      <div className="mb-8">
        <AddFeedForm onAdded={refresh} />
        <FeedManager
          feedUrls={feedUrls}
          feeds={feeds}
          onRemove={(url) => handleAction(url, "remove")}
        />
      </div>

      {/* ── Location filter bar ── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          {LOCATION_FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => { setLocationFilter(f.value); setCustomLocation(""); }}
              className={`px-3 py-1 text-[12px] font-medium rounded-lg border transition-colors duration-150 ${
                activeFilter === f.value && !customLocation
                  ? "border-[var(--border-active)] bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                  : "border-[var(--border-default)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:border-[var(--border-hover)]"
              }`}
            >
              {f.label}
            </button>
          ))}
          {/* Custom location input */}
          <input
            type="text"
            value={customLocation}
            onChange={(e) => { setCustomLocation(e.target.value); setLocationFilter(""); }}
            placeholder="Custom location..."
            className="w-36 px-3 py-1 text-[12px] rounded-lg
                       bg-[var(--bg-card)] border border-[var(--border-default)]
                       text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]
                       focus:outline-none focus:border-[var(--border-active)]
                       transition-colors duration-150"
          />
          {activeFilter && (
            <button
              onClick={() => { setLocationFilter(""); setCustomLocation(""); }}
              className="text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Section header ── */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[14px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">
          Companies
        </h2>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-1.5 text-[13px] text-[var(--text-secondary)]
                     hover:text-[var(--text-primary)] disabled:opacity-40 transition-colors"
        >
          <svg
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
          </svg>
          {loading ? "Refreshing" : "Refresh"}
        </button>
      </div>

      {/* ── Company list ── */}
      {feeds.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border-default)]
                        bg-[var(--bg-secondary)] py-20 text-center">
          <p className="text-[14px] text-[var(--text-secondary)] mb-1">No feeds added yet</p>
          <p className="text-[13px] text-[var(--text-tertiary)]">Paste a URL above to get started</p>
        </div>
      ) : filteredFeeds.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border-default)]
                        bg-[var(--bg-secondary)] py-12 text-center">
          <p className="text-[14px] text-[var(--text-secondary)] mb-1">No jobs match this location filter</p>
          <p className="text-[13px] text-[var(--text-tertiary)]">Try a different location or clear the filter</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredFeeds.map((feed, i) => (
            <div key={feed.feedUrl} className="animate-fade-in min-w-0" style={{ animationDelay: `${i * 50}ms` }}>
              <CompanyCard feed={feed} onAction={handleAction} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Stat Card ── */
function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)]
                    p-5 transition-colors hover:border-[var(--border-hover)]">
      <div className="mb-3">
        <span className="text-[12px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-[28px] font-bold tracking-tight text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

/* ── Feed Manager ── */
function FeedManager({
  feedUrls,
  feeds,
  onRemove,
}: {
  feedUrls: string[];
  feeds: CompanyFeed[];
  onRemove: (feedUrl: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const urls = feedUrls ?? [];
  if (urls.length === 0) return null;

  const nameByUrl = new Map((feeds ?? []).map((f) => [f.feedUrl, f.name]));

  function badgeLabel(url: string): string {
    if (url.startsWith("scrape:")) return "WEB";
    if (url.startsWith("http")) return "RSS";
    if (url.includes(":")) return url.split(":")[0].toUpperCase();
    return "FEED";
  }

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[13px] text-[var(--text-tertiary)]
                   hover:text-[var(--text-secondary)] transition-colors"
      >
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        Manage feeds ({urls.length})
      </button>

      {open && (
        <div className="mt-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)]
                        overflow-hidden animate-fade-in">
          {urls.map((url, i) => (
            <div
              key={url}
              className={`flex items-center justify-between gap-3 px-4 py-3 overflow-hidden
                         ${i > 0 ? "border-t border-[var(--border-default)]" : ""}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {nameByUrl.has(url) && (
                    <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                      {nameByUrl.get(url)}
                    </p>
                  )}
                  <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded
                                   bg-[var(--bg-elevated)] text-[var(--text-secondary)] uppercase tracking-wide border border-[var(--border-default)]">
                    {badgeLabel(url)}
                  </span>
                </div>
                <p className="text-[12px] text-[var(--text-tertiary)] truncate font-[family-name:var(--font-geist-mono)] max-w-full"
                   title={url.startsWith("scrape:") ? url.slice(7) : url}>
                  {url.startsWith("scrape:") ? url.slice(7) : url}
                </p>
              </div>
              <button
                onClick={() => onRemove(url)}
                className="shrink-0 p-1.5 rounded-md text-[var(--text-tertiary)]
                           hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]
                           transition-colors"
                title="Remove feed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
