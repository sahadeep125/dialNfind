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
import { meRouter } from "./routes/me.js";
import { miscRouter } from "./routes/misc.js";
import { adminRouter } from "./routes/admin.js";
import { onboardingRouter } from "./routes/provider/onboarding.js";
import { profileRouter } from "./routes/provider/profile.js";
import { insightsRouter } from "./routes/provider/insights.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigins, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  if (env.nodeEnv !== "test") app.use(morgan("dev"));

  // Every response body goes through toPlain so BigInt ids and Decimals serialize as numbers.
  app.use((_req, res, next) => {
    const json = res.json.bind(res);
    res.json = (body: unknown) => json(toPlain(body));
    next();
  });

  const api = Router();
  api.use("/auth", authRouter);
  api.use("/categories", categoriesRouter);
  api.use("/search", searchRouter);
  api.use("/locations", locationsRouter);
  api.use("/providers", providersRouter);
  api.use("/leads", leadsRouter);
  api.use("/reviews", reviewsRouter);
  api.use("/me", meRouter);
  api.use("/admin", adminRouter);

  const providerPortal = Router();
  providerPortal.use(requireAuth);
  providerPortal.use(onboardingRouter);
  providerPortal.use(profileRouter);
  providerPortal.use(insightsRouter);
  api.use("/provider", providerPortal);

  api.use(miscRouter);

  app.use("/api/v1", api);
  app.get("/", (_req, res) => res.json({ name: "DialNFind API", version: "v1", docs: "/api/v1/health" }));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
