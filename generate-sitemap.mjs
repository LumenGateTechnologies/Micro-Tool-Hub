import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const toolsPath = path.join(__dirname, "tools", "tools.json");
const sitemapPath = path.join(__dirname, "sitemap.xml");

function buildUrlNode(loc, priority) {
  return [
    "  <url>",
    `    <loc>${loc}</loc>`,
    "    <changefreq>weekly</changefreq>",
    `    <priority>${priority}</priority>`,
    "  </url>",
  ].join("\n");
}

async function main() {
  const toolsRaw = await fs.readFile(toolsPath, "utf8");
  const tools = JSON.parse(toolsRaw);

  const nodes = [buildUrlNode("/", "1.0")];

  for (const tool of tools) {
    nodes.push(buildUrlNode(`/tools/${tool.slug}.html`, "0.8"));
  }

  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...nodes,
    "</urlset>",
    "",
  ].join("\n");

  await fs.writeFile(sitemapPath, sitemap, "utf8");
  console.log("Sitemap generated successfully at /sitemap.xml");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
