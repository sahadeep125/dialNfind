import { createApp } from "./app.js";
import { env } from "./env.js";
import { prisma } from "./lib/prisma.js";

const app = createApp();
const server = app.listen(env.port, () => {
  console.log(`DialNFind API listening on http://localhost:${env.port}/api/v1`);
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
