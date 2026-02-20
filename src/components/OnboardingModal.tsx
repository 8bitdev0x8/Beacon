"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "rss-aggregator-onboarded";

export default function OnboardingModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Show on first visit
    if (!localStorage.getItem(STORAGE_KEY)) {
      setOpen(true);
    }
    // Listen for manual "open help" events from the header button
    function handleOpen() { setOpen(true); }
    window.addEventListener("open-help-modal", handleOpen);
    return () => window.removeEventListener("open-help-modal", handleOpen);
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "true");
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={dismiss} />

      <div className="relative w-full max-w-lg rounded-2xl border border-[var(--border-default)]
                      bg-[var(--bg-card)] shadow-2xl animate-fade-in overflow-hidden">
        <div className="h-px bg-[var(--border-active)]" />

        <div className="p-6">
          <h2 className="text-[20px] font-bold text-[var(--text-primary)] mb-1">
            How to use Beacon
          </h2>
          <p className="text-[13px] text-[var(--text-secondary)] mb-6">
            Monitor tech jobs from any company in one place.
          </p>

          <div className="space-y-4 mb-6">
            <Step number="1" title="Add companies"
              description='Paste any URL or type a company name. We auto-detect ATS boards (Greenhouse, Lever, etc.), try RSS, and fall back to page scraping — you just paste and go.' />
            <Step number="2" title="Browse tech jobs"
              description="Only engineering, software, data, AI/ML, and related roles are shown. Click a company to expand its job list." />
            <Step number="3" title="Pin & save"
              description="Pin companies to keep them at the top. Save others for later. New jobs get a dot marker." />
            <Step number="4" title="Filter by location"
              description='Use preset filters like Ireland, Remote, or Europe — or type any custom location.' />
            <Step number="5" title="Subscribe via RSS"
              description="Get all filtered tech jobs at /api/rss — add it to any RSS reader." />
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {["Greenhouse", "Lever", "Ashby", "SmartRecruiters", "RSS", "Any URL"].map((p) => (
              <span key={p}
                className="text-[11px] font-medium px-2.5 py-1 rounded-full
                           border border-[var(--border-default)] text-[var(--text-secondary)]">
                {p}
              </span>
            ))}
          </div>

          <button onClick={dismiss}
            className="w-full py-2.5 rounded-lg text-[13px] font-medium
                       bg-[var(--text-primary)] text-[var(--bg-primary)]
                       hover:opacity-90 transition-opacity">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

function Step({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-6 h-6 rounded-full bg-[var(--text-primary)]
                      flex items-center justify-center text-[11px] font-bold text-white">
        {number}
      </div>
      <div>
        <p className="text-[13px] font-medium text-[var(--text-primary)]">{title}</p>
        <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
