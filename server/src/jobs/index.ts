import cron from "node-cron";
import { env } from "../env.js";
import { recalculateAllProviders } from "../services/ranking.js";
import { completeCampaigns } from "./campaigns.js";
import { cleanup } from "./cleanup.js";
import { expireSubscriptions, remindExpiringSubscriptions } from "./subscriptions.js";

interface Job {
  /** Cron expression in the platform timezone (APP_TIMEZONE). */
  schedule: string;
  run: () => Promise<string>;
}

export const JOBS: Record<string, Job> = {
  "expire-subscriptions": { schedule: "5 * * * *", run: expireSubscriptions },
  "complete-campaigns": { schedule: "10 * * * *", run: completeCampaigns },
  "remind-subscriptions": { schedule: "0 9 * * *", run: remindExpiringSubscriptions },
  "recalculate-rankings": { schedule: "0 2 * * *", run: async () => `${await recalculateAllProviders()} providers` },
  cleanup: { schedule: "30 3 * * *", run: cleanup },
};

/** Runs one job and logs how it went. Never throws, so a failing job cannot take the API down. */
export async function runJob(name: string): Promise<boolean> {
  const job = JOBS[name];
  if (!job) throw new Error(`Unknown job ${name}. Jobs: ${Object.keys(JOBS).join(", ")}`);
  const started = Date.now();
  try {
    const summary = await job.run();
    console.info(`[job] ${name}: ${summary} (${Date.now() - started} ms)`);
    return true;
  } catch (err) {
    console.error(`[job] ${name} failed after ${Date.now() - started} ms`, err);
    return false;
  }
}

/**
 * Schedules every job in this process. Only one API instance should do this (RUN_JOBS=true),
 * otherwise each instance would expire subscriptions and send reminder emails.
 */
export function startJobs() {
  if (!env.runJobs) return;
  for (const [name, job] of Object.entries(JOBS)) {
    cron.schedule(job.schedule, () => runJob(name), { name, timezone: env.timezone, noOverlap: true });
  }
  console.info(`[job] scheduled ${Object.keys(JOBS).length} jobs in ${env.timezone}`);
}
