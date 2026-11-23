# UI refresh v1

## Scope and baseline

Standalone UI follow-up to release `c7dba63`, not a new domain implementation.
The user requests a neutral dark design, repaired sidebar/theme controls, less
visible copy, and a matching presentation. Preserve the light workspace and all
production-planning calculations, workflow gates, data, and export contracts.

Production scope: `src/main.ts`, `src/styles.css`, `index.html`,
`public/slides.html`, optionally `public/favicon.svg`. Regression scope:
new `tests/e2e/ui-shell.test.ts`. Existing tests and dependencies stay unchanged.
Documentation and generated delivery updates are separately orchestrated.

## Acceptance criteria

1. Use neutral charcoal/slate surfaces and restrained blue accents instead of
   large green surfaces in dark mode and navigation. Preserve light-mode
   readability and structure. Semantic success indicators may remain green.
2. The accessible `Тёмная тема` toggle changes the complete interface, reflects
   state in `aria-pressed`, updates browser theme color, and persists an explicit
   choice across reloads. A fresh visitor starts in light mode. Storage denial
   must not prevent rendering or toggling. Avoid an incorrect-theme first paint.
3. Sidebar links navigate to all six existing sections. Exactly one link exposes
   the current section through `aria-current`; clicking, scrolling, direct hashes,
   and history navigation keep state correct. It remains usable on short desktop
   screens and at 390px width. Do not add a decorative nonfunctional hamburger.
4. Reduce repeated explanations and default-visible prose significantly. Keep
   concise labels, action feedback, data tables, the visible `Учебная симуляция`
   disclosure, and all exact public UI names required by existing tests/exports.
   Optional explanations may use accessible details. Keep important limitations
   available and include them in print. Report before/after visible word counts;
   do not disguise missing data as copy reduction.
5. Refresh the ten-slide presentation with neutral light surfaces, restrained
   blue accents, shorter copy, and clear hierarchy. It must not unexpectedly turn
   green with the operating-system theme. Preserve case numbers, honest simulation
   limitations, ten printable slides, and local navigation. No external resources.
6. Add regression coverage for persistence, blocked storage, actual theme colors,
   sidebar navigation/current state and responsive reachability. Preserve all
   existing tests; no weakening assertions or hidden domain changes.

## Verification and delivery

- Record baseline observations before editing: toggle resets on reload; sidebar
  has no current-state semantics; dark background and sidebar are green. Baseline
  default main content contains 1701 whitespace-separated visible words at the
  captured desktop viewport. These are observed deficiencies, not fabricated RED.
- Run typecheck, lint (zero warnings), formatting, all unit tests with coverage,
  all Chromium E2E (three repetitions, no retries), build, and export checks.
- Inspect both themes at desktop/mobile widths, short desktop height, keyboard
  navigation, slides, accessibility, and browser console. Automated accessibility
  is not a claim of full WCAG conformance.
- Regenerate presentation PDF and backup screenshots from the new build. Preserve
  domain lineage; do not present historical approvals as approvals of this change.
- Obtain independent implementation reviews; record current candidate and checks.
- The authorized publication target is public GitHub repository
  `ddstupin2019/pg-production-planner`. Only the foreground orchestrator may perform
  authorized Git operations. No credentials, dependencies, local browser caches,
  or unrelated files may be published. Do not rewrite existing history.
