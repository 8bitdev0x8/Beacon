"use client";

import { useState } from "react";
import { CompanyFeed } from "@/lib/types";
import Dashboard from "./Dashboard";
import PipelineSection from "./PipelineSection";

interface TabShellProps {
  initialFeeds: CompanyFeed[];
  storedFeedUrls: string[];
  storedPipelineUrls: string[];
}

export default function TabShell({
  initialFeeds,
  storedFeedUrls,
  storedPipelineUrls,
}: TabShellProps) {
  const [activeTab, setActiveTab] = useState<"feeds" | "pipeline">("feeds");

  return (
    <div>
      {/* ── Tab bar ── */}
      <div className="flex gap-1 mb-8 border-b border-[var(--border-default)]">
        <TabButton
          active={activeTab === "feeds"}
          onClick={() => setActiveTab("feeds")}
          label="Feeds"
        />
        <TabButton
          active={activeTab === "pipeline"}
          onClick={() => setActiveTab("pipeline")}
          label="Pipeline"
        />
      </div>

      {/* ── Tab content ── */}
      {activeTab === "feeds" ? (
        <Dashboard initialFeeds={initialFeeds} storedFeedUrls={storedFeedUrls} />
      ) : (
        <PipelineSection initialPipelines={[]} storedPipelineUrls={storedPipelineUrls} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-[14px] font-medium border-b-2 -mb-px transition-colors ${
        active
          ? "border-[var(--text-primary)] text-[var(--text-primary)]"
          : "border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
      }`}
    >
      {label}
    </button>
  );
}
