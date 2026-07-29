module.exports = {
  ci: {
    collect: {
      url: [
        "http://127.0.0.1:4173/?audit=1",
        "http://127.0.0.1:4173/__e2e__/storefront-orders?audit=1",
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
