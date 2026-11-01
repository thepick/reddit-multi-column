# Robust feed recovery

Intent: preserve Reddit Multi-Column's masonry layout and existing options while fixing the reproducible narrow feed after Back navigation in Zen.

Approaches considered: patching Reddit's event methods again would retain the fragile coupling; replacing masonry with CSS columns would change post order and virtualization behavior. Use the existing masonry engine with explicit lifecycle observation instead.

Scope: observe current feed/route changes, Back/Forward and page restoration; reconnect replaced feeds; measure actual feed width; relayout after media or card resizing. Handle empty feeds, nested insertions, narrow windows and invalid settings. Retain upstream masonry positioning, card-style normalization, height measurement and batch spacing, as explicitly requested after overlap appeared in the first fork. Preserve virtualized post positions. Keep MIT attribution, no dependencies, no new permissions, no telemetry. Give the fork a distinct name and Firefox ID.

Options: retain the current controls, validate saved numeric settings, label controls for accessibility and stop repeated button presses when focus or pointer capture ends. Read storage directly from isolated content scripts rather than through page-dispatched events.

Validation: dependency-free Node regression tests with a small DOM fixture, syntax checks, package inspection and independent source review. Mock geometry does not establish real Reddit/Zen layout correctness. Deliver source and an unsigned development ZIP; Mozilla signing and installation in the personal browser remain separate steps.
