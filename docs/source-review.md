# Source review and execution scope

Reviewed November 1, 2026 (Asia/Bangkok), for the requested fork and robustness repair.

Origin: the Mozilla listing's support link identifies `pedrosouu/reddit-multi-column`. Exact upstream commit: `1e64ccda36ae79bdfcfe02d06e6c9781a5ff0ffa` (2026.10.30). The full recursive Git tree was inspected, including dotfiles, all scripts/HTML/CSS/manifest, README/license, icons and bundled font. There are no submodules, dependency manifests, installers, package hooks, CI workflows or executable payloads in that tree. Static images and font bytes were inventoried; they were not independently audited with binary analyzers.

The manifest limits page access to `https://www.reddit.com/*` and requests extension storage. Source uses synced settings and page DOM layout. No source path reads unrelated files, credentials or browser cookies, makes fetch/XHR requests, executes downloaded code or installs persistence. The original MAIN-world page-event bridge and document event-method overrides were reliability concerns and are removed in this fork.

Decision: proceed with source editing and dependency-free regression checks of this already-installed extension's reviewed code. Checks use controlled synthetic DOM/browser fixtures and fresh browser profiles. No package installation or candidate build scripts are needed. The Node VM fixture is a testing mechanism, not an operating-system security boundary. Neither a clean source read nor passing tests guarantees absence of malicious behavior.

Changed execution configuration: the fork uses isolated content scripts (`settings.js`, then `content.js`), the same Reddit match and storage permission, a distinct ID, no external dependencies and no data collection. Independently review final source before delivery. No installed-profile modification, signing, store submission or personal-browser installation is authorized by this report itself.

Coverage limits: no antivirus/dependency advisory scan was run (no external package dependencies); binary assets, all Reddit variants and interactions with personal extensions are not fully verified. Any later source/dependency/manifest/install-command changes require a scoped recheck.
