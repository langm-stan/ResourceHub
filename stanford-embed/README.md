# Financial Statements embed, for Stanford IT

This folder contains a self-contained interactive tool (a personal balance
sheet and monthly budget) to embed on:

**https://ifdm.stanford.edu/resourcehub/financial-statements**

Prepared by the Initiative for Financial Decision-Making (IFDM).

## What is in the folder

`financial-statements/` is a static website: one `index.html` plus an
`assets/` folder (JavaScript, CSS, and the Inter font files). There is no
server-side code, no database, and no build step required. It makes no
network requests to any external service; the fonts and all code are included
in the folder.

Privacy: everything a visitor types stays in their own browser
(localStorage). Nothing is transmitted or collected. Visitors can download
their own numbers as an Excel or JSON file, and can erase everything with the
"Clear my data from this browser" control in the tool.

## Step 1: host the tool (two options, pick whichever is easier)

**Option A, the folder.** Upload the `financial-statements` folder, unchanged,
to any static web location, for example the site's file space or another
Stanford-managed web host. Note the resulting URL, for example:

    https://ifdm.stanford.edu/sites/g/files/.../financial-statements/index.html

This version is slightly faster for visitors (files are cached separately and
updates re-download only what changed).

**Option B, one file.** If uploading a folder is awkward in your file
management, host the single file `financial-statements-single-file.html`
instead. It is the identical tool with everything (code, styles, fonts)
packed into one HTML file. Upload it anywhere it gets a URL, and use that URL
in Step 2.

Requirements for either option: none beyond static file hosting over HTTPS.
No PHP, no Node, no database.

## Step 2: embed it on the page

Add an HTML block (in Stanford Sites / Drupal, a "Custom HTML" or embed
component) to the Financial Statements page with:

    <iframe
      src="PASTE-THE-HOSTED-URL-HERE"
      title="Interactive balance sheet and budget"
      width="100%"
      height="1500"
      style="border: none; max-width: 100%;"
      loading="lazy"
    ></iframe>

Notes:

- `height="1500"` fits the balance sheet view on a desktop screen. If the
  page allows it, `height: 90vh` with `min-height: 900px` in the style
  attribute also works well.
- Do not add a `sandbox` attribute. If site policy requires one, use
  `sandbox="allow-scripts allow-same-origin allow-downloads"`; the tool needs
  scripts to run, same-origin to save the visitor's numbers in their browser,
  and downloads for the Excel/JSON export buttons.
- The tool brings no heading of its own, so the page's existing title and
  introduction sit directly above it.
