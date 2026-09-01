// PharmaTimer -- configurazione eslint MINIMA, senza plugin.
// Deliberatamente priva di import: `npm i -D eslint` basta, nessun pacchetto
// aggiuntivo. Le regole sono quelle che pagano su questo codice -- variabili e
// import morti, riferimenti non definiti -- e non uno stile imposto.
// I test non sono esclusi: usano `globals: false` in vitest.config.js, quindi
// importano cio che usano e no-undef li esercita davvero.
export default [
  {
    ignores: [
      "node_modules/**", "dist/**", "dist-mini/**", "backend/**",
      "**/*.bak", "**/*.bak.*", "coverage/**",
    ],
  },
  {
    files: ["src/**/*.js", "src/**/*.jsx", "*.js", "*.mjs", "scripts/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        // browser
        window: "readonly", document: "readonly", navigator: "readonly",
        localStorage: "readonly", sessionStorage: "readonly", indexedDB: "readonly",
        location: "readonly", history: "readonly", fetch: "readonly",
        console: "readonly", crypto: "readonly", globalThis: "readonly",
        setTimeout: "readonly", clearTimeout: "readonly",
        setInterval: "readonly", clearInterval: "readonly",
        requestAnimationFrame: "readonly", cancelAnimationFrame: "readonly",
        Notification: "readonly", Audio: "readonly", Blob: "readonly",
        URL: "readonly", TextEncoder: "readonly", TextDecoder: "readonly",
        AbortController: "readonly", Event: "readonly", CustomEvent: "readonly",
        matchMedia: "readonly", alert: "readonly", confirm: "readonly",
        // node, per i file di configurazione e gli script
        process: "readonly", __dirname: "readonly", Buffer: "readonly",
        global: "readonly",
        // Simboli MISURATI come mancanti alla prima passata (43 no-undef,
        // tutti artefatti di questa lista e nessuno un difetto del codice).
        structuredClone: "readonly", HTMLElement: "readonly",
        Element: "readonly", HTMLAnchorElement: "readonly",
        Storage: "readonly", ResizeObserver: "readonly",
        getComputedStyle: "readonly",
      },
    },
    // SPENTO deliberatamente: il codice porta eslint-disable che citano regole
    // di plugin non installati (react-hooks, react/prop-types) e regole non
    // attivate qui (no-console, no-alert). Segnalarle misura la configurazione,
    // non il codice: 20 reperti su 75 alla prima passata erano questo.
    linterOptions: { reportUnusedDisableDirectives: false },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-unreachable": "error",
      "no-constant-condition": ["error", { checkLoops: false }],
      "no-dupe-keys": "error",
      "no-dupe-args": "error",
      "no-duplicate-case": "error",
      "no-empty": ["warn", { allowEmptyCatch: false }],
      "no-fallthrough": "error",
      "no-self-compare": "error",
      "require-atomic-updates": "warn",
      "eqeqeq": ["warn", "smart"],
    },
  },
];
