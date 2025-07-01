if (process.env.ENV !== "production" || !process.env.SENTRY_DSN) {
    console.warn("Sentry is not initialized. Ensure you have set SENTRY_DSN in your environment variables. Or This is a development environment, so Sentry is not initialized.");
    return;
}
// Import with `import * as Sentry from "@sentry/node"` if you are using ESM
const Sentry = require("@sentry/node");

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
});