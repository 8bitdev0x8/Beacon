// ── Core domain types for Beacon ──

export interface Job {
  id: string;           // Unique hash of link + title for deduplication
  title: string;
  company: string;
  department?: string;
  location?: string;
  link: string;
  pubDate: string;      // ISO date string
  isNew?: boolean;      // True if not seen on previous visit
}

export interface CompanyFeed {
  name: string;         // Display name derived from the feed title
  feedUrl: string;
  jobs: Job[];
  newJobCount: number;  // Number of jobs not seen on last visit
  isPinned: boolean;
  isSaved: boolean;     // "Saved for later" flag
  lastFetched?: string; // ISO date of most recent fetch
}

// ── JSON Pipeline types ──

// A single employer entry from the JSON source
export interface Employer {
  employer_name: string;
  permits_total: number;
  career_page: string | null;
}

// An employer enriched with detected job data
export interface EmployerResult {
  employer_name: string;
  permits_total: number;
  career_page: string | null;
  jobs: Job[];
  jobCount: number;
  status: "ok" | "no_career_page" | "no_jobs" | "error";
  error?: string;
}

// Shape of our local JSON store
export interface StorageData {
  seenJobIds: string[];           // Job IDs the user has already seen
  pinnedFeeds: string[];          // Feed URLs that are pinned
  savedFeeds: string[];           // Feed URLs saved for later
  feeds: string[];                // All monitored feed URLs
  pipelineUrls: string[];         // JSON pipeline source URLs
  lastVisit: string;              // ISO date of last dashboard visit
}
