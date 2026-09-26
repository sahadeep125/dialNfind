import express, { Router } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./env.js";
import { toPlain } from "./lib/serialize.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { requireAuth } from "./middleware/auth.js";
import { authRouter } from "./routes/auth.js";
import { categoriesRouter } from "./routes/categories.js";
import { searchRouter } from "./routes/search.js";
import { locationsRouter } from "./routes/locations.js";
import { providersRouter } from "./routes/providers.js";
import { leadsRouter } from "./routes/leads.js";
import { reviewsRouter } from "./routes/reviews.js";
import { meRouter, pushTokensRouter } from "./routes/me.js";
import { miscRouter } from "./routes/misc.js";
import { adminRouter } from "./routes/admin.js";
import { supportRouter } from "./routes/support.js";
import { uploadsRouter } from "./routes/uploads.js";
import { UPLOAD_ROUTE, uploadDir } from "./storage/index.js";
import { onboardingRouter } from "./routes/provider/onboarding.js";
import { profileRouter } from "./routes/provider/profile.js";
import { insightsRouter } from "./routes/provider/insights.js";
import { billingRouter } from "./routes/provider/billing.js";
import { webhooksRouter } from "./routes/webhooks.js";
import { INVOICE_PDF_ROUTE, renderInvoicePdf } from "./services/invoices.js";
import { prisma } from "./lib/prisma.js";
import { limits } from "./lib/rate-limit.js";
import path from "node:path";
import { checkFileSignature, PRIVATE_FILES_ROUTE, privateDir, signPrivateUrls } from "./lib/private-files.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({ origin: env.corsOrigins, credentials: true }));
  // Payment webhooks read the raw body to check signatures, so they come before the JSON parser.
  app.use("/api/v1/webhooks", webhooksRouter);
  app.use(express.json({ limit: "1mb" }));
  if (env.nodeEnv !== "test") app.use(morgan("dev"));

  // Every response body goes through toPlain so BigInt ids and Decimals serialize as numbers, and
  // private document URLs become signed, time-limited links.
  app.use((_req, res, next) => {
    const json = res.json.bind(res);
    res.json = (body: unknown) => json(signPrivateUrls(toPlain(body)));
    next();
  });

  // Uploaded files. Keys are random UUIDs, so they can be cached forever.
  app.use(UPLOAD_ROUTE, express.static(uploadDir, { immutable: true, maxAge: "365d", index: false, dotfiles: "deny" }));

  // Private documents: only with a valid signature from signPrivateUrls, never cached by browsers or proxies.
  app.get(`${PRIVATE_FILES_ROUTE}/*key`, limits.global, (req, res) => {
    const key = ([] as string[]).concat(req.params.key as string | string[]).join("/");
    const file = path.resolve(privateDir, key);
    const query = req.query as Record<string, string | undefined>;
    if (!file.startsWith(privateDir + path.sep) || !checkFileSignature(key, query.exp, query.sig)) {
      res.status(403).json({ error: { code: "forbidden", message: "This link has expired. Reload the page to get a new one." } });
      return;
    }
    res.set("Cache-Control", "private, no-store");
    res.sendFile(file, { dotfiles: "deny" }, (err) => {
      if (err && !res.headersSent) res.status(404).json({ error: { code: "not_found", message: "File not found" } });
    });
  });

  // Invoice PDFs, through signed links that expire after an hour (see services/invoices.ts).
  app.get(`${INVOICE_PDF_ROUTE}/:file`, limits.global, async (req, res) => {
    const file = req.params.file as string;
    const query = req.query as Record<string, string | undefined>;
    const m = /^(\d+)\.pdf$/.exec(file);
    if (!m || !checkFileSignature(file, query.exp, query.sig)) {
      res.status(403).json({ error: { code: "forbidden", message: "This link has expired. Reload the page to get a new one." } });
      return;
    }
    const invoice = await prisma.invoice.findUnique({ where: { id: BigInt(m[1]) } });
    if (!invoice) {
      res.status(404).json({ error: { code: "not_found", message: "Invoice not found" } });
      return;
    }
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${invoice.number.replace(/\//g, "-")}.pdf"`, "Cache-Control": "private, no-store" });
    res.send(await renderInvoicePdf(invoice));
  });

  const api = Router();
  api.use(limits.global);
  api.use("/auth", authRouter);
  api.use("/categories", categoriesRouter);
  api.use("/search", limits.search, searchRouter);
  api.use("/locations", limits.search, locationsRouter);
  api.use("/providers", providersRouter);
  api.use("/leads", leadsRouter);
  api.use("/reviews", reviewsRouter);
  api.use("/me/push-tokens", pushTokensRouter);
  api.use("/me", meRouter);
  api.use("/admin", adminRouter);
  api.use("/uploads", limits.uploads, uploadsRouter);
  api.use("/support", supportRouter);

  const providerPortal = Router();
  providerPortal.use(requireAuth);
  providerPortal.use(onboardingRouter);
  providerPortal.use(profileRouter);
  providerPortal.use(insightsRouter);
  providerPortal.use(billingRouter);
  api.use("/provider", providerPortal);

  api.use(miscRouter);

  app.use("/api/v1", api);
  app.get("/", (_req, res) => res.json({ name: "DialNFind API", version: "v1", docs: "/api/v1/health" }));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
