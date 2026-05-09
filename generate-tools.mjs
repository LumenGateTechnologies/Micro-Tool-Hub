import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sortRegistryByTotalScore } from "./tool-scoring.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const toolsDir = path.join(__dirname, "tools");
const registryPath = path.join(toolsDir, "tools.json");
const templatePath = path.join(toolsDir, "_template.html");

const uiByType = {
  "json-formatter": `
<textarea id="input" placeholder='{"name":"example"}'></textarea>
<div class="actions">
  <button onclick="formatJson()">Format JSON</button>
</div>
<pre id="output" class="result-box"></pre>

<script>
function formatJson() {
  try {
    const data = JSON.parse(document.getElementById("input").value);
    document.getElementById("output").textContent =
      JSON.stringify(data, null, 2);
  } catch (e) {
    document.getElementById("output").textContent = "Invalid JSON";
  }
}
</script>`.trim(),
  "qr-generator": `
<input id="input" type="text" placeholder="https://example.com">
<div class="actions">
  <button onclick="generateQr()">Generate QR Code</button>
</div>
<div class="qr-wrap result-box">
  <img id="qr" alt="Generated QR code" hidden>
</div>

<script>
function generateQr() {
  const value = document.getElementById("input").value.trim();
  const img = document.getElementById("qr");
  if (!value) {
    img.removeAttribute("src");
    img.hidden = true;
    return;
  }
  img.src =
    "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" +
    encodeURIComponent(value);
  img.hidden = false;
}
</script>`.trim(),
  "calculator-basic": `
<input id="a" type="number" placeholder="Value A">
<input id="b" type="number" placeholder="Value B">
<select id="op">
  <option value="add">Add (+)</option>
  <option value="subtract">Subtract (-)</option>
  <option value="multiply">Multiply (×)</option>
  <option value="divide">Divide (÷)</option>
</select>
<div class="actions">
  <button onclick="calculate()">Calculate</button>
</div>
<p id="output" class="result-box"></p>

<script>
function calculate() {
  const a = Number(document.getElementById("a").value);
  const b = Number(document.getElementById("b").value);
  const op = document.getElementById("op").value;
  const output = document.getElementById("output");
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    output.textContent = "Enter valid numbers.";
    return;
  }
  if (op === "divide" && b === 0) {
    output.textContent = "Cannot divide by zero.";
    return;
  }
  const result =
    op === "add" ? a + b :
    op === "subtract" ? a - b :
    op === "multiply" ? a * b : a / b;
  output.textContent = "Result: " + result;
}
</script>`.trim(),
  "converter-basic": `
<input id="value" type="number" placeholder="Enter value">
<select id="mode">
  <option value="c-to-f">Celsius to Fahrenheit</option>
  <option value="f-to-c">Fahrenheit to Celsius</option>
  <option value="km-to-mi">Kilometers to Miles</option>
  <option value="mi-to-km">Miles to Kilometers</option>
</select>
<div class="actions">
  <button onclick="convertValue()">Convert</button>
</div>
<p id="output" class="result-box"></p>

<script>
function convertValue() {
  const value = Number(document.getElementById("value").value);
  const mode = document.getElementById("mode").value;
  const output = document.getElementById("output");
  if (!Number.isFinite(value)) {
    output.textContent = "Enter a valid number.";
    return;
  }
  let result = 0;
  if (mode === "c-to-f") result = (value * 9) / 5 + 32;
  if (mode === "f-to-c") result = ((value - 32) * 5) / 9;
  if (mode === "km-to-mi") result = value * 0.621371;
  if (mode === "mi-to-km") result = value / 0.621371;
  output.textContent = "Converted: " + result.toFixed(4);
}
</script>`.trim(),
  "time-zone-converter": `
<label for="baseTime">Time</label>
<input id="baseTime" type="time" value="12:00">
<select id="fromZone">
  <option value="PERTH">Perth (AWST, UTC+8)</option>
  <option value="ADL">Adelaide (ACST, UTC+9:30)</option>
  <option value="DRW">Darwin (ACST, UTC+9:30)</option>
  <option value="MEL">Melbourne (AEST, UTC+10)</option>
  <option value="SYD">Sydney (AEST, UTC+10)</option>
  <option value="BNE">Brisbane (AEST, UTC+10)</option>
  <option value="UTC">UTC</option>
  <option value="AEST">AEST (UTC+10)</option>
  <option value="AWST">AWST (UTC+8)</option>
  <option value="THA">Thailand (UTC+7)</option>
  <option value="WIB">Indonesia WIB (UTC+7)</option>
  <option value="SGT">Singapore (UTC+8)</option>
  <option value="CST">China (UTC+8)</option>
  <option value="ICT">Vietnam (UTC+7)</option>
  <option value="JST">Japan (UTC+9)</option>
</select>
<select id="toZone">
  <option value="PERTH">Perth (AWST, UTC+8)</option>
  <option value="ADL">Adelaide (ACST, UTC+9:30)</option>
  <option value="DRW">Darwin (ACST, UTC+9:30)</option>
  <option value="MEL">Melbourne (AEST, UTC+10)</option>
  <option value="SYD">Sydney (AEST, UTC+10)</option>
  <option value="BNE">Brisbane (AEST, UTC+10)</option>
  <option value="UTC">UTC</option>
  <option value="AEST">AEST (UTC+10)</option>
  <option value="AWST">AWST (UTC+8)</option>
  <option value="THA">Thailand (UTC+7)</option>
  <option value="WIB">Indonesia WIB (UTC+7)</option>
  <option value="SGT">Singapore (UTC+8)</option>
  <option value="CST">China (UTC+8)</option>
  <option value="ICT">Vietnam (UTC+7)</option>
  <option value="JST">Japan (UTC+9)</option>
</select>
<div class="actions">
  <button onclick="convertTimeZone()">Convert Time Zone</button>
</div>
<p id="output" class="result-box"></p>

<script>
function convertTimeZone() {
  const offsets = {
    PERTH: 8,
    ADL: 9.5,
    DRW: 9.5,
    MEL: 10,
    SYD: 10,
    BNE: 10,
    UTC: 0,
    AEST: 10,
    AWST: 8,
    THA: 7,
    WIB: 7,
    SGT: 8,
    CST: 8,
    ICT: 7,
    JST: 9
  };
  const time = document.getElementById("baseTime").value;
  const from = document.getElementById("fromZone").value;
  const to = document.getElementById("toZone").value;
  const output = document.getElementById("output");
  if (!time) {
    output.textContent = "Select a time first.";
    return;
  }
  const parts = time.split(":");
  const totalMinutes = Number(parts[0]) * 60 + Number(parts[1]);
  const utcMinutes = totalMinutes - offsets[from] * 60;
  const targetMinutesRaw = utcMinutes + offsets[to] * 60;
  const targetMinutes = ((targetMinutesRaw % 1440) + 1440) % 1440;
  const hours = Math.floor(targetMinutes / 60).toString().padStart(2, "0");
  const minutes = (targetMinutes % 60).toString().padStart(2, "0");
  output.textContent = "Converted time: " + hours + ":" + minutes + " (" + to + ")";
}
</script>`.trim(),
  "temperature-converter": `
<input id="value" type="number" placeholder="Enter temperature">
<select id="mode">
  <option value="c-to-f">Celsius to Fahrenheit</option>
  <option value="f-to-c">Fahrenheit to Celsius</option>
</select>
<div class="actions">
  <button onclick="convertTemperature()">Convert Temperature</button>
</div>
<p id="output" class="result-box"></p>

<script>
function convertTemperature() {
  const value = Number(document.getElementById("value").value);
  const mode = document.getElementById("mode").value;
  const output = document.getElementById("output");
  if (!Number.isFinite(value)) {
    output.textContent = "Enter a valid number.";
    return;
  }
  const result = mode === "c-to-f" ? (value * 9) / 5 + 32 : ((value - 32) * 5) / 9;
  output.textContent = "Converted: " + result.toFixed(2);
}
</script>`.trim(),
  "currency-converter": `
<input id="amount" type="number" placeholder="Amount" value="1">
<select id="fromCurrency">
  <option value="USD">USD</option>
  <option value="EUR">EUR</option>
  <option value="GBP">GBP</option>
  <option value="AUD">AUD</option>
  <option value="THB">THB</option>
  <option value="VND">VND</option>
  <option value="IDR">IDR</option>
  <option value="CNY">CNY</option>
  <option value="SGD">SGD</option>
  <option value="JPY">JPY</option>
</select>
<select id="toCurrency">
  <option value="EUR">EUR</option>
  <option value="USD">USD</option>
  <option value="GBP">GBP</option>
  <option value="AUD">AUD</option>
  <option value="THB">THB</option>
  <option value="VND">VND</option>
  <option value="IDR">IDR</option>
  <option value="CNY">CNY</option>
  <option value="SGD">SGD</option>
  <option value="JPY">JPY</option>
</select>
<div class="actions">
  <button onclick="convertCurrency()">Convert Currency</button>
</div>
<p id="output" class="result-box"></p>
<p id="rateMeta" class="message"></p>

<script>
const fallbackRates = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    AUD: 1.52,
    THB: 36.6,
    VND: 25400,
    IDR: 16200,
    CNY: 7.24,
    SGD: 1.35,
    JPY: 155.0
};

async function fetchLiveRate(from, to) {
  const url =
    "https://api.frankfurter.app/latest?from=" +
    encodeURIComponent(from) +
    "&to=" +
    encodeURIComponent(to);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Live rate request failed");
  }
  const data = await response.json();
  if (!data || !data.rates || typeof data.rates[to] !== "number") {
    throw new Error("Live rate missing");
  }
  return { rate: data.rates[to], date: data.date || "" };
}

function convertWithFallback(amount, from, to) {
  const baseValue = amount / fallbackRates[from];
  return baseValue * fallbackRates[to];
}

async function convertCurrency() {
  const amount = Number(document.getElementById("amount").value);
  const from = document.getElementById("fromCurrency").value;
  const to = document.getElementById("toCurrency").value;
  const output = document.getElementById("output");
  const rateMeta = document.getElementById("rateMeta");

  if (!Number.isFinite(amount)) {
    output.textContent = "Enter a valid amount.";
    rateMeta.textContent = "";
    return;
  }

  if (from === to) {
    output.textContent = amount.toFixed(2) + " " + from + " = " + amount.toFixed(2) + " " + to;
    rateMeta.textContent = "Same currency selected.";
    return;
  }

  try {
    const live = await fetchLiveRate(from, to);
    const convertedLive = amount * live.rate;
    output.textContent = amount.toFixed(2) + " " + from + " = " + convertedLive.toFixed(2) + " " + to;
    rateMeta.textContent = "Live rate source: Frankfurter" + (live.date ? " (" + live.date + ")" : "");
  } catch (_err) {
    const convertedFallback = convertWithFallback(amount, from, to);
    output.textContent = amount.toFixed(2) + " " + from + " = " + convertedFallback.toFixed(2) + " " + to;
    rateMeta.textContent = "Using fallback rates (live service unavailable).";
  }
}
</script>`.trim(),
  "password-generator": `
<label for="length">Password Length</label>
<input id="length" type="range" min="8" max="32" value="16">
<p id="lengthValue">Length: 16</p>

<div class="options">
  <label class="option-label"><input id="useCaps" type="checkbox" checked> Capitals</label>
  <label class="option-label"><input id="useNumbers" type="checkbox" checked> Numbers</label>
  <label class="option-label"><input id="useSymbols" type="checkbox" checked> Symbols</label>
</div>

<div class="actions">
  <button onclick="generatePassword()">Generate Password</button>
  <button onclick="copyPassword()">Copy Password</button>
</div>
<input id="output" type="text" readonly placeholder="Generated password">
<p id="status" class="message"></p>

<script>
function randomChar(pool) {
  const randomValues = new Uint32Array(1);
  crypto.getRandomValues(randomValues);
  return pool[randomValues[0] % pool.length];
}

const lengthInput = document.getElementById("length");
const lengthValue = document.getElementById("lengthValue");
lengthInput.addEventListener("input", function () {
  lengthValue.textContent = "Length: " + lengthInput.value;
});

function generatePassword() {
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const caps = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()-_=+[]{};:,.?/|~";
  const length = Number(lengthInput.value);
  const status = document.getElementById("status");
  let pool = lower;

  if (document.getElementById("useCaps").checked) pool += caps;
  if (document.getElementById("useNumbers").checked) pool += numbers;
  if (document.getElementById("useSymbols").checked) pool += symbols;

  let password = "";
  for (let i = 0; i < length; i += 1) {
    password += randomChar(pool);
  }

  document.getElementById("output").value = password;
  status.textContent = "Password generated.";
}

function copyPassword() {
  const output = document.getElementById("output");
  const status = document.getElementById("status");
  if (!output.value) {
    status.textContent = "Generate a password first.";
    return;
  }
  navigator.clipboard.writeText(output.value)
    .then(function () {
      status.textContent = "Password copied.";
    })
    .catch(function () {
      status.textContent = "Copy failed.";
    });
}
</script>`.trim(),
  "generator-basic": `
<input id="prefix" type="text" placeholder="Optional prefix">
<div class="actions">
  <button onclick="generateValue()">Generate</button>
</div>
<input id="output" type="text" readonly placeholder="Generated value">

<script>
function generateValue() {
  const prefix = document.getElementById("prefix").value.trim();
  const randomPart = Math.random().toString(36).slice(2, 10);
  document.getElementById("output").value = prefix ? prefix + "-" + randomPart : randomPart;
}
</script>`.trim(),
  "formatter-basic": `
<textarea id="input" placeholder="Paste text"></textarea>
<div class="actions">
  <button onclick="formatText()">Format</button>
</div>
<pre id="output" class="result-box"></pre>

<script>
function formatText() {
  const value = document.getElementById("input").value;
  const formatted = value
    .split("\\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\\n");
  document.getElementById("output").textContent = formatted;
}
</script>`.trim(),
  "tool-basic": `
<textarea id="input" placeholder="Enter text"></textarea>
<div class="actions">
  <button onclick="runTool()">Run Tool</button>
</div>
<pre id="output" class="result-box"></pre>

<script>
function runTool() {
  const value = document.getElementById("input").value.trim();
  document.getElementById("output").textContent = value ? value : "Enter input first.";
}
</script>`.trim(),
};

