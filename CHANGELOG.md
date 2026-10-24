## 1.7.6.1 — QR generation hotfix
- Restored the proven QR target used in v1.7.5: the direct memorial URL.
- One QR still supports obituary + livestream because the memorial page contains the livestream action.
- Kept the optional two-choice links page for compatibility, but QR generation no longer depends on it.

## 1.7.6 — Dual-destination memorial QR

- Added an optional livestream URL to both Creator Studio and the standalone Obituary Writer.
- A single permanent memorial QR now opens an Always & Forever destination page with View Obituary and Watch Livestream choices.
- The QR target stays stable, so the livestream URL can be changed later without reprinting the QR code.
- Added a Watch Livestream button to the public memorial page when a livestream URL is configured.
- Kept all v1.7.5 mobile sharing and admin Clear / New Obituary functionality.

# Changelog

## 1.7.5 — Mobile social sharing and admin reset

- Added persistent share controls directly to standalone memorial pages so mobile visitors can continue sharing after arriving from Facebook or another app.
- Added native More Share Options, Facebook, WhatsApp, SMS, email, copy-link, and QR-download actions.
- Added More Share Options to both obituary-writer experiences.
- Added administrator-only Clear / New Obituary workflow that creates a fresh project without deleting the previously published memorial.
- Preserved WooCommerce customer access rules and test-access protection.

## 1.7.4.2 — Obituary generation reliability

- Fixed a standalone Obituary Writer failure mode where entered details could appear to disappear after Generate Obituary.
- Added local draft preservation and restoration.
- Saves the obituary draft server-side before AI generation.
- Prevents accidental form navigation and improves generation status/error handling.

## 1.7.4 — Social memorial sharing
- Added Share QR Image to both Creator Studio and the standalone Obituary Writer.
- Creates a square 1080×1080 Always & Forever PNG QR card for social sharing.
- Uses the phone/tablet native share sheet when available, allowing compatible apps such as Instagram, Facebook, Messages, and more.
- Added direct Facebook, X, WhatsApp, and Email memorial-link sharing.
- Desktop fallback downloads the social QR image for manual upload.
- Existing payment protection and secure obituary test access remain unchanged.

## 1.7.3 — Secure obituary test access

- Adds a private `/test-obituary` owner/admin test login.
- Adds `OBITUARY_TEST_KEY` as a Cloudflare secret configured with `connect-obituary-test-access.cmd`.
- Test access creates a signed two-hour administrator session and bypasses WooCommerce only for that authorized session.
- Customer payment and entitlement checks are unchanged.
- Test key is submitted by POST and is not placed in the URL.

## 1.7.2 — Standalone obituary memorials
- Fixed `/memorial/*` Worker routing.
- Added standalone `/obituary-writer` page for obituary-only purchases.
- Obituary-only WooCommerce access now lands on the standalone writer.
- Memorial QR links open independent memorial pages with no video requirement.
- Refined public memorial design in Always & Forever black/gold styling.

# Changelog

## 1.7.1 — Memorial QR sharing
- Automatically creates a permanent, unguessable memorial share link after an obituary is generated or saved.
- Generates a high-error-correction SVG QR code locally with the existing QR library; no paid QR API is required.
- Adds View Memorial, Download QR Code, Copy Memorial Link, and Print QR Code actions.
- Adds a clean public memorial page containing the saved obituary and memorial QR code.
- Memorial pages are marked noindex/nofollow and are only reachable with their random share token.

## 1.7.0

- Added the Creator Studio AI Obituary Writer.
- Added all guided family, life, service, faith, and memory fields.
- Added five tone choices and three length choices.
- Added freeform Write from memories generation.
- Added server-side OpenAI Responses API integration with a Cloudflare secret.
- Added editable, regeneratable obituary output saved in the existing D1 project JSON.
- Added Shotstack-ready memorial video narration generation.

## 1.6.0

- Added Shotstack final rendering, private delivery, sharing, and QR codes.
