import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const roadmapPath = path.join(__dirname, "seo-data", "roadmap.json");
const toolsPath = path.join(__dirname, "tools", "tools.json");
const outputPath = path.join(__dirname, "seo-data", "suggested-tools.json");

function toSlug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function toTitleCase(value) {
  return value.replace(/\b\w/g, (c) => c.toUpperCase());
}

function inferUiType(phrase) {
  const p = phrase.toLowerCase();
  if (p.includes("json")) return "json-formatter";
  if (p.includes("qr")) return "qr-generator";
  if (p.includes("calculator")) return "calculator-basic";
  if (p.includes("converter")) return "converter-basic";
  if (p.includes("generator")) return "generator-basic";
  if (p.includes("formatter") || p.includes("validator") || p.includes("beautifier") || p.includes("minifier")) {
    return "formatter-basic";
  }
  return "tool-basic";
}

function buildToolShape(phrase, sourceSlug) {
  const title = `${toTitleCase(phrase)} Online`;
  return {
    slug: toSlug(phrase),
    title,
    description: `Free online ${phrase} tool for quick browser-based results.`,
    h1: title,
    subtitle: `Use this ${phrase} for fast, accurate results.`,
    howItWorks: `Enter your input, run the ${phrase}, and copy the result instantly.`,
    uiType: inferUiType(phrase),
    sourceSlug,
  };
}

function getAdjacentIdeas(slug) {
  const clusterMap = {
    "json-formatter": ["json validator", "json beautifier", "json minifier"],
    "loan-calculator": ["mortgage calculator", "interest calculator", "loan payoff calculator"],
    "currency-converter": ["exchange rate calculator", "currency rate tracker", "travel budget converter"],
    "password-generator": ["password strength checker", "passphrase generator", "random username generator"],
    "qr-generator": ["qr code scanner", "wifi qr code generator", "vcard qr generator"],
    "qr-code-generator": ["qr code scanner", "wifi qr code generator", "vcard qr generator"],
    "time-zone-converter": ["meeting time planner", "world clock converter", "utc to local time converter"],
  };

  if (clusterMap[slug]) {
    return clusterMap[slug];
  }

  // Generic fallback cluster expansion for SEO-safe related intent.
  const phrase = slug.replace(/-/g, " ");
  if (phrase.includes("calculator")) {
    const stem = phrase.replace("calculator", "").trim();
    return [`${stem} estimator`, `${stem} breakdown calculator`, `${stem} comparison calculator`];
  }
  if (phrase.includes("converter")) {
    const stem = phrase.replace("converter", "").trim();
    return [`${stem} conversion table`, `${stem} converter pro`, `${stem} quick converter`];
  }
  if (phrase.includes("generator")) {
    const stem = phrase.replace("generator", "").trim();
    return [`${stem} creator`, `${stem} template generator`, `${stem} random generator`];
  }
  if (phrase.includes("formatter")) {
    const stem = phrase.replace("formatter", "").trim();
    return [`${stem} validator`, `${stem} beautifier`, `${stem} minifier`];
  }
  return [];
}

async function main() {
  const [roadmapRaw, toolsRaw] = await Promise.all([
    fs.readFile(roadmapPath, "utf8"),
    fs.readFile(toolsPath, "utf8"),
  ]);

  const roadmap = JSON.parse(roadmapRaw);
  const tools = JSON.parse(toolsRaw);

  const existingSlugs = new Set(tools.map((tool) => tool.slug));
  const suggested = [];
  const seenSuggested = new Set();

  const expansionTargets = roadmap.filter(
    (tool) => tool.priorityScore >= 8 && tool.recommendedAction === "expand-cluster",
  );

  for (const target of expansionTargets) {
    const adjacent = getAdjacentIdeas(target.slug);
    for (const phrase of adjacent) {
      const candidate = buildToolShape(phrase, target.slug);
      if (existingSlugs.has(candidate.slug) || seenSuggested.has(candidate.slug)) {
        continue;
      }
      seenSuggested.add(candidate.slug);
      suggested.push(candidate);
    }
  }

  await fs.writeFile(outputPath, `${JSON.stringify(suggested, null, 2)}\n`, "utf8");
  console.log(
    `Suggested tools generated at /seo-data/suggested-tools.json (${suggested.length} suggestions)`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
