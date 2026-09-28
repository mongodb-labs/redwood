# redwood
Redirect network requests for assets to test production services with local changes.

## Installation
1. Clone this repo.
1. Open Chrome [extensions](chrome://extensions/) (`chrome://extensions/`).
1. Enable `Developer Mode` (top right checkbox).
1. Click `Load unpacked extension`.
1. Choose the cloned repo.

## Attribution
Originally forked from https://github.com/jjgonecrypto/chrome-envious (MIT LICENSE)

## CSP headers
While Redwood is active, it also strips `Content-Security-Policy` and
`Content-Security-Policy-Report-Only` headers from page responses. Scripts served
by the local Rspack dev server rely on `eval`, which would otherwise violate the
CSP emitted by remote environments (e.g. cloud-dev) and flood Sentry with
violation reports.
