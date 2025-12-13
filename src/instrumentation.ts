// Instrumentation file (Sentry disabled)
// To enable Sentry, uncomment the imports and configure SENTRY_DSN

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Sentry server config would be imported here
    console.log("Instrumentation: Node.js runtime registered");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    // Sentry edge config would be imported here
    console.log("Instrumentation: Edge runtime registered");
  }
}

// Sentry request error capture disabled
// export const onRequestError = Sentry.captureRequestError;
