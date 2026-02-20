// ── Tech job filtering ──
// Only keeps jobs whose title matches at least one tech keyword.

import { Job } from "./types";

const TECH_KEYWORDS = [
  "engineer",
  "developer",
  "software",
  "ai",
  "ml",
  "data",
  "frontend",
  "front-end",
  "backend",
  "back-end",
  "fullstack",
  "full-stack",
  "devops",
  "sre",
  "cloud",
  "infrastructure",
  "machine learning",
  "platform",
];

// Build a single regex from all keywords for fast matching
const TECH_REGEX = new RegExp(TECH_KEYWORDS.join("|"), "i");

export function filterTechJobs(jobs: Job[]): Job[] {
  return jobs.filter((job) => TECH_REGEX.test(job.title));
}
