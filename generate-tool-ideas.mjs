import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  enrichToolScores,
  inferUiType,
  slugToPhrase,
  sortRegistryByTotalScore,
} from "./tool-scoring.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const toolsRegistryPath = path.join(__dirname, "tools", "tools.json");

const MIN_TOTAL_SCORE = 7;

const patternTemplates = [
  "{x} calculator",
  "{x} converter",
  "{x} generator",
  "{x} formatter",
  "{x} to {y} tool",
];

const inputsByPattern = {
  "{x} calculator": [
    { x: "percentage" },
    { x: "loan" },
    { x: "bmi" },
    { x: "age" },
    { x: "discount" },
    { x: "salary" },
    { x: "tax" },
  ],
  "{x} converter": [
    { x: "time zone" },
    { x: "currency" },
    { x: "temperature" },
    { x: "unit" },
    { x: "markdown" },
  ],
  "{x} generator": [
    { x: "qr code" },
    { x: "password" },
    { x: "uuid" },
    { x: "invoice" },
    { x: "barcode" },
  ],
  "{x} formatter": [
    { x: "json" },
    { x: "sql" },
    { x: "xml" },
    { x: "html" },
    { x: "text" },
  ],
  "{x} to {y} tool": [
    { x: "jpg", y: "png" },
    { x: "text", y: "slug" },
    { x: "text", y: "base64" },
    { x: "csv", y: "json" },
    { x: "json", y: "csv" },
  ],
};

function expandPattern(template, input) {
  let phrase = template.replace("{x}", input.x);
  if (input.y) {
    phrase = phrase.replace("{y}", input.y);
  }
  return phrase;
}

function toSlug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function toTitleCase(value) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function shouldRejectIdea(phrase) {
  const value = phrase.toLowerCase();
  const blockedTerms = [
    "login",
    "account",
    "dashboard",
    "workflow",
    "project manager",
    "crm",
    "chat app",
    "booking system",
    "marketplace",
    "social network",
  ];
  return blockedTerms.some((term) => value.includes(term));
}

function buildIdea(phrase) {
  const cleanPhrase = phrase.replace(" tool", "");
  const title = `${toTitleCase(cleanPhrase)} Online`;
  const slug = toSlug(cleanPhrase);
  const uiType = inferUiType(slugToPhrase(slug));

  return enrichToolScores({
    slug,
    title,
    description: `Free online ${cleanPhrase} tool for quick browser-based results.`,
    h1: title,
    subtitle: `Use this ${cleanPhrase} for fast, accurate results.`,
    howItWorks: `Enter your input, run the ${cleanPhrase}, and copy the result instantly.`,
    uiType,
  });
}

/** Collect every patterned phrase (all rounds). */
function collectAllPhrases() {
  const phrases = [];
  let round = 0;

  while (true) {
    let added = false;
    for (const template of patternTemplates) {
      const candidates = inputsByPattern[template] || [];
      if (round >= candidates.length) {
        continue;
      }
      phrases.push(expandPattern(template, candidates[round]));
      added = true;
    }
    if (!added) {
      break;
    }
    round += 1;
  }

  return phrases;
}

function generateIdeas(limit) {
  const seen = new Set();
  const ideas = [];

  for (const phrase of collectAllPhrases()) {
    if (shouldRejectIdea(phrase)) {
      continue;
    }

    const idea = buildIdea(phrase);
    if (idea.slug.length === 0 || seen.has(idea.slug)) {
      continue;
    }
    if (idea.totalScore < MIN_TOTAL_SCORE) {
      continue;
    }

    seen.add(idea.slug);
    ideas.push(idea);
  }

  ideas.sort((a, b) => b.totalScore - a.totalScore);

  if (ideas.length <= limit) {
    return ideas;
  }
  return ideas.slice(0, limit);
}

function getLimitArg(args, fallback = 12) {
  const index = args.indexOf("--limit");
  if (index === -1) {
    return fallback;
  }
  const raw = args[index + 1];
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("Invalid --limit value. Use a positive integer.");
  }
  return parsed;
}

async function appendIdeasToRegistry(ideas) {
  const currentRaw = await fs.readFile(toolsRegistryPath, "utf8");
  const currentTools = JSON.parse(currentRaw);
  const seenSlugs = new Set(currentTools.map((tool) => tool.slug));

  const rows = ideas.filter((idea) => !seenSlugs.has(idea.slug));
  if (rows.length === 0) {
    return { added: 0, total: currentTools.length };
  }

  const merged = [...currentTools, ...rows];
  const sorted = sortRegistryByTotalScore(merged);
  await fs.writeFile(toolsRegistryPath, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
  return { added: rows.length, total: sorted.length };
}

async function main() {
  const args = process.argv.slice(2);
  const limit = getLimitArg(args, 12);
  const ideas = generateIdeas(limit);

  if (args.includes("--append")) {
    const result = await appendIdeasToRegistry(ideas);
    console.log(`Appended ${result.added} new ideas to tools.json (total: ${result.total})`);
    return;
  }

  console.log(JSON.stringify(ideas, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
