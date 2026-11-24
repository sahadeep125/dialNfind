// Runs next to the website server when the container starts (web/Dockerfile CMD). Pages prerendered during the
// image build hold empty fallback data (the API is not reachable from the builder), so once the server answers,
// this asks it to drop every cached page; the next visit, including Google's, renders real data.
const port = process.env.PORT || "3000";
const base = `http://127.0.0.1:${port}`;
const secret = process.env.REVALIDATE_SECRET || "";

async function main() {
  if (!secret) {
    console.warn("[refresh-cache] REVALIDATE_SECRET is not set: pages built during the image build stay until they expire.");
    return;
  }
  for (let attempt = 1; attempt <= 60; attempt++) {
    try {
      const res = await fetch(`${base}/api/revalidate`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-revalidate-secret": secret },
        body: JSON.stringify({ all: true }),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        console.log("[refresh-cache] dropped the pages cached during the build");
        return;
      }
      console.warn(`[refresh-cache] the website answered ${res.status}; check REVALIDATE_SECRET.`);
      return;
    } catch {
      // The server is still starting.
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  console.warn("[refresh-cache] the website did not start within a minute; cached pages were not refreshed.");
}

main();
