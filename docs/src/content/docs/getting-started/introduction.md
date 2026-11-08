---
title: Introduction
description: What cliphand is, who it is for and how it works.
---

cliphand is a headless media ingest service. It watches for recording media like SD cards, and as
soon as one is inserted it:

1. **detects** the card and the clips on it,
2. **copies** all files to a temporary folder and hashes them while copying,
3. **extracts metadata** such as capture date, camera and clip number,
4. **delivers** the files, renamed by that metadata, to a local folder or network share,
5. **verifies** every delivered file against its hash,
6. **cleans** the card, so it is ready for the next shoot.

## Who it is for

YouTube and semi-professional productions that shoot a lot of footage and want the step from
"card out of the camera" to "footage on the editing storage" to be a single action: insert the card.

## Status

cliphand is in early development. Nothing described here is usable yet. The
[feature plan](/cliphand/getting-started/feature-plan/) shows what is planned and in which order.
