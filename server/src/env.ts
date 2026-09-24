import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET", process.env.NODE_ENV === "production" ? undefined : "dev-secret"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "30d",
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3000,http://localhost:5173")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  devOtpCode: process.env.DEV_OTP_CODE ?? "123456",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  appleClientId: process.env.APPLE_CLIENT_ID ?? "",
  paymentGatewayKey: process.env.PAYMENT_GATEWAY_KEY ?? "",
  timezone: process.env.APP_TIMEZONE ?? "Asia/Kolkata",
  /** Public origin of this API, used to build URLs for uploaded files. */
  publicUrl: (process.env.PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 4000}`).replace(/\/$/, ""),
  uploadDir: process.env.UPLOAD_DIR ?? "uploads",
};

export const isProduction = env.nodeEnv === "production";
