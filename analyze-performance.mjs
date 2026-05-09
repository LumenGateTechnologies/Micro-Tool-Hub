import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const performancePath = path.join(__dirname, "seo-data", "tool-performance.json");
const toolsPath = path.join(__dirname, "tools", "tools.json");
const roadmapPath = path.join(__dirname, "seo-data", "roadmap.json");

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function normalize(value, maxValue) {
  if (!Number.isFinite(value) || maxValue <= 0) return 0;
  return clamp(value / maxValue, 0, 1);
}

function positionScore(avgPosition) {
  if (!Number.isFinite(avgPosition) || avgPosition <= 0) return 0;
  // Position 1 is best (1.0), position 50+ approaches 0.
  return clamp((50 - avgPosition) / 49, 0, 1);
}

function computePriorityScore(metrics, maxima) {
  const clicksN = normalize(metrics.clicks, maxima.clicks);
  const impressionsN = normalize(metrics.impressions, maxima.impressions);
  const ctrN = clamp(metrics.ctr || 0, 0, 1);
  const posN = positionScore(metrics.avgPosition);
  const revenueN = normalize(metrics.revenueEstimate, maxima.revenueEstimate);

  // Weighted blend tuned for growth + monetization.
  const score =
    clicksN * 0.2 +
    impressionsN * 0.2 +
    ctrN * 0.2 +
    posN * 0.15 +
    revenueN * 0.25;

  return Math.round(clamp(score * 10, 0, 10) * 100) / 100;
}

function decideAction(metrics) {
  const highImpressions = metrics.impressions >= 1000;
  const lowCtr = metrics.ctr < 0.03;
  const goodCtr = metrics.ctr >= 0.04;
  const lowPosition = metrics.avgPosition > 15;
  const highRevenue = metrics.revenueEstimate >= 2;

  if (highImpressions && lowCtr) return "improve-seo";
  if (goodCtr && lowPosition) return "build-related-tools";
  if (highRevenue) return "expand-cluster";
  return "leave-stable";
}

async function main() {
  const [performanceRaw, toolsRaw] = await Promise.all([
    fs.readFile(performancePath, "utf8"),
    fs.readFile(toolsPath, "utf8"),
  ]);

  const performance = JSON.parse(performanceRaw);
  const tools = JSON.parse(toolsRaw);
  const perfBySlug = new Map(performance.map((row) => [row.slug, row]));

  const allMetrics = tools.map((tool) => {
    const existing = perfBySlug.get(tool.slug) || {};
    return {
      slug: tool.slug,
      clicks: Number(existing.clicks) || 0,
      impressions: Number(existing.impressions) || 0,
      ctr: Number(existing.ctr) || 0,
      avgPosition: Number(existing.avgPosition) || 50,
      revenueEstimate: Number(existing.revenueEstimate) || 0,
    };
  });

  const maxima = {
    clicks: Math.max(...allMetrics.map((m) => m.clicks), 1),
    impressions: Math.max(...allMetrics.map((m) => m.impressions), 1),
    revenueEstimate: Math.max(...allMetrics.map((m) => m.revenueEstimate), 1),
  };

  const roadmap = tools.map((tool) => {
    const metrics = allMetrics.find((m) => m.slug === tool.slug);
    const priorityScore = computePriorityScore(metrics, maxima);
    const recommendedAction = decideAction(metrics);

    return {
      slug: tool.slug,
      priorityScore,
      recommendedAction,
    };
  });

  roadmap.sort((a, b) => b.priorityScore - a.priorityScore);
  await fs.writeFile(roadmapPath, `${JSON.stringify(roadmap, null, 2)}\n`, "utf8");
  console.log(`Roadmap generated successfully at /seo-data/roadmap.json (${roadmap.length} tools)`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
