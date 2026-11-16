import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 8000,
    testIsolation: true,
    supportFile: "cypress/support/e2e.ts",
    setupNodeEvents(on, config) {
      // Configuración de eventos de ciclo de vida si fuera necesario
    },
  },
});

