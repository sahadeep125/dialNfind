import { createApp } from "./app.js";
import { env } from "./env.js";
import { prisma } from "./lib/prisma.js";
import { startJobs, stopJobs } from "./jobs/index.js";
import { shutdownAnalytics } from "./services/analytics.js";

const app = createApp();
const server = app.listen(env.port, () => {
  console.log(`DialNFind API listening on http://localhost:${env.port}/api/v1`);
});
startJobs();

// Emails, pushes and ranking updates run after the response is sent. One of them failing must not take
// every other request down with it, which is what Node does with an unhandled rejection by default.
process.on("unhandledRejection", (reason) => {
  console.error("[process] unhandled rejection", reason);
});
// After a synchronous throw nobody caught, the process state is unknown: log it and let the host restart us.
process.on("uncaughtException", (err) => {
  console.error("[process] uncaught exception", err);
  process.exit(1);
});

const SHUTDOWN_TIMEOUT_MS = 10_000;
let stopping = false;

/** Stops taking new requests, lets the ones in flight (webhooks included) finish, then closes the database. */
async function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  console.info(`[process] ${signal}: shutting down`);
  const force = setTimeout(() => {
    console.error(`[process] requests still open after ${SHUTDOWN_TIMEOUT_MS} ms, exiting anyway`);
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  force.unref();
  await stopJobs();
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
    server.closeIdleConnections();
  });
  await shutdownAnalytics();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