function resolveUiType(tool) {
  if (tool.slug === "currency-converter") {
    return "currency-converter";
  }
  if (tool.slug === "time-zone-converter") {
    return "time-zone-converter";
  }
  if (tool.slug === "temperature-converter") {
    return "temperature-converter";
  }
  if (tool.slug === "password-generator") {
    return "password-generator";
  }
  return tool.uiType;
}

function applyTemplate(template, tool, uiHtml) {
  const keywords = Array.isArray(tool.keywords) ? tool.keywords : [];
  const metaKeywords = keywords.join(", ");
  const keywordSentence = buildKeywordSentence(keywords);
  const keywordSentenceBlock = keywordSentence ? `<p>${keywordSentence}</p>` : "";

  return template
    .replaceAll("{{TITLE}}", tool.title)
    .replaceAll("{{DESCRIPTION}}", tool.description)
    .replaceAll("{{META_KEYWORDS}}", metaKeywords)
    .replaceAll("{{H1}}", tool.h1)
    .replaceAll("{{SUBTITLE}}", tool.subtitle)
    .replaceAll("{{KEYWORD_SENTENCE_BLOCK}}", keywordSentenceBlock)
    .replaceAll("{{HOW_IT_WORKS}}", tool.howItWorks)
    .replaceAll("{{TOOL_UI}}", uiHtml);
}

