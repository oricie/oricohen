import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const here = path.dirname(fileURLToPath(import.meta.url));
const DESIGN_PATH = process.env.DESIGN_FILE ?? path.join(here, "DESIGN.md");

/**
 * The contract every evaluator honours — the real one here, and the keyword
 * mock in simulate.js. Keeping it in one place is what lets the simulator run
 * either implementation against the same samples.
 */
export const VerdictSchema = z.object({
  should_notify: z
    .boolean()
    .describe("True only if this message is worth surfacing to the team."),
  reason: z
    .string()
    .describe(
      "One sentence, for the operator's log — why this was flagged or skipped."
    ),
  suggested_message: z
    .string()
    .describe(
      "The Slack message to post if should_notify is true; empty string otherwise."
    ),
});

const SYSTEM_PREAMBLE = `You are an ambient design agent listening to a team's Slack channel.

You are notify-only. You never make changes, never draft work, and never tell
anyone what to do. Your single job is to decide whether the latest message is
worth interrupting the team about, and if so, to write the short note that
surfaces it.

You are judged on restraint. A false positive costs far more than a miss: an
ambient agent that chatters gets muted, and a muted agent catches nothing. When
in doubt, stay silent.

The design context below is the sole basis for your judgement. If a concern is
not grounded in it, it is not your concern.

---

`;

/** Read DESIGN.md fresh so edits take effect without a restart. */
export function loadDesignContext() {
  return fs.readFileSync(DESIGN_PATH, "utf8");
}

function renderContext(recentMessages) {
  if (recentMessages.length === 0) return "(no earlier messages in buffer)";
  return recentMessages
    .map((m) => `${m.user ?? "unknown"}: ${m.text}`)
    .join("\n");
}

let client;
function getClient() {
  // Lazily constructed so importing this module doesn't require a key.
  client ??= new Anthropic();
  return client;
}

/**
 * Evaluate one Slack message against DESIGN.md.
 *
 * @param {{user?: string, text: string}} message      the message just posted
 * @param {Array<{user?: string, text: string}>} recentMessages  rolling channel context, oldest first
 * @returns {Promise<{should_notify: boolean, reason: string, suggested_message: string}>}
 */
export async function evaluateMessage(message, recentMessages = []) {
  const response = await getClient().messages.parse({
    model: process.env.MODEL ?? "claude-opus-5",
    max_tokens: 2000,
    system: [
      {
        type: "text",
        text: SYSTEM_PREAMBLE + loadDesignContext(),
        cache_control: { type: "ephemeral" },
      },
    ],
    output_config: {
      effort: "low",
      format: zodOutputFormat(VerdictSchema),
    },
    messages: [
      {
        role: "user",
        content: [
          "Recent channel context (oldest first):",
          renderContext(recentMessages),
          "",
          "New message to evaluate:",
          `${message.user ?? "unknown"}: ${message.text}`,
        ].join("\n"),
      },
    ],
  });

  const verdict = response.parsed_output;
  if (!verdict) {
    // Parsing failed — the safe default for an ambient agent is silence.
    return {
      should_notify: false,
      reason: "model response did not parse; staying silent",
      suggested_message: "",
    };
  }
  return verdict;
}
