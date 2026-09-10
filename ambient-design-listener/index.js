import "dotenv/config";
import pkg from "@slack/bolt";

import { evaluateMessage } from "./evaluator.js";

const { App, LogLevel } = pkg;

const BUFFER_SIZE = Number(process.env.BUFFER_SIZE ?? 20);
const TRUST_LEVEL = process.env.TRUST_LEVEL ?? "notify";
const NOTIFY_CHANNEL = process.env.NOTIFY_CHANNEL;
const LISTEN_CHANNELS = (process.env.LISTEN_CHANNELS ?? "")
  .split(",")
  .map((c) => c.trim())
  .filter(Boolean);

if (TRUST_LEVEL !== "notify") {
  // draft/act are deliberately unbuilt. Fail loudly rather than silently
  // degrading to notify — an operator who set "act" should know it isn't real.
  throw new Error(
    `TRUST_LEVEL=${TRUST_LEVEL} is not implemented. This prototype is notify-only.`
  );
}
if (!NOTIFY_CHANNEL) throw new Error("NOTIFY_CHANNEL is required.");
if (LISTEN_CHANNELS.length === 0) throw new Error("LISTEN_CHANNELS is required.");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  logLevel: process.env.DEBUG ? LogLevel.DEBUG : LogLevel.INFO,
});

/** channel id -> recent messages, oldest first. In-memory only; resets on restart. */
const buffers = new Map();

function remember(channel, message) {
  const buffer = buffers.get(channel) ?? [];
  buffer.push(message);
  if (buffer.length > BUFFER_SIZE) buffer.shift();
  buffers.set(channel, buffer);
  return buffer;
}

app.message(async ({ message, client, logger }) => {
  // Only plain user messages in the listened channels. Skip edits, deletions,
  // joins, and anything posted by a bot — including ourselves, which would
  // otherwise let the agent evaluate its own notifications.
  if (message.subtype !== undefined) return;
  if (message.bot_id) return;
  if (!LISTEN_CHANNELS.includes(message.channel)) return;
  if (!message.text?.trim()) return;

  const incoming = { user: message.user, text: message.text };
  const buffer = remember(message.channel, incoming);
  // Context is everything before the message under evaluation.
  const context = buffer.slice(0, -1);

  let verdict;
  try {
    verdict = await evaluateMessage(incoming, context);
  } catch (error) {
    // A listener that crashes stops listening. Log and move on.
    logger.error(`evaluation failed: ${error.message}`);
    return;
  }

  logger.info(
    `[${verdict.should_notify ? "FLAG" : "skip"}] ${verdict.reason}`
  );
  if (!verdict.should_notify || !verdict.suggested_message.trim()) return;

  const permalink = await client.chat
    .getPermalink({ channel: message.channel, message_ts: message.ts })
    .then((r) => r.permalink)
    .catch(() => null);

  await client.chat.postMessage({
    channel: NOTIFY_CHANNEL,
    text: verdict.suggested_message,
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: verdict.suggested_message },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: permalink
              ? `<${permalink}|source message> · notify-only, no action taken`
              : "notify-only, no action taken",
          },
        ],
      },
    ],
    unfurl_links: false,
  });
});

const port = Number(process.env.PORT ?? 3000);
await app.start(port);
console.log(
  `Ambient design listener running (trust level: ${TRUST_LEVEL}).\n` +
    `  listening on: ${LISTEN_CHANNELS.join(", ")}\n` +
    `  notifying:    ${NOTIFY_CHANNEL}`
);
