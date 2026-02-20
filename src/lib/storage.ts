// ── Local JSON storage for MVP persistence ──
// Feed entries can be RSS URLs ("https://...") or ATS keys ("greenhouse:discord").

import fs from "fs";
import path from "path";
import { StorageData } from "./types";

const STORAGE_PATH = path.join(process.cwd(), "data", "store.json");

const DEFAULT_DATA: StorageData = {
  seenJobIds: [],
  pinnedFeeds: [],
  savedFeeds: [],
  feeds: [],
  pipelineUrls: [],
  lastVisit: new Date().toISOString(),
};

export function readStore(): StorageData {
  try {
    const raw = fs.readFileSync(STORAGE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      seenJobIds: parsed.seenJobIds ?? DEFAULT_DATA.seenJobIds,
      pinnedFeeds: parsed.pinnedFeeds ?? DEFAULT_DATA.pinnedFeeds,
      savedFeeds: parsed.savedFeeds ?? DEFAULT_DATA.savedFeeds,
      feeds: parsed.feeds ?? DEFAULT_DATA.feeds,
      pipelineUrls: parsed.pipelineUrls ?? DEFAULT_DATA.pipelineUrls,
      lastVisit: parsed.lastVisit ?? DEFAULT_DATA.lastVisit,
    };
  } catch {
    writeStore(DEFAULT_DATA);
    return { ...DEFAULT_DATA };
  }
}

export function writeStore(data: StorageData): void {
  const dir = path.dirname(STORAGE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STORAGE_PATH, JSON.stringify(data, null, 2));
}

export function markJobsSeen(jobIds: string[]): void {
  const store = readStore();
  const set = new Set(store.seenJobIds);
  jobIds.forEach((id) => set.add(id));
  store.seenJobIds = Array.from(set);
  store.lastVisit = new Date().toISOString();
  writeStore(store);
}

export function togglePin(feedKey: string): boolean {
  const store = readStore();
  const idx = store.pinnedFeeds.indexOf(feedKey);
  if (idx >= 0) {
    store.pinnedFeeds.splice(idx, 1);
    writeStore(store);
    return false;
  }
  store.pinnedFeeds.push(feedKey);
  writeStore(store);
  return true;
}

export function toggleSave(feedKey: string): boolean {
  const store = readStore();
  const idx = store.savedFeeds.indexOf(feedKey);
  if (idx >= 0) {
    store.savedFeeds.splice(idx, 1);
    writeStore(store);
    return false;
  }
  store.savedFeeds.push(feedKey);
  writeStore(store);
  return true;
}

export function addFeed(feedKey: string): void {
  const store = readStore();
  if (!store.feeds.includes(feedKey)) {
    store.feeds.push(feedKey);
    writeStore(store);
  }
}

export function removeFeed(feedKey: string): void {
  const store = readStore();
  store.feeds = store.feeds.filter((f) => f !== feedKey);
  store.pinnedFeeds = store.pinnedFeeds.filter((f) => f !== feedKey);
  store.savedFeeds = store.savedFeeds.filter((f) => f !== feedKey);
  writeStore(store);
}

// ── Pipeline URL management ──

export function addPipelineUrl(url: string): void {
  const store = readStore();
  if (!store.pipelineUrls.includes(url)) {
    store.pipelineUrls.push(url);
    writeStore(store);
  }
}

export function removePipelineUrl(url: string): void {
  const store = readStore();
  store.pipelineUrls = store.pipelineUrls.filter((u) => u !== url);
  writeStore(store);
}
