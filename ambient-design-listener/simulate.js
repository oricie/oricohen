/**
 * Local test harness.
 *
 *   node simulate.js          keyword mock — no network, no API key
 *   node simulate.js --live   the real evaluateMessage() from index.js's path
 *
 * Both run the same samples through the same JSON contract, so the mock's
 * results and the model's results are directly comparable.
 */
import { samples } from "./samples.js";

const live = process.argv.includes("--live");

/**
 * Keyword stand-in for the model. Deliberately crude: it exists to prove the
 * pipeline and the contract, not to be good at the judgement.
 */
function mockEvaluate(message) {
  const text = message.text.toLowerCase();
  const rules = [
    {
      test: /\b\d+px\b/,
      reason: "hardcoded pixel value instead of a spacing token",
      note: (m) =>
        `That padding change is off the 4px scale — \`space-4\` (16px) or \`space-6\` (24px) are the neighbours. ${m.user}, worth a token instead of a literal?`,
    },
    {
      test: /modal/,
      reason: "modal proposed for what reads like a multi-step flow",
      note: () =>
        "Heads up — the system reserves modals for destructive confirmation and single-task input. Multi-step flows go to a full page or a side panel.",
    },
    {
      test: /outline:\s*none|focus ring/,
      reason: "focus styling removed — accessibility floor",
      note: () =>
        "`outline: none` with no replacement drops the visible focus ring, which is below our a11y floor. `:focus-visible` gets you the click behaviour QA wanted without losing keyboard focus.",
    },
    {
      test: /custom|couldn't find (a|an) .* in the system/,
      reason: "new one-off pattern invented outside the system",
      note: () =>
        "A custom multiselect is a system decision rather than a ticket decision — flagging it now so it doesn't fork later.",
    },
  ];

  for (const rule of rules) {
    if (rule.test.test(text)) {
      return {
        should_notify: true,
        reason: rule.reason,
        suggested_message: rule.note(message),
      };
    }
  }
  return {
    should_notify: false,
    reason: "nothing design-relevant",
    suggested_message: "",
  };
}

async function main() {
  let evaluate = mockEvaluate;
  if (live) {
    ({ evaluateMessage: evaluate } = await import("./evaluator.js"));
  }
  console.log(
    `Ambient design listener — ${live ? "LIVE (Claude)" : "MOCK (keywords)"}\n`
  );

  const buffer = [];
  let correct = 0;
  const misses = [];

  for (const sample of samples) {
    const message = { user: sample.user, text: sample.text };
    const context = [...buffer, ...(sample.context ?? [])];
    const verdict = await evaluate(message, context);
    buffer.push(...(sample.context ?? []), message);

    const ok = verdict.should_notify === sample.expect;
    if (ok) correct++;
    else
      misses.push(
        `${sample.user}: ${verdict.should_notify ? "false positive" : "missed"} — ${sample.text.slice(0, 60)}…`
      );

    const mark = ok ? "✓" : "✗";
    const state = verdict.should_notify ? "FLAG" : "skip";
    console.log(`${mark} [${state}] ${sample.user}: ${sample.text}`);
    console.log(`    reason: ${verdict.reason}`);
    if (verdict.should_notify) console.log(`    → ${verdict.suggested_message}`);
    console.log();
  }

  console.log(`${correct}/${samples.length} matched the expected verdict.`);
  const flagged = samples.filter((s) => s.expect).length;
  console.log(`(${flagged} of ${samples.length} samples are meant to flag.)`);
  if (misses.length) {
    console.log("\nDisagreements — tune DESIGN.md against these:");
    for (const miss of misses) console.log(`  - ${miss}`);
  }
  // Non-zero exit on disagreement so this can gate a DESIGN.md change.
  process.exitCode = misses.length ? 1 : 0;
}

main();
