"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EmployerResult } from "@/lib/types";
import JobCard from "./JobCard";

interface PipelineData {
  url: string;
  employers: EmployerResult[];
  totalJobs: number;
  withCareerPage: number;
  withJobs: number;
}

export default function PipelineSection({
  initialPipelines,
  storedPipelineUrls,
}: {
  initialPipelines: PipelineData[];
  storedPipelineUrls: string[];
}) {
  const [pipelines, setPipelines] = useState<PipelineData[]>(initialPipelines ?? []);
  const [pipelineUrls, setPipelineUrls] = useState<string[]>(storedPipelineUrls ?? []);
  const [loading, setLoading] = useState(false);
  const hasFetchedRef = useRef(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pipeline");
      const data = await res.json();
      setPipelines(data.pipelines ?? []);
      setPipelineUrls(data.storedPipelineUrls ?? []);
    } catch (err) {
      console.error("Pipeline refresh failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch pipeline data on mount when there are stored URLs
  useEffect(() => {
    if (hasFetchedRef.current) return;
    if ((storedPipelineUrls ?? []).length > 0) {
      hasFetchedRef.current = true;
      refresh();
    }
  }, [storedPipelineUrls, refresh]);

  const totalEmployers = pipelines.reduce((sum, p) => sum + p.employers.length, 0);
  const totalJobs = pipelines.reduce((sum, p) => sum + p.totalJobs, 0);
  const totalWithJobs = pipelines.reduce((sum, p) => sum + p.withJobs, 0);

  return (
    <div className="animate-fade-in">
      {/* ── Hero ── */}
      <div className="mb-10">
        <h1 className="text-[32px] font-bold tracking-tight text-[var(--text-primary)] mb-2">
          Employer Pipeline
        </h1>
        <p className="text-[15px] text-[var(--text-secondary)]">
          Paste a JSON URL with employer data — Beacon checks each career page for new jobs.
        </p>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Employers" value={totalEmployers} />
        <StatCard label="Tech Jobs" value={totalJobs} />
        <StatCard label="Hiring" value={totalWithJobs} />
      </div>

      {/* ── Add pipeline URL ── */}
      <div className="mb-8">
        <AddPipelineForm onAdded={refresh} />
        <PipelineUrlManager urls={pipelineUrls} onRemove={async (url) => {
          await fetch("/api/pipeline", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
          });
          await refresh();
        }} />
      </div>

      {/* ── Section header ── */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[14px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">
          Employers
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
          {loading ? "Scanning..." : "Refresh"}
        </button>
      </div>

      {/* ── Employer list ── */}
      {pipelines.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border-default)]
                        bg-[var(--bg-secondary)] py-20 text-center">
          <p className="text-[14px] text-[var(--text-secondary)] mb-1">No pipeline added yet</p>
          <p className="text-[13px] text-[var(--text-tertiary)]">Paste a JSON URL above to get started</p>
        </div>
      ) : (
        <div className="grid gap-2 min-w-0">
          {pipelines.map((pipeline) =>
            pipeline.employers.map((emp) => (
              <EmployerCard key={`${pipeline.url}-${emp.employer_name}`} employer={emp} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ── Stat Card ── */
function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)]
                    p-5 transition-colors hover:border-[var(--border-hover)]">
      <div className="mb-3">
        <span className="text-[12px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-[28px] font-bold tracking-tight text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

/* ── Add Pipeline Form ── */
function AddPipelineForm({ onAdded }: { onAdded: () => void }) {
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
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: input.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add pipeline");
      setSuccess(`Loaded ${data.employerCount} employers (${data.withCareerPage} with career pages)`);
      setInput("");
      onAdded();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add pipeline.");
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
          placeholder="Paste a JSON URL (e.g. GitHub raw link with employer data)..."
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
              Loading
            </>
          ) : (
            "Add"
          )}
        </button>
      </form>

      <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">
        JSON must be an array of objects with employer_name, permits_total, and career_page fields.
      </p>

      {error && <p className="mt-2 text-[12px] text-[var(--text-primary)] font-medium animate-fade-in">{error}</p>}
      {success && <p className="mt-2 text-[12px] text-[var(--text-secondary)] animate-fade-in">{success}</p>}
    </div>
  );
}

/* ── Pipeline URL Manager ── */
function PipelineUrlManager({ urls, onRemove }: { urls: string[]; onRemove: (url: string) => void }) {
  const [open, setOpen] = useState(false);
  if (urls.length === 0) return null;

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
        Manage pipelines ({urls.length})
      </button>

      {open && (
        <div className="mt-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)]
                        overflow-hidden animate-fade-in">
          {urls.map((url, i) => (
            <div key={url} className={`flex items-center justify-between gap-3 px-4 py-3 overflow-hidden
                         ${i > 0 ? "border-t border-[var(--border-default)]" : ""}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded
                                   bg-[var(--bg-elevated)] text-[var(--text-secondary)] uppercase tracking-wide border border-[var(--border-default)]">
                    JSON
                  </span>
                </div>
                <p className="text-[12px] text-[var(--text-tertiary)] truncate font-[family-name:var(--font-geist-mono)] mt-1 max-w-full"
                   title={url}>
                  {url}
                </p>
              </div>
              <button
                onClick={() => onRemove(url)}
                className="shrink-0 p-1.5 rounded-md text-[var(--text-tertiary)]
                           hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]
                           transition-colors"
                title="Remove pipeline"
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

/* ── Employer Card ── */
function EmployerCard({ employer }: { employer: EmployerResult }) {
  const [expanded, setExpanded] = useState(false);
  const hasJobs = employer.jobCount > 0;

  return (
    <div className={`rounded-xl border transition-colors duration-150 overflow-hidden ${
      hasJobs
        ? "border-[var(--border-default)] bg-[var(--bg-card)] hover:border-[var(--border-hover)]"
        : "border-[var(--border-default)] bg-[var(--bg-secondary)]"
    }`}>
      <button
        onClick={() => hasJobs && setExpanded(!expanded)}
        className={`w-full flex items-center justify-between p-4 text-left ${hasJobs ? "cursor-pointer" : "cursor-default"}`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className={`text-[14px] font-semibold truncate ${
              hasJobs ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"
            }`}>
              {employer.employer_name}
            </h3>
            <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded
                             bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-default)]">
              {employer.permits_total} permit{employer.permits_total !== 1 ? "s" : ""}
            </span>
            {employer.status === "no_career_page" && (
              <span className="text-[11px] text-[var(--text-tertiary)]">No career page</span>
            )}
            {employer.status === "error" && (
              <span className="text-[11px] text-[var(--text-tertiary)]">Error</span>
            )}
          </div>
          {employer.career_page && (
            <a
              href={employer.career_page}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="block text-[12px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]
                         truncate font-[family-name:var(--font-geist-mono)] mt-0.5 max-w-full transition-colors"
              title={employer.career_page}
            >
              {employer.career_page}
            </a>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {hasJobs && (
            <>
              <span className="text-[12px] text-[var(--text-secondary)]">
                {employer.jobCount} job{employer.jobCount !== 1 ? "s" : ""}
              </span>
              <svg
                className={`w-4 h-4 text-[var(--text-tertiary)] transition-transform duration-200 ${
                  expanded ? "rotate-180" : ""
                }`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </>
          )}
        </div>
      </button>

      {expanded && hasJobs && (
        <div className="px-4 pb-4 animate-fade-in">
          <div className="grid gap-1.5 max-h-[400px] overflow-y-auto pr-1 pt-2 border-t border-[var(--border-default)]">
            {employer.jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
