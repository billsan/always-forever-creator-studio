# Always & Forever Creator Studio — Cloudflare

## Version 1.7.4.2 Obituary Draft Recovery

This release adds social sharing to the Memorial QR section in both Creator Studio and the standalone Obituary Writer.

- **Share QR Image** builds a branded 1080×1080 PNG containing the memorial QR code.
- On supported phones and tablets it opens the native share sheet, so the customer can choose compatible installed apps such as Instagram, Facebook, Messages, Mail, and more.
- Direct **Facebook**, **X**, **WhatsApp**, and **Email** buttons share the standalone memorial-page link.
- On desktop browsers that cannot share image files directly, Share QR Image downloads the PNG so it can be uploaded manually.
- The QR still points directly to the standalone memorial page; no memorial video is required.
- WooCommerce customer access and the private two-hour obituary test mode remain unchanged.

## Version 1.7.3 Secure Obituary Test Access

This release adds a private owner/admin test path so the standalone AI Obituary Writer can be tested without purchasing the WooCommerce product. Customer payment protection remains unchanged.

1. Run `connect-obituary-test-access.cmd` once.
2. Enter a long private test key when Wrangler prompts for `OBITUARY_TEST_KEY`.
3. After deployment, open `/test-obituary` on the Creator Studio domain.
4. Enter the same private test key. A two-hour administrator test session is created and the browser is redirected to `/obituary-writer`.

The key is submitted by POST, never included in the test URL, and the resulting session cookie is `HttpOnly`, `Secure`, and `SameSite=Lax`. Do not share the test key with customers.


This package runs Creator Studio with Cloudflare Workers, D1, private R2 storage, WooCommerce access, and Shotstack final rendering.

## Version 1.7.0 AI Obituary Writer

- Open Obituary from the Creator Studio tool rail.
- Complete guided life-story fields or use Write from memories.
- Choose Traditional, Warm & Personal, Celebration of Life, Faith-Based, or Short Newspaper Style.
- Choose Short, Standard, or Detailed length.
- Generate, edit, regenerate, and save the obituary inside the existing memorial project.
- Create a shorter memorial-video narration for the existing Shotstack workflow.
- Run `connect-openai.cmd` once to save the OpenAI API key as a Cloudflare secret and deploy.
- The OpenAI model is configurable through `OPENAI_MODEL` in `wrangler.jsonc`.

## Version 1.6.0 Rendering, Delivery, Sharing, and QR

- Run `connect-shotstack-rendering.cmd` once and enter the Shotstack sandbox API key.
- Customer source files are exposed to Shotstack only through signed, expiring render URLs.
- Creator Studio submits the timeline, polls Shotstack, and transfers the completed MP4 to private R2 storage.
- Paid customers receive a private download link after the render finishes.
- Customers can optionally create an unlisted share page and QR code. Anyone with that share link can watch; downloads remain account-protected.
- Sandbox mode is the safe testing default. Change `SHOTSTACK_ENVIRONMENT` from `stage` to `v1` only when the production Shotstack key is configured and live billing is intended.

## Version 1.5.0 WooCommerce Paid Access

- WordPress product `2698`: 40 photos, 2 songs, up to 7 minutes.
- WordPress product `2699`: 60 photos, 3 songs, up to 12 minutes.
- WordPress product `2700`: 90 photos, 4 songs, up to 18 minutes.
- Install the separate `aaf-creator-studio-woocommerce` plugin on alwaysandforever.life.
- In WordPress, open Settings > AAF Creator Studio and copy the Shared Secret.
- Run `connect-woocommerce-access.cmd` in this Cloudflare package and paste that same secret when requested.
- Customers open Studio from My Account > Video Studio after payment.
- WordPress administrators use My Account > Video Studio without purchasing and retain access to the original test projects.

## Version 1.4.0 Safe Music and Media Cleanup

- Run `connect-safe-music-admin.cmd` once to create the catalog table, set the private administrator key, and deploy.
- Open `https://studio.alwaysandforever.life/safe-music-admin.html` and enter that key.
- New music remains inactive until its rights record has been reviewed and the track is published.
- Keep signed agreements outside the public site; enter the contract number or private document location in the track record.
- Media cards have a delete button. Files still used by a timeline item, collage, or motion background are protected from deletion.

## Version 1.3.0 Photo Preparation

- Select a photo slide and open Photo Prep
- Remove the background through the remove.bg API
- Store the resulting transparent PNG privately in R2
- Preserve the original upload in Media
- Replace only the selected slide with the cutout
- Keep the API key in the `REMOVE_BG_API_KEY` Cloudflare secret

After deploying, obtain a remove.bg API key and run `connect-background-removal.cmd` once. Background removal is limited to the provider's supported 22 MB input size. The Worker bounds the input before buffering it and streams the processed PNG directly back to R2.