function buildKeywordSentence(keywords) {
  if (keywords.length === 0) {
    return "";
  }
  if (keywords.length === 1) {
    return `This tool helps with ${keywords[0]} quickly and clearly.`;
  }
  return `Useful for ${keywords[0]} and ${keywords[1]} in a simple browser workflow.`;
}

function buildRelatedToolsSection(currentTool, allTools) {
  const normalizeLabel = (value) =>
    value.toLowerCase().replace(/\bonline\b/g, "").replace(/\s+/g, " ").trim();
  const currentNormalizedLabel = normalizeLabel(currentTool.h1);
  const seenLabels = new Set();
  const relatedItems = allTools
    .filter((tool) => tool.slug !== currentTool.slug)
    .filter((tool) => {
      const normalizedLabel = normalizeLabel(tool.h1);
      if (normalizedLabel === currentNormalizedLabel) {
        return false;
      }
      if (seenLabels.has(normalizedLabel)) {
        return false;
      }
      seenLabels.add(normalizedLabel);
      return true;
    })
    .map((tool) => `  <li><a href="${tool.slug}.html">${tool.h1}</a></li>`)
    .join("\n");

  return [
    "",
    "<h3>Related Tools</h3>",
    '<ul class="tool-list">',
    relatedItems,
    "</ul>",
    "",
  ].join("\n");
}

async function main() {
  const [registryRaw, template] = await Promise.all([
    fs.readFile(registryPath, "utf8"),
    fs.readFile(templatePath, "utf8"),
  ]);

  const tools = sortRegistryByTotalScore(JSON.parse(registryRaw));
  await fs.writeFile(registryPath, `${JSON.stringify(tools, null, 2)}\n`, "utf8");

  let generatedCount = 0;

  for (const tool of tools) {
    const resolvedUiType = resolveUiType(tool);
    const uiHtml = uiByType[resolvedUiType];
    if (!uiHtml) {
      throw new Error(`Unsupported uiType: ${resolvedUiType}`);
    }

    const baseHtml = applyTemplate(template, tool, uiHtml);
    const relatedSection = buildRelatedToolsSection(tool, tools);
    const html = baseHtml.replace("{{RELATED_TOOLS}}", relatedSection);
    const outputPath = path.join(toolsDir, `${tool.slug}.html`);
    await fs.writeFile(outputPath, html, "utf8");
    generatedCount += 1;
  }

  console.log(`Generated ${generatedCount} tools successfully`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
