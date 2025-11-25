import { createApp } from "vue"
import * as Sentry from "@sentry/vue"
import App from "./App.vue"
import "./index.css"

const app = createApp(App)

// Configuration Sentry (uniquement en production)
if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    app,
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: 0.1, // 10% des transactions
    // Session Replay
    replaysSessionSampleRate: 0.1, // 10% des sessions
    replaysOnErrorSampleRate: 1.0, // 100% des sessions avec erreurs
    // Environnement
    environment: import.meta.env.MODE,
  })
}

app.mount("#app")

