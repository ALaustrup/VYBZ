module.exports = {
  ci: {
    collect: {
      // Static premium shells (ADR-025). `npm run perf:audit` is the gate CI runs and
      // uses these same URLs; do not point this at an /__e2e__ route — fixtures are
      // compiled out of production builds.
      url: [
        "http://127.0.0.1:4173/perf-audit.html",
        "http://127.0.0.1:4173/perf-orders.html",
      ],
      numberOfRuns: 1,
      settings: {
        preset: "desktop",
        chromeFlags: "--no-sandbox --disable-dev-shm-usage",
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.9 }],
        "categories:best-practices": ["error", { minScore: 0.9 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci",
    },
  },
};
