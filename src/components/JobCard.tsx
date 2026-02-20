import { Job } from "@/lib/types";

export default function JobCard({ job }: { job: Job }) {
  return (
    <a
      href={job.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg
                 transition-colors duration-150
                 hover:bg-[var(--bg-elevated)] border border-transparent hover:border-[var(--border-default)]"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="text-[13px] font-medium text-[var(--text-secondary)]
                         group-hover:text-[var(--text-primary)] transition-colors truncate">
            {job.title}
          </h4>
          {job.isNew && (
            <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--text-primary)]" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {(job.department || job.location) && (
            <p className="text-[11px] text-[var(--text-tertiary)] truncate">
              {[job.department, job.location].filter(Boolean).join(" · ")}
            </p>
          )}
          <span className="text-[11px] text-[var(--text-tertiary)]">
            {new Date(job.pubDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* External link arrow */}
      <svg
        className="shrink-0 w-3.5 h-3.5 text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100
                   transition-all duration-150 -translate-x-1 group-hover:translate-x-0"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
      </svg>
    </a>
  );
}