The Safe Music panel is intentionally marked pending until Always & Forever has written sublicensing rights for actual tracks. Paid social release remains gated on replacing the current demo identity with production customer authentication and WooCommerce entitlement verification.

## Version 1.2.0 Dramatic Breakthroughs

- Photo explodes forward through moving clouds
- Heavenly gateway entrance
- Garden scene breakthrough
- Rose-petal burst
- Confetti breakthrough
- Fireworks entrance
- Golden-light breakthrough
- Vintage film-burn breakthrough

These dramatic actions are optional per slide and appear separately from the existing gentle cinematic actions.

## Version 1.1.0 Cinematic Photo Actions

- Newly added photos start clean with no motion, effect, frame, or cinematic action
- Filling a template placeholder also clears inherited styling from that placeholder
- Heavenly Clouds remains as the sole built-in motion background
- Uploaded MP4 motion clips can be categorized as Memorial, Wedding, Birthday, Anniversary, Faith, Nature, or General
- Per-slide cinematic reveals include moving clouds, heavenly light, remembrance dissolve, garden veil, rose petals, celebration sparkle, color bloom, golden wipe, vintage film, slow zoom, and left/right pans
- One button clears all styling from the selected slide

## Version 1.0.0 Slide Composer

- Per-photo lighten and darken control
- Timed, draggable text over photos, multi-photo slides, and video intros
- Per-slide No Motion choice and independent frame styling
- Two-, three-, and four-photo slide layouts
- Classic, gold, Polaroid, soft, or no frame on each selected slide
- Smoother mobile audio that avoids repeated corrective seeking during playback

## Version 0.9.0 Editor Improvements

- Mobile-safe music preview activation for phones and tablets
- Drag selected text directly on the slide to give every slide its own placement
- Move Earlier and Move Later controls for dependable slide sorting on touchscreens
- Transparent captions and text overlays
- Non-destructive old-photo correction presets for fading, contrast, color, and black-and-white clarity

The photo correction presets preserve the original uploaded file. Repairing scratches, tears, missing areas, or damaged faces will require a separately configured AI restoration provider so customers can review that reconstructed result before using it.

## Version 0.8.0 Motion Backgrounds

- 15 animated scenic backgrounds that apply independently to a selected slide
- Clouds, rivers, mountain mist, waterfalls, ocean sunsets, gardens, petals, candlelight, stars, sunrise, wedding lights, confetti, fireworks, and autumn forest scenes
- Uploaded MP4 videos can be used as private looping slide backgrounds
- Framed, soft-frame, and full-screen blend foreground treatments
- Per-slide darkening and blur controls keep foreground photos and text readable
- Motion backgrounds, text overlays, and curated effects can be combined on the same slide

## Version 0.7.0 Expanded Effects Library

- 36 total per-slide effects, including 24 new collections
- New collection filter for Memorial, Wedding, Birthday, Anniversary, Faith, Nature, Seasonal, Vintage, and General effects
- New effects include snow, rose petals, autumn leaves, butterflies, hearts, bubbles, fireflies, stars, clouds, sunbeams, candlelight, doves, silver sparkle, gold dust, confetti, balloons, fireworks, disco bokeh, vintage film, sepia leaks, Polaroid framing, watercolor, floral corners, and lace
- Every effect remains independent per slide with Subtle and Full intensity

## Version 0.6.0 Per-Slide Curated Effects

- All 12 original templates now have a matching animated effect collection
- Effects apply only to the selected slide, never automatically across the whole show
- Each slide independently stores its effect and Subtle or Full intensity
- Effects can be mixed freely or removed from one slide without changing other slides
- New packs include rays, leaves, petals, pearl shimmer, candle glow, confetti, stars, film dust, light leaks, bokeh, and gold flecks
- Applying a complete template adds its signature effect only to the opening and closing scenes
- Existing global Gentle Light projects are safely migrated to the first slide

## Version 0.5.0 Positioned Slide Text

- Opening titles are inserted as the first scene instead of at the end
- Slide headings, photo captions, quotes, verses, and person details are overlays on the selected slide
- Person Details includes editable name, birth date, passing date, and room for additional lines
- Seven text positions: top, center, and bottom with left, center, and right alignment
- Adjustable text size, color, start time, and duration
- Multiple text overlays may appear on the same slide
- Overlay blocks can be dragged horizontally on the Words track

## Version 0.4.3 Preview Navigation and Timed Captions

- Previous and next controls now move between story scenes
- The preview scrubber can seek to any point in the story
- Captions are timed overlays instead of extra slides at the end
- Caption blocks can be dragged horizontally on the Words track
- Caption Start and Duration remain editable in the Details panel
- Existing caption items are migrated when a project opens

