/**
 * validate-quiz-answers.mjs
 *
 * Reads every quiz question from playgroundData.ts and asks Gemini to verify
 * that the marked correctId is actually the right answer.
 *
 * Usage:
 *   GEMINI_API_KEY=<key> node scripts/validate-quiz-answers.mjs
 *
 * Exit code 0 = all correct, 1 = one or more mistakes found.
 */

import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createRequire } from "module";

// Auto-load backend .env if GEMINI_API_KEY not already set
if (!process.env.GEMINI_API_KEY) {
  const require = createRequire(import.meta.url);
  const envPath = join(dirname(fileURLToPath(import.meta.url)), "../backend/.env");
  if (existsSync(envPath)) {
    try {
      const dotenv = require("dotenv");
      dotenv.config({ path: envPath, quiet: true });
    } catch { /* dotenv not available — user must set GEMINI_API_KEY manually */ }
  }
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ── Extract quiz data from the TypeScript source ────────────────────────────
// We parse it as text since it's TypeScript, not JSON.
// Extract all quiz blocks: { question, options, correctId, explanation }

function extractQuizzes(src) {
  const quizzes = [];
  // Match each quiz: block — find { question: "...", options: [...], correctId: "...", explanation: "..." }
  const quizPattern = /quiz:\s*\{([\s\S]*?)\},?\n\s*\}/g;
  let m;
  while ((m = quizPattern.exec(src)) !== null) {
    const block = m[1];
    const questionMatch = block.match(/question:\s*"([^"]+)"/);
    const correctIdMatch = block.match(/correctId:\s*"([^"]+)"/);
    const explanationMatch = block.match(/explanation:\s*"([^"]+)"/);

    // Extract options array
    const optionMatches = [...block.matchAll(/\{\s*id:\s*"([^"]+)",\s*text:\s*"([^"]+)"\s*\}/g)];
    const options = optionMatches.map(om => ({ id: om[1], text: om[2] }));

    if (questionMatch && correctIdMatch && options.length > 0) {
      quizzes.push({
        question: questionMatch[1],
        options,
        correctId: correctIdMatch[1],
        explanation: explanationMatch?.[1] ?? "",
        correctText: options.find(o => o.id === correctIdMatch[1])?.text ?? "MISSING",
      });
    }
  }
  return quizzes;
}

// ── Verify with Gemini ───────────────────────────────────────────────────────

const GEMINI_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_KEY) {
  console.error("❌  GEMINI_API_KEY env var required");
  process.exit(1);
}

async function verifyQuiz(quiz) {
  const optionsList = quiz.options.map(o => `  ${o.id}) ${o.text}`).join("\n");
  const prompt = `You are verifying a multiple-choice quiz answer. Reply with ONLY "CORRECT" or "WRONG:<correct_id>:<brief reason>".

Question: ${quiz.question}

Options:
${optionsList}

Marked correct: ${quiz.correctId}) ${quiz.correctText}

Is the marked answer correct? Reply CORRECT or WRONG:<id of actual correct option>:<one-line reason>`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 200,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    }
  );

  if (!res.ok) return { ok: false, raw: `HTTP ${res.status}` };
  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  if (raw.startsWith("CORRECT")) return { ok: true, raw };
  if (raw.startsWith("WRONG")) {
    const [, wrongId, reason] = raw.split(":").map(s => s.trim());
    return { ok: false, wrongId, reason, raw };
  }
  return { ok: null, raw }; // unexpected response — skip
}

// ── Main ─────────────────────────────────────────────────────────────────────

const src = readFileSync(join(ROOT, "frontend/src/data/playgroundData.ts"), "utf8");
const quizzes = extractQuizzes(src);

console.log(`\n🔍  Validating ${quizzes.length} quiz questions...\n`);

let errors = 0;
let warnings = 0;

for (let i = 0; i < quizzes.length; i++) {
  const q = quizzes[i];
  process.stdout.write(`  [${i + 1}/${quizzes.length}] ${q.question.slice(0, 60)}...`);
  try {
    const result = await verifyQuiz(q);
    if (result.ok === true) {
      process.stdout.write(" ✅\n");
    } else if (result.ok === false) {
      process.stdout.write(` ❌\n`);
      console.log(`\n  ⚠️  WRONG ANSWER DETECTED`);
      console.log(`     Question:  ${q.question}`);
      console.log(`     Marked:    ${q.correctId}) ${q.correctText}`);
      if (result.wrongId) {
        const actual = q.options.find(o => o.id === result.wrongId);
        console.log(`     Should be: ${result.wrongId}) ${actual?.text ?? "unknown"}`);
      }
      console.log(`     Reason:    ${result.reason ?? result.raw}\n`);
      errors++;
    } else {
      process.stdout.write(` ⚠️  (unexpected response: ${result.raw?.slice(0, 40)})\n`);
      warnings++;
    }
  } catch (e) {
    process.stdout.write(` ⚠️  (error: ${e.message})\n`);
    warnings++;
  }

  // Small delay to avoid rate limiting
  if (i < quizzes.length - 1) await new Promise(r => setTimeout(r, 300));
}

console.log(`\n${"─".repeat(60)}`);
console.log(`Results: ${quizzes.length - errors - warnings} correct, ${errors} wrong, ${warnings} skipped`);

if (errors > 0) {
  console.log(`\n❌  ${errors} quiz answer(s) need fixing before merging.\n`);
  process.exit(1);
} else {
  console.log(`\n✅  All quiz answers verified!\n`);
  process.exit(0);
}
