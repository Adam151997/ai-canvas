// Sentry server configuration (disabled)
// To enable Sentry, configure your SENTRY_DSN environment variable

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  // Sentry would be initialized here when DSN is provided
  console.log("Sentry server: DSN found but initialization disabled");
}
