# Ambient Design Listener

An ambient agent: it watches a Slack channel continuously, decides on its own
when something is worth surfacing, and posts back into Slack without being
asked. Applied here to design work — it flags decisions that cut against the
team's design system.

**Notify-only.** It never drafts a change and never makes one. That is a
deliberate ceiling, not a missing feature: proactive agents that overreach get
muted, and a muted agent catches nothing. Trust is earned at notify first.

`DESIGN.md` is the actual brain. Detection quality depends entirely on what is
written in it — the code below is just plumbing around that file.

## Files

| File | What it is |
|---|---|
| `DESIGN.md` | Design-system rules plus explicit flag / don't-flag guidance. Read fresh on every evaluation, so edits apply without a restart. |
| `evaluator.js` | `evaluateMessage()` — sends the message plus rolling channel context to Claude with `DESIGN.md` as system context, returns strict JSON. |
| `index.js` | Slack Bolt app (Socket Mode). Buffers recent messages per channel, evaluates each new one, posts to `NOTIFY_CHANNEL` when `should_notify` is true. |
| `samples.js` | Eight Slack-shaped sample messages with the verdict a well-tuned agent should reach. Four should flag. |
| `simulate.js` | Local harness. Runs the samples through either a keyword mock or the real evaluator. |

## The contract

Every evaluator — the real one and the mock — returns the same shape:

```json
{
  "should_notify": true,
  "reason": "hardcoded pixel value instead of a spacing token",
  "suggested_message": "That padding change is off the 4px scale — ..."
}
```

`reason` is for the operator's log and is never posted. `suggested_message` is
what lands in Slack, and is empty when `should_notify` is false.

## Run it

```bash
npm install
cp .env.example .env    # then fill it in

npm run simulate        # keyword mock — no network, no API key
npm run simulate:live   # same samples, real model — needs ANTHROPIC_API_KEY
npm start               # live Slack listener
```

Both simulator modes print each verdict against its expectation and exit
non-zero on any disagreement, so `npm run simulate:live` doubles as a
regression gate on `DESIGN.md` edits. Start there before pointing it at a real
channel: it is the cheapest place to see false positives.

## Slack app setup

1. **Create the app** — [api.slack.com/apps](https://api.slack.com/apps) →
   *Create New App* → *From scratch*. Name it, pick the workspace.

2. **Enable Socket Mode** — *Settings → Socket Mode* → toggle on. It will
   prompt you to generate an app-level token; give it the `connections:write`
   scope. The `xapp-...` token it hands back is `SLACK_APP_TOKEN`.

   Socket Mode means no public URL and no inbound webhook — the app opens an
   outbound WebSocket instead. That is why this runs fine from a laptop.

3. **Bot token scopes** — *Features → OAuth & Permissions → Bot Token Scopes*:

   | Scope | Why |
   |---|---|
   | `channels:history` | read messages in public channels it's in |
   | `channels:read` | resolve channel metadata |
   | `chat:write` | post the notifications |
   | `groups:history`, `groups:read` | same, for private channels (skip if public-only) |

4. **Event subscriptions** — *Features → Event Subscriptions* → toggle on
   (no Request URL needed under Socket Mode) → *Subscribe to bot events* →
   add `message.channels` (and `message.groups` for private channels).

5. **Install** — *OAuth & Permissions → Install to Workspace*. The
   `xoxb-...` **Bot User OAuth Token** is `SLACK_BOT_TOKEN`. The signing secret
   is under *Settings → Basic Information → App Credentials*.

6. **Invite the bot** to every channel it should listen to, and to the notify
   channel: `/invite @your-app-name`. It sees nothing in a channel it isn't in.

7. **Channel IDs** — the app needs IDs (`C0123456789`), not names. In the Slack
   UI: right-click the channel → *View channel details* → the ID is at the
   bottom of the dialog. Or take it from a message permalink:
   `.../archives/C0123456789/p1700000000000000`.

If you re-install or change scopes, the bot token rotates — update `.env`.

## Notes and limits

- **Context is in-memory.** The rolling buffer resets on restart; a restarted
  agent may re-flag something it already flagged.
- **Bot messages are skipped**, including its own, so it never evaluates its own
  notifications.
- **Evaluation failures are logged and swallowed.** A listener that crashes
  stops listening.
- **One evaluation per message.** Cost scales with channel volume — worth
  watching before pointing this at a busy channel.

## Deliberately out of scope

Figma/MCP integration. Meeting transcripts. Cross-tool context (Notion, Jira,
roadmap). Persistent memory across restarts. The `draft` and `act` trust
levels — those come only after notify-level output is actually trustworthy,
and `index.js` refuses to start if you set one early.
