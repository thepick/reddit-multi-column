# Robust feed recovery implementation plan

> **For agentic workers:** Use superpowers:executing-plans. Keep this change dependency-free and on the dedicated fork branch.

**Goal:** recover full-width masonry after navigation without reloading.
**Architecture:** keep the masonry engine; reconnect through DOM and browser lifecycle events. Observe real feed/card geometry and batch work into animation frames.
**Tech stack:** plain JavaScript, WebExtensions, Node's built-in test runner.
**Spec:** ../specs/2026-11-01-robust-feed-design.md

## Global constraints

Preserve MIT attribution, existing options and browser permissions. No external dependencies, telemetry or personal-profile installation.

## Review focus

- Back restores the same feed while its root class is missing.
- Replacement/empty feeds and stale observer callbacks never crash.
- Images, nested batches and same-column-count width changes trigger layout.
- Virtualization keeps prior positions without hiding new/styled cards.
- Invalid/deleted settings and pointer release outside a button recover safely.

## Task 1: Regression tests and layout repair

- [x] Add `tests/content.test.cjs` using `node:test` and `node:vm` with simulated DOM events/geometry.
- [x] Run `node --test tests/*.test.cjs`; confirm lifecycle assertions fail on upstream.
- [x] Modify `src/content.js` as needed for lifecycle/measurement and empty/virtualized feeds; existing CSS sufficed.
- [x] Re-run the suite and syntax checks; inspect changes.

## Task 2: Settings, fork identity and delivery

- [x] Add regression tests for normalization and options behavior; observe failures first.
- [x] Share settings validation in `src/settings.js`; update content/popup, remove page-event storage bridge, and update manifest.
- [x] Retain and label existing options; stop held buttons safely.
- [x] Update README, add manual browser fixture and package/source-review notes.
- [x] Run all checks and independent review; verify material findings and correct them.
- [x] Commit and push the completed fork; produce and inspect an unsigned development ZIP.

Delivery: [pull request 1](https://github.com/thepick/reddit-multi-column/pull/1) holds the completed changes on `fix/robust-feed-layout`. The original fork base remains on `main` until integration is chosen. No personal-browser installation or signing was performed.
