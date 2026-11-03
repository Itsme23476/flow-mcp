import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { HOME_DIR } from "./chrome.js";

// A daily spending limit across every tool. max_credits only guards one scene, and only where Flow shows a quote:
// edits and continuations show none, so without this nothing stopped a run from going past the free 50.
// ponytail: "today" is the computer's local date, not Flow's own reset time; read the real balance with flow_status.
const FILE = join(HOME_DIR, "budget.json");

// Flow shows no quote for these, so the budget reserves this much before they run (measured: a 4 s edit cost 20,
// a 10 s edit 40; a 10 s continuation 15).
export const ESTIMATE = { edit: 40, continue: 15 };

interface Entry { at: string; job: string; what: string; credits: number }
interface Ledger { daily_limit: number; date: string; spent: number; entries: Entry[] }

const today = () => new Date().toLocaleDateString("en-CA");

function load(): Ledger {
  const fallback: Ledger = { daily_limit: Number(process.env.FLOW_MCP_DAILY_LIMIT ?? 50), date: today(), spent: 0, entries: [] };
  let l = fallback;
  try {
    if (existsSync(FILE)) l = { ...fallback, ...JSON.parse(readFileSync(FILE, "utf8")) };
  } catch {}
  return l.date === today() ? l : { ...l, date: today(), spent: 0, entries: [] };
}

function save(l: Ledger) {
  mkdirSync(HOME_DIR, { recursive: true });
  writeFileSync(FILE, JSON.stringify(l, null, 2));
}

export function budget() {
  const l = load();
  return { daily_limit: l.daily_limit, spent_today: l.spent, left_today: Math.max(0, l.daily_limit - l.spent), date: l.date, entries: l.entries };
}

export const left = () => budget().left_today;

export function setLimit(daily_limit: number) {
  save({ ...load(), daily_limit });
  return budget();
}

export function record(job: string, what: string, credits: number) {
  if (!(credits > 0)) return;
  const l = load();
  l.spent += credits;
  l.entries.push({ at: new Date().toISOString(), job, what: what.slice(0, 80), credits });
  save(l);
}
