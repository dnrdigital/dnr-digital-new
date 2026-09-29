# Unsplash production-access preparation

Status: implementation prepared; do not submit as fully compliant until the download-event interpretation below has been confirmed and any required tracking implemented. No application submission or message to Unsplash has been sent.

## Suggested application details

Name: **DNR Digital — Change of scenery**

Description:

> DNR Digital is a digital consultancy website. It displays landscape photography from a curated Unsplash collection behind its services and contact details. Visitors see different photographs on return visits and can explore another photograph using “Change of scenery”. Images are hotlinked directly from Unsplash with photographer and Unsplash attribution. A shared metadata cache keeps the experience available during API outages and limits discovery requests.

Website: https://dnr.digital/

## Checklist

- Hotlinking: images use the original API-returned `urls.full`, with responsive width, quality and format parameters. Preserve `ixid`; do not proxy/store the image binaries. The local fallback is separate from the Unsplash collection.
- Attribution: show the photographer's full name and link to their profile plus an Unsplash link, both with `utm_source=dnr_digital&utm_medium=referral`. Reject new photos without attribution. Change attribution when the replacement image becomes visible.
- Branding: DNR.DIGITAL has its own name and design and uses no Unsplash logo.
- Credentials: all API requests are server-side; keep the access key in Netlify environment variables with Functions scope. Never expose it through browser props or URL parameters.
- Application information: use accurate details above; do not claim publishing, downloading, saving or wallpaper functionality that does not exist.
- Evidence: capture desktop and mobile screenshots with the full credit visible, plus the changed photo and its matching credit. Use the deployed candidate for the submission, not a mockup.

## Download-event question — unresolved

Official guidance distinguishes ordinary image views (reported by hotlinking) from actions where a user chooses an image for use, such as setting a board background. This site automatically displays a rotating background; its die temporarily changes the displayed photograph, without saving/exporting/publishing it.

Suggested question for Unsplash support (not sent):

> DNR Digital hotlinks a rotating, curated photograph on its consultancy homepage. Visitors can press “Change of scenery” to display another photograph, but cannot save, export or publish it. Should `links.download_location` be called for each manual shuffle, each automatic page-load selection, or when we select photographs for the site's curated pool? We want to report uses correctly without treating ordinary views as downloads.

The implementation retains complete `links.download_location` values, including query parameters, in the server-side pool. It does **not** currently emit download events or invent them during refreshes. If Unsplash requires events for this interaction, implement the exact authenticated returned URL for that action, with server-side allowlisting, bounded delivery/retry and request budgeting before submitting for production access. Do not claim that caching eliminates required tracking requests or assume that they are exempt from quota. This remains an application-readiness item, not a completed checklist item.

## Collection criteria

Start with the existing public collection `bo8jQKTaE0Y`, configurable via `UNSPLASH_COLLECTION_ID`. Editing that collection in Unsplash controls the choices without changing the site. This change does not add/remove photos in the user's collection.

Prefer strong colour, architecture, geometry, landscapes and abstract details. Check both a wide desktop crop and a narrow mobile crop; avoid busy subjects behind the central lettering and photos whose principal subject disappears on mobile. The refresh asks for landscape orientation and high content filtering, but those are not a substitute for curation. Time-of-day selection is deferred.

## Sources checked 29 September 2026

- https://unsplash.com/documentation#rate-limiting
- https://unsplash.com/documentation#get-a-random-photo
- https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines
- https://help.unsplash.com/en/articles/2511258-guideline-triggering-a-download
