import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Disable debug mode to reduce log noise
  debug: false,

  // Environment tag
  environment: process.env.NODE_ENV || "development",

  // Disable spotlight in dev (causes connection errors)
  spotlight: false,

  // Filter out non-critical errors
  beforeSend(event) {
    if (process.env.NODE_ENV === "development") {
      return null;
    }
    return event;
  },
});
