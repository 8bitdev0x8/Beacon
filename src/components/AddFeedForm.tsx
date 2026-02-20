"use client";

import { useState } from "react";

export default function AddFeedForm({ onAdded }: { onAdded: () => void }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: input.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add feed");
      if (data.warning) {
        setSuccess(data.warning);
      } else if (data.type === "scrape") {
        setSuccess(`Scraped page: ${data.companyName} (${data.jobCount} jobs found)`);
      } else if (data.type === "rss") {
        setSuccess(`RSS feed added: ${data.companyName ?? "Feed"} (${data.jobCount ?? 0} jobs)`);
      } else if (data.platform) {
        setSuccess(`Found on ${data.platform}: ${data.companyName} (${data.jobCount} jobs)`);
      } else {
        setSuccess("Feed added successfully.");
      }
      setInput("");
      onAdded();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add feed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Paste any URL or company name (e.g. "stripe", "https://boards.greenhouse.io/stripe")...'
          className="flex-1 px-4 py-2.5 rounded-lg text-[13px]
                     bg-[var(--bg-card)] border border-[var(--border-default)]
                     text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]
                     focus:outline-none focus:border-[var(--border-active)]
                     transition-colors duration-150"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 rounded-lg text-[13px] font-medium
                     bg-[var(--text-primary)] text-[var(--bg-primary)]
                     hover:opacity-80 disabled:opacity-40
                     transition-opacity duration-150 shrink-0 min-w-[100px] flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Searching
            </>
          ) : (
            "Add"
          )}
        </button>
      </form>

      <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">
        Paste any URL — auto-detects ATS boards, tries RSS, or scrapes the page directly for job listings.
      </p>

      {error && (
        <p className="mt-2 text-[12px] text-[var(--text-primary)] font-medium animate-fade-in">{error}</p>
      )}
      {success && (
        <p className="mt-2 text-[12px] text-[var(--text-secondary)] animate-fade-in">{success}</p>
      )}
    </div>
  );
}