## Version 0.4.2 Master Preview Clock

- A continuous master clock now drives slides, video, music, the time display, scrubber, and timeline playhead
- The red timeline marker moves smoothly throughout preview
- Music remains synchronized with its configured start time, play length, and volume
- Preview and Stop control every participating media track together

## Version 0.4.1 Synchronized Music Preview

- Music and voice clips now start with the main Preview button
- Audio start time, play length, and volume are honored during preview
- Stop ends the visual preview and every active audio track together
- Browser playback and media-loading errors now display a useful message

## Version 0.4.0 Gentle Light Effects

- Curated Gentle Light effect pack with animated rays, floating dust, and a soft vignette
- None, Subtle, and Full intensity controls in the new Effects panel
- Effect choices are saved with the project and included in undo/redo history
- The Gentle Light memorial template applies the subtle effect automatically
- Motion is disabled automatically when a visitor has reduced-motion enabled

## Version 0.3.0 Template Library

- 12 original starter templates across memorial, wedding, birthday, anniversary, and general occasions
- Category filters, palettes, summaries, and responsive-format metadata
- Seven-scene layouts with opening, section, closing, and replaceable photo slots
- Select a photo slot and choose media to fill it without losing uploaded files
- Existing projects and uploaded media remain intact until a user confirms applying a template

## Bound resources

- Worker: `aaf-creator-studio`
- D1 binding: `DB` → `aaf-creator-db`
- R2 binding: `MEDIA` → `aaf-creator-media`
- Static asset binding: `ASSETS`

## Before deployment

1. Apply `schema.sql` to the remote D1 database.
2. On Windows, double-click `deploy-studio.cmd` and approve the Cloudflare sign-in in your browser.
3. Alternatively, run `npm install`, `npx wrangler login`, and `npm run deploy` from a terminal.

For an existing installation, double-click `update-studio.cmd`.

## Security and operating notes

Files are private in R2 and served only after ownership checks. Render-source links are signed and expire after 24 hours. Share pages are optional and unlisted, but anyone who receives a share link can watch that video. Uploads are currently capped at 95 MB per file.

## Memorial QR sharing (v1.7.2)
After an obituary is generated or saved, Creator Studio creates an unlisted memorial page and a permanent SVG QR code. The obituary panel includes View Memorial, Download QR Code, Copy Memorial Link, and Print QR Code actions. QR generation uses the bundled `qrcode` package and does not require a third-party QR service.


## v1.7.2 — Standalone Obituary Memorials
- Fixes Cloudflare asset routing so `/memorial/*` is handled by the Worker instead of the Creator Studio SPA.
- Adds a dedicated `/obituary-writer` experience for standalone obituary purchases.
- Obituary purchases now redirect to the standalone writer instead of Creator Studio.
- Memorial pages and QR codes are independent of video rendering.
- Memorial pages use an Always & Forever black/gold presentation and remain unlisted (`noindex`).


### v1.7.5 reliability fix
- Preserves standalone obituary form entries in the browser while AI generation runs.
- Saves the obituary draft to the project before calling OpenAI.
- Prevents accidental form navigation/reload on Generate Obituary.
- Restores the user's draft after an AI/API error instead of leaving a blank form.
- Adds clear loading and error status messages.


### v1.7.5 standalone obituary submit fix
The standalone Obituary Writer now keeps its JavaScript submit handler valid after the social sharing update. Generate Obituary no longer reloads the page and clears the form.


## v1.7.5 — Mobile Social Sharing + Admin New Obituary

- Public memorial pages now keep share controls available on desktop and mobile: More Share Options, Facebook, WhatsApp, Text Message, Email, Copy Link, and Download QR.
- The native mobile share menu can hand the memorial to installed apps such as Facebook, Messenger, Messages, Mail, and other compatible apps.
- Creator Studio and the standalone Obituary Writer now include **More Share Options** in the memorial share section.
- Authorized administrator/test sessions now show **Clear / New Obituary**. It creates a fresh obituary project and clears the local draft without deleting the memorial that was already published.
- Customer payment/access rules are unchanged.


## v1.7.6.1 — Dual-Destination Memorial QR

The obituary writer now accepts an optional Livestream URL. The memorial QR itself remains one permanent code, but it points to an Always & Forever destination page where guests can choose **View Obituary & Memorial** or **Watch Livestream**. Because the QR points to the stable destination page rather than directly to the livestream provider, the livestream URL can be updated later without changing or reprinting the QR code. The public memorial page also shows a Watch Livestream button when configured.


## v1.7.6.1 QR hotfix
The memorial QR now uses the same proven direct memorial URL generation path as v1.7.5. The memorial page itself presents the obituary plus the optional livestream button, so one QR still supports both destinations without relying on an intermediate `/links` URL.
