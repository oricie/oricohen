/**
 * Slack-shaped sample messages, with the verdict a well-tuned agent should
 * reach. `expect` is what the simulator scores against — for the mock it is a
 * fixture, for --live it is the eval.
 */
export const samples = [
  {
    user: "priya",
    text: "morning all — standup pushed to 10:30, I've got a dentist thing",
    expect: false,
  },
  {
    user: "dan",
    text: "bumped the card padding to 18px so the title stops colliding with the badge, looks way better now",
    expect: true,
  },
  {
    user: "marcus",
    text: "deployed the new invoice reconciliation job, cut nightly runtime from 40min to 9",
    expect: false,
  },
  {
    user: "els",
    text: "the export flow is 4 steps so I'm putting it in a modal, that way people don't lose their place in the table",
    expect: true,
  },
  {
    user: "priya",
    text: "changed the copy on the empty state from 'Nothing here yet' to 'No invoices yet' — clearer",
    expect: false,
  },
  {
    user: "dan",
    text: "had to do outline: none on the filter chips, the focus ring was showing up on click and QA flagged it as a bug",
    expect: true,
  },
  {
    // A correct answer to a design question is agreement, not news.
    user: "els",
    text: "danger variant for destructive stuff jo — it's in the system already, secondary + the danger token",
    context: [
      { user: "jo", text: "can someone remind me which button variant we use for destructive stuff" },
    ],
    expect: false,
  },
  {
    user: "els",
    text: "couldn't find a multiselect in the system so I built a custom one for the filters panel, we can fold it back in later",
    expect: true,
  },
];
