# Review and verification — 2026.11.1

November 1, 2026 (Asia/Bangkok).

An independent native reviewer inspected the actual diff, new source and tests against upstream `1e64ccda36ae79bdfcfe02d06e6c9781a5ff0ffa`. No new permission/dependency or private-data exposure concerns were found. This is a source review, not a malware guarantee.

Confirmed review findings, reproduced and fixed with failing-then-passing tests:

- Arbitrary `comments`/`s` URL segments incorrectly excluded similarly named subreddits. Route checks now match post/share structures.
- A first hidden cached feed could take precedence over a visible replacement. Candidate feeds are measured and watched for visibility changes; the real-browser fixture tests switching and reactivation.
- A delayed initial settings read could erase changes, pointer steps before release, or uncommitted typing. Edited controls are protected as soon as interaction begins.

The reviewer also identified a conditional virtualization gap: a recreated node could be appended after its detached prior slot. A regression test confirmed the behavior with stable IDs. Recreated cards now recover that slot by `shreddit-post`/article ID. No reliable identity can be inferred if Reddit removes or changes all IDs; that remains a compatibility limit.

Primary checks also caught and fixed premature nested-batch height resets. All 27 current unit tests pass. All 13 offline layout checks pass in fresh headless Microsoft Edge and Zen 1.24b profiles, including native event-method preservation, full width on Back/page restoration, card resizing, actual feed resizing, empty/replaced/nested feeds and hidden-feed transitions. No observer-loop/browser errors were reported by the fixture.

DeepSeek's authorized local settings/options review was attempted, but its response failed the plugin's finding-structure validation. No DeepSeek findings were treated as review evidence; the native reviewer supplied independent coverage.

Unverified: actual WebExtension injection into authenticated Reddit, all Reddit virtualization variants, personal-extension interactions and a signed permanent installation. The original symptom was reproduced in the personal Zen browser before development; the modified extension has not been installed there.
