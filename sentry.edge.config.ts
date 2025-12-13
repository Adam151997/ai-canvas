import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Performance Monitoring - lower sample rate for edge
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 0.5,

  // Debug mode in development
  debug: false,

  // Environment tag
  environment: process.env.NODE_ENV || "development",
});
