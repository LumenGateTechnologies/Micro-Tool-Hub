/**
 * Shared SEO / revenue scoring for registry tools (tools.json).
 * Phrase is derived from slug: "loan-calculator" -> "loan calculator"
 */

export function slugToPhrase(slug) {
  return slug.replace(/-/g, " ");
}

/** Pattern-based ui type for scoring (aligned with generate-tool-ideas). */
export function inferUiType(phrase) {
  const p = phrase.toLowerCase();
  if (p.includes("json")) return "json-formatter";
  if (p.includes("qr")) return "qr-generator";
  if (p.includes("calculator")) return "calculator-basic";
  if (p.includes("converter")) return "converter-basic";
  if (p.includes("generator")) return "generator-basic";
  if (p.includes("formatter")) return "formatter-basic";
  return "tool-basic";
}

function clampScore(n) {
  return Math.max(0, Math.min(10, Math.round(n * 10) / 10));
}

/** SEO score 0-10 */
export function computeSeoScore(phrase, _uiType) {
  const value = phrase.toLowerCase();
  let score = 4;

  if (
    value.includes("calculator") ||
    value.includes("converter") ||
    value.includes("generator")
  ) {
    score += 4;
  } else if (value.includes("formatter")) {
    score += 3;
  } else if (value.includes("to") && value.includes("tool")) {
    score += 2;
  } else {
    score += 2;
  }

  const geoSpecificTerms = ["us tax", "uk tax", "india gst", " gst "];
  const isGeoHeavy = geoSpecificTerms.some((term) =>
    value.includes(term.trim()),
  );
  if (!isGeoHeavy) {
    score += 1;
  }

  if (value.includes("text to slug") || value.includes("jpg to png")) {
    score -= 1;
  }

  if (["json", "sql", "csv", "base64"].some((k) => value.includes(k))) {
    score += 1;
  }

  return clampScore(score);
}

/** Revenue score 0-10 */
export function computeRevenueScore(phrase, uiType) {
  const value = phrase.toLowerCase();
  let score = 4;

  const finance = [
    "loan",
    "salary",
    "tax",
    "mortgage",
    "interest",
    "invoice",
    "currency",
    "discount",
    "percentage",
  ];
  if (finance.some((k) => value.includes(k))) {
    score = 9;
  } else if (value.includes("bmi") || value.includes("age")) {
    score = 7;
  }

  const dev = [
    "json",
    "sql",
    "xml",
    "html",
    "base64",
    "csv",
    "markdown",
    "uuid",
    "text to",
  ];
  if (score < 8 && dev.some((k) => value.includes(k))) {
    score = Math.max(score, 8);
  }

  const util = ["qr", "password", "time zone", "barcode"];
  if (score < 7 && util.some((k) => value.includes(k))) {
    score = Math.max(score, 7);
  }

  if (uiType === "formatter-basic" && !dev.some((k) => value.includes(k))) {
    score = Math.max(score, 6);
  }

  if (value.includes("jpg to png")) {
    score = Math.min(score, 5);
  }

  return clampScore(score);
}

export function computeTotalScore(seoScore, revenueScore) {
  return (
    Math.round((seoScore * 0.6 + revenueScore * 0.4) * 100) / 100
  );
}

/**
 * Attach seoScore, revenueScore, totalScore to one tool row.
 */
export function enrichToolScores(tool) {
  const phrase = slugToPhrase(tool.slug);
  const uiType = inferUiType(phrase);
  const seoScore = computeSeoScore(phrase, uiType);
  const revenueScore = computeRevenueScore(phrase, uiType);
  const totalScore = computeTotalScore(seoScore, revenueScore);
  return {
    ...tool,
    seoScore,
    revenueScore,
    totalScore,
  };
}

/**
 * Recalculate scores for every tool, sort by totalScore descending (then slug).
 */
export function sortRegistryByTotalScore(tools) {
  const enriched = tools.map(enrichToolScores);
  enriched.sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }
    return a.slug.localeCompare(b.slug);
  });
  return enriched;
}
