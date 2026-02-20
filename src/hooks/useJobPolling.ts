"use client";

import { useCallback, useEffect, useRef } from "react";
import { CompanyFeed } from "@/lib/types";
import { dispatchToast } from "@/components/Toast";

const POLL_KEY = "job-aggregator-poll-interval"; // minutes, stored in localStorage
const NOTIF_KEY = "job-aggregator-notifications"; // "on" | "off"
const DEFAULT_INTERVAL = 15; // minutes

export function getPollInterval(): number {
  if (typeof window === "undefined") return DEFAULT_INTERVAL;
  const stored = localStorage.getItem(POLL_KEY);
  return stored ? parseInt(stored, 10) || DEFAULT_INTERVAL : DEFAULT_INTERVAL;
}

export function setPollInterval(minutes: number) {
  localStorage.setItem(POLL_KEY, String(minutes));
  window.dispatchEvent(new Event("poll-settings-changed"));
}

export function getNotificationsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(NOTIF_KEY) !== "off";
}

export function setNotificationsEnabled(enabled: boolean) {
  localStorage.setItem(NOTIF_KEY, enabled ? "on" : "off");
  window.dispatchEvent(new Event("poll-settings-changed"));
}

// Request browser notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

function sendBrowserNotification(title: string, body: string) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, {
      body,
      icon: "/favicon.ico",
      tag: "job-aggregator-new-jobs",
    });
  } catch {
    // Notification API not available (e.g. some mobile browsers)
  }
}

interface UseJobPollingOptions {
  feeds: CompanyFeed[];
  setFeeds: (feeds: CompanyFeed[]) => void;
  setFeedUrls: (urls: string[]) => void;
}

export function useJobPolling({ feeds, setFeeds, setFeedUrls }: UseJobPollingOptions) {
  const prevJobIdsRef = useRef<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize seen job IDs from current feeds
  useEffect(() => {
    const ids = new Set(feeds.flatMap((f) => f.jobs.map((j) => j.id)));
    prevJobIdsRef.current = ids;
  }, []); // Only on mount

  const pollForUpdates = useCallback(async () => {
    if (!getNotificationsEnabled()) return;

    try {
      const res = await fetch("/api/feeds");
      const data = await res.json();
      const newFeeds: CompanyFeed[] = data.feeds ?? [];

      // Collect all current job IDs
      const currentIds = new Set(newFeeds.flatMap((f) => f.jobs.map((j) => j.id)));

      // Find truly new job IDs (not in previous set)
      const prevIds = prevJobIdsRef.current;
      if (prevIds.size > 0) {
        const brandNew: { title: string; company: string }[] = [];
        for (const feed of newFeeds) {
          for (const job of feed.jobs) {
            if (!prevIds.has(job.id)) {
              brandNew.push({ title: job.title, company: feed.name });
            }
          }
        }

        if (brandNew.length > 0) {
          // In-app toast
          if (brandNew.length === 1) {
            dispatchToast(
              `New job: ${brandNew[0].title} at ${brandNew[0].company}`
            );
          } else {
            const companies = [...new Set(brandNew.map((j) => j.company))];
            dispatchToast(
              `${brandNew.length} new jobs from ${companies.slice(0, 3).join(", ")}${companies.length > 3 ? ` +${companies.length - 3} more` : ""}`
            );
          }

          // Browser notification
          if (brandNew.length === 1) {
            sendBrowserNotification(
              `New job at ${brandNew[0].company}`,
              brandNew[0].title
            );
          } else {
            sendBrowserNotification(
              `${brandNew.length} new tech jobs`,
              `From ${[...new Set(brandNew.map((j) => j.company))].slice(0, 3).join(", ")}`
            );
          }

          // Update the dashboard
          setFeeds(newFeeds);
          setFeedUrls(data.storedFeedUrls ?? []);
        }
      }

      prevJobIdsRef.current = currentIds;
    } catch {
      // Polling failed silently — will retry next interval
    }
  }, [setFeeds, setFeedUrls]);

  // Set up / tear down the polling interval
  useEffect(() => {
    function startPolling() {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (!getNotificationsEnabled()) return;
      const ms = getPollInterval() * 60 * 1000;
      intervalRef.current = setInterval(pollForUpdates, ms);
    }

    startPolling();

    // Re-start when settings change
    window.addEventListener("poll-settings-changed", startPolling);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener("poll-settings-changed", startPolling);
    };
  }, [pollForUpdates]);

  // Update the ref when feeds change from manual refresh
  const updateSeenJobs = useCallback((currentFeeds: CompanyFeed[]) => {
    prevJobIdsRef.current = new Set(
      currentFeeds.flatMap((f) => f.jobs.map((j) => j.id))
    );
  }, []);

  return { pollForUpdates, updateSeenJobs };
}
