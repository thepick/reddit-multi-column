# Reddit Multi-Column Robust

Independent fork of [Pedro's Reddit Multi-Column](https://github.com/pedrosouu/reddit-multi-column), based on `1e64ccda36ae79bdfcfe02d06e6c9781a5ff0ffa` (version 2026.10.30). Original MIT license and attribution are retained in [LICENSE.txt](LICENSE.txt).

Displays Reddit posts in configurable masonry columns. Retains maximum columns, minimum/maximum column widths, non-feed content width and both right-sidebar modes.

## Changes in 2026.11.1.2

Keeps the outgoing feed's own container at feed width while Reddit changes the URL and then replaces its DOM. New post-detail containers keep their normal width, including when the outgoing feed remains visible briefly. Feed-only sidebar hiding stays scoped to the outgoing feed. This removes the URL-first transition that could momentarily crunch the columns. Upstream masonry is unchanged.

## Changes in 2026.11.1.1

Restores the original extension's masonry arrangement, card-style reset, height measurement and batch spacing. The navigation recovery, visibility observation and settings repairs remain. No artificial card gaps or content clipping are added.

The earlier fork retained inline card styles that upstream replaces. A browser regression with a stale fixed height and transform reproduces overlapping content with that approach and passes with the upstream method. The original layout engine intentionally replaces card inline styles before measuring them.

## Changes in 2026.11.1

- Reconnects the feed after Back/Forward, cached-page restoration and Reddit DOM/route replacement.
- Restores feed mode even when Reddit reuses the existing feed node.
- Observes actual feed and card sizes, including image/video height changes.
- Batches layout into animation frames without replacing Reddit's event methods.
- Handles empty feeds, nested cards, narrow windows and removed settings.
- Retains off-screen post positions while virtualization placeholders exist, and reconnects recreated cards by Reddit post ID. Releases removed post references when placeholders disappear.
- Reads validated settings directly in isolated extension scripts; removes the page-event storage bridge.
- Labels numeric inputs/buttons and stops held buttons on pointer release, cancellation or window blur.
- Uses a separate Firefox extension ID and declares no data collection. No new permissions or dependencies.

## Development installation

This fork is **not the upstream store extension**. An unsigned ZIP is a development package, not a permanent signed installation.

1. Disable the original Reddit Multi-Column extension while testing this fork; running both can apply competing layouts.
2. Extract the development ZIP, or use this repository's `src` directory.
3. In Zen/Firefox, open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select `src/manifest.json` (or `manifest.json` in the extracted ZIP).
4. Reload an existing Reddit tab. Configure the fork from its toolbar button.

A temporary installation ends when the browser restarts. The separate ID means the original extension's settings do not migrate automatically. Record your current values and re-enter them in the fork.

For a permanent Firefox-compatible installation, submit the ZIP for Mozilla signing, optionally as an **unlisted** extension. See [Mozilla signing and distribution](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/). Signing, account authentication, store publication and installation in a personal browser are not part of this source release. Do not disable signature checks.

## Verification

Requires an already-installed recent Node.js. There are no packages to install.

```text
node --test tests/*.test.cjs
node tests/browser-check.cjs
```

The browser check uses installed Microsoft Edge by default (Windows). Set `RMC_BROWSER` to another Chromium executable if needed. It creates a fresh temporary profile and serves only the public fixture and its source assets through an allowlisted loopback server, so real history navigation can be tested without Internet access. It closes its server and its own browser process. It never opens your personal profile. An operating-system lock may leave its empty test profile in the temporary directory.

The fixture checks width recovery, card resizing, same-column-count feed resizing, empty/replaced feeds, nested insertion and page restoration. Unit tests additionally cover settings, post-route exclusion, virtualization and options-button cancellation.

These checks do not establish compatibility with every Reddit experiment, other extension, or future DOM change. Recreated virtualized cards require a stable `shreddit-post` or article ID to reclaim a detached slot. Test real feed → post → Back/Forward, infinite scrolling and sidebar toggling in Zen before relying on this as your daily extension. Browser fixture execution does not test WebExtension injection or Mozilla signing.

To build a development ZIP, archive the **contents** of `src`, with `manifest.json` at the ZIP root. Include `LICENSE.txt` from the repository root. Do not include tests, browser profiles or local logs.
