# Micro Tool Hub

Micro Tool Hub is a lightweight static website that provides SEO-focused browser tools built with plain HTML, CSS, and vanilla JavaScript.  
The project includes a template-driven generation system for adding and scaling tools quickly, plus supporting scripts for sitemap generation and SEO roadmap planning.

## Project Overview

- Static, fast-loading tool pages (no framework, no build pipeline required).
- Template + registry architecture for repeatable tool creation.
- Internal linking and SEO metadata automation.
- Optional SEO analysis workflow for prioritizing future tool expansion.

## Included Tools

Current generated tools:

- Currency Converter
- JSON Formatter
- Password Generator
- QR Code Generator
- QR Code Generator Online (variant)
- Time Zone Converter
- Temperature Converter

Tool definitions are managed in `tools/tools.json`.

## Local Development

From the project root:

```bash
node generate-tools.mjs
node generate-sitemap.mjs
python -m http.server 8000
```

Open `http://localhost:8000`.

Recommended checks:

- Homepage loads correctly.
- Tool links open and function.
- `sitemap.xml` is accessible.

## Deployment Instructions

This is a static project and can be deployed to any static host.

Basic deployment flow:

1. Regenerate content:
   - `node generate-tools.mjs`
   - `node generate-sitemap.mjs`
2. Commit and push repository updates.
3. Deploy the repository root as a static site.

## Cloudflare Pages Deployment Guide

1. Push this project to GitHub (or GitLab).
2. In Cloudflare Dashboard, go to **Pages** -> **Create a project**.
3. Connect your repository and select the `micro-tool-hub` project.
4. Build configuration:
   - **Framework preset:** None
   - **Build command:** *(leave empty)* or `node generate-tools.mjs && node generate-sitemap.mjs`
   - **Build output directory:** `/`
5. Deploy.

After deployment, verify:

- `/` loads the homepage.
- `/tools/*.html` pages load.
- `/sitemap.xml` is reachable.

## Notes

- Tool pages include ad placeholders for future monetization, but no ads are rendered by default.
- Currency converter uses a public live-rate source with fallback logic.
