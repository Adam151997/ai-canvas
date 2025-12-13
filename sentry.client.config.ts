import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session Replay - capture 10% of sessions, 100% on error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Disable debug mode to reduce log noise
  debug: false,

  // Environment tag
  environment: process.env.NODE_ENV || "development",

  // Filter out non-critical errors
  beforeSend(event) {
    // Don't send events in development
    if (process.env.NODE_ENV === "development") {
      return null;
    }
    return event;
  },

  // Integrations
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
