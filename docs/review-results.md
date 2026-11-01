# Review and verification — 2026.11.1.2

November 1, 2026 (Asia/Bangkok).

An independent native reviewer inspected the actual diff, new source and tests against upstream `1e64ccda36ae79bdfcfe02d06e6c9781a5ff0ffa`. No new permission/dependency or private-data exposure concerns were found. This is a source review, not a malware guarantee.

Confirmed review findings, reproduced and fixed with failing-then-passing tests:

- Arbitrary `comments`/`s` URL segments incorrectly excluded similarly named subreddits. Route checks now match post/share structures.
- A first hidden cached feed could take precedence over a visible replacement. Candidate feeds are measured and watched for visibility changes; the real-browser fixture tests switching and reactivation.
- A delayed initial settings read could erase changes, pointer steps before release, or uncommitted typing. Edited controls are protected as soon as interaction begins.

The reviewer also identified a conditional virtualization gap: a recreated node could be appended after its detached prior slot. A regression test confirmed the behavior with stable IDs. Recreated cards now recover that slot by `shreddit-post`/article ID. No reliable identity can be inferred if Reddit removes or changes all IDs; that remains a compatibility limit.

The arrangement function now retains upstream's card-style reset, integer height measurement, column placement and batch accounting. Its only functional addition is a disconnected/empty-feed safety guard. Navigation, settings and visibility recovery remain separate. No added card gaps or clipping are used. A regression with a stale inline height and transform reproduces overlapping content before restoration and passes afterward.

All 32 current unit tests pass. All 18 offline layout checks pass in fresh headless Microsoft Edge and Zen 1.24b profiles, including native event-method preservation, full width on Back/page restoration, card sizing/overlap, actual feed resizing, empty/replaced/nested feeds and hidden-feed transitions. No observer-loop/browser errors were reported by the fixture.

Follow-up independent review reproduced a cached-feed column mismatch after changing the column limit on another feed. Reconnection now clears stale column assignments outside the original arrangement function. Explicitly hidden cards are excluded before the upstream style reset, preserving filter hiding without changing masonry. Both cases have failing-then-passing regressions.

The URL-first transition test uses real history navigation with delayed DOM replacement. It reproduced momentary feed narrowing in 2026.11.1.1. Width is now scoped to the active/outgoing feed container instead of all containers through the route class. Independent review found the initial global-class fix could widen a concurrently opening post; an added coexistence regression reproduces that issue and passes with container scoping. Post-page recommendations do not activate feed width. Feed-only sidebar behavior is retained on the outgoing container. The public fixture server binds only loopback and serves an explicit four-file allowlist.

DeepSeek's authorized local settings/options review was attempted, but its response failed the plugin's finding-structure validation. No DeepSeek findings were treated as review evidence; the native reviewer supplied independent coverage.

Unverified: actual WebExtension injection into authenticated Reddit, all Reddit virtualization variants, personal-extension interactions and a signed permanent installation. The original symptom was reproduced in the personal Zen browser before development; the modified extension has not been installed there.
