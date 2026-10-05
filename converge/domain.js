/* Domain packs: realistic content for different kinds of complex products.
   A pack supplies nouns, KPIs, table rows, workflow steps, charts and settings; the renderer lays them out. */
(function (g) {
  'use strict';
  function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const PEOPLE = ['Maya Chen', 'Daniel Okafor', 'Priya Raman', 'Lukas Brandt', 'Sofia Alvarez', 'Tomás Ribeiro', 'Hannah Weiss', 'Ibrahim Yusuf', 'Elena Petrova', 'Marcus Lee', 'Aiko Tanaka', 'Noa Levi'];
  const STEPS = ['inputs', 'build', 'review', 'approve', 'publish'];

  const P = {
    finance: {
      re: /financ|fp&a|planning|budget|forecast|account|treasury|cfo|p&l|ledger/, name: 'Meridian', kind: 'Financial planning platform', users: 'Finance teams',
      cur: '$', unit: 'M', e: ['cost center', 'Cost centers'], labels: { home: 'Overview', workflow: 'Planning cycle', table: 'Cost centers', insights: 'Scenarios', approvals: 'Approvals', settings: 'Settings' },
      groups: { home: 'Plan', workflow: 'Plan', table: 'Plan', insights: 'Analyze', approvals: 'Operate', settings: 'Admin' },
      names: ['Marketing, EMEA', 'R&D Platform', 'Field Sales, NA', 'Customer Success', 'Data Infrastructure', 'People Operations', 'Legal & Compliance', 'Brand & Content', 'Security Engineering', 'Partner Programs', 'Finance Operations', 'Cloud Hosting', 'Product Design', 'Inside Sales', 'IT Services', 'Facilities', 'Recruiting', 'Payments Team'],
      idp: 'CC', range: [0.4, 6.8], spread: 0.09, status: ['On track', 'On track', 'On track', 'At risk', 'Over', 'Draft'], pctLabel: 'Variance',
      cols: [['name', 'Cost center'], ['owner', 'Owner'], ['m1', 'Budget', 'cur'], ['m2', 'Forecast', 'cur'], ['m3', 'Actual YTD', 'cur'], ['pct', 'Variance', 'var'], ['status', 'Status', 'status'], ['trend', 'Trend', 'spark']],
      kpis: [['Revenue forecast', '$48.2M', '+3.1% vs plan', 1], ['Operating expense', '$31.4M', '−1.2% vs plan', 1], ['EBITDA margin', '18.4%', '−0.6 pts', 0], ['Headcount', '412', '+9 open roles', 1]],
      workflow: { name: 'FY26 planning cycle', steps: [['Set drivers', 'Agree growth, pricing and hiring assumptions'], ['Build the plan', 'Each owner submits a bottom-up budget'], ['Review variances', 'Find where the plan and forecast disagree'], ['Approve', 'Sign off at department and company level'], ['Publish', 'Lock the plan and notify owners']] },
      inputsT: 'Planning drivers', drivers: [['Revenue growth', 14, '%'], ['Average price uplift', 3.5, '%'], ['Net new hires', 38, ''], ['FX headwind (EUR)', 1.8, '%']],
      bridge: ['Plan', 'Volume', 'Price', 'Headcount', 'FX', 'Other', 'Forecast'], group: ['R&D', 'Sales', 'Marketing', 'G&A', 'Customer Success', 'Infrastructure'],
      lines: ['Salaries & benefits', 'Contractors', 'Software & tools', 'Travel & events', 'Cloud hosting', 'Marketing programs', 'Facilities'], series: ['Forecast', 'Plan'], trendT: 'Revenue: forecast vs plan', insightT: 'Where is the plan drifting?',
      people: 'Owner', act: ['updated the forecast', 'commented on', 'requested a transfer for', 'approved the plan for'],
      ai: ['3 cost centers are trending over budget. Review suggested reallocations.', 'Marketing, EMEA has spent 71% of its budget with 5 months left.'],
      approvals: [['Move $240K from Hiring to Contractors', 'R&D Platform', 240, 'Within policy'], ['Add 4 headcount in Q3', 'Customer Success', 410, 'Needs CFO'], ['Increase cloud commit by 12%', 'Cloud Hosting', 620, 'Needs CFO'], ['Reclassify $85K travel spend', 'Field Sales, NA', 85, 'Within policy'], ['Reforecast Q2 events budget', 'Brand & Content', 130, 'Within policy'], ['New vendor: analytics tooling', 'Data Infrastructure', 96, 'Within policy'], ['Backfill senior designer', 'Product Design', 74, 'Within policy']],
      settings: [['Planning calendar', [['Fiscal year starts', 'April'], ['Planning cycle length', '10 weeks'], ['Forecast cadence', 'Monthly']]], ['Dimensions & hierarchies', [['Cost center hierarchy', '4 levels'], ['Currency', 'USD, EUR, GBP'], ['Entities', '6 legal entities']]], ['Approval policies', [['Auto-approve under', '$100K'], ['CFO sign-off over', '$500K'], ['Require comments on overruns', 'on']]], ['Integrations', [['ERP', 'NetSuite · synced 2h ago'], ['HRIS', 'Workday · synced 1d ago'], ['Warehouse', 'Snowflake · live']]]]
    },
    erp: {
      re: /erp|procure|inventory|supply|manufactur|warehouse|logistic|order|purchas/, name: 'Foundry', kind: 'ERP for operations', users: 'Operations teams',
      cur: '$', unit: 'K', e: ['purchase order', 'Purchase orders'], labels: { home: 'Operations', workflow: 'Procure to pay', table: 'Purchase orders', insights: 'Supply insights', approvals: 'Approvals', settings: 'Settings' },
      groups: { home: 'Operate', workflow: 'Operate', table: 'Operate', insights: 'Analyze', approvals: 'Operate', settings: 'Admin' },
      names: ['Steel coil, 2mm', 'Bearings kit B-440', 'Packaging, retail', 'Hydraulic pumps', 'Aluminium extrusions', 'Control boards v3', 'Fasteners, assorted', 'Cable assemblies', 'Lubricants, bulk', 'Safety equipment', 'Pallets, EUR', 'Sensors, flow', 'Gaskets, nitrile', 'Motors, 3-phase', 'Paint, industrial', 'Filters, HEPA'],
      idp: 'PO', range: [12, 480], spread: 0.12, status: ['Received', 'In transit', 'In transit', 'Delayed', 'Pending approval', 'Open'], pctLabel: 'On time',
      cols: [['name', 'Item'], ['owner', 'Buyer'], ['m1', 'Order value', 'cur'], ['m2', 'Received', 'cur'], ['m3', 'Open', 'cur'], ['pct', 'On-time', 'pct'], ['status', 'Status', 'status'], ['trend', 'Lead time', 'spark']],
      kpis: [['Open purchase orders', '184', '+12 this week', 1], ['On-time delivery', '93.4%', '−1.1 pts', 0], ['Inventory value', '$8.7M', '−2.4%', 1], ['Stockout risk', '7 items', '+2 this week', 0]],
      workflow: { name: 'Procure to pay', steps: [['Requisition', 'Capture what is needed and by when'], ['Source & price', 'Compare suppliers and lock terms'], ['Receive & inspect', 'Match deliveries against orders'], ['Approve invoice', 'Three-way match and sign-off'], ['Pay', 'Release payment and close the order']] },
      inputsT: 'Requisition details', drivers: [['Quantity', 1200, 'units'], ['Need-by (days)', 21, 'd'], ['Target unit price', 4.8, '$'], ['Safety stock', 15, '%']],
      bridge: ['Budget', 'Price', 'Volume', 'Freight', 'Duties', 'Other', 'Actual'], group: ['Raw materials', 'Components', 'Packaging', 'Logistics', 'MRO', 'Services'],
      lines: ['Unit cost', 'Freight', 'Duties & taxes', 'Handling', 'Insurance'], series: ['Actual', 'Target'], trendT: 'Spend: actual vs target', insightT: 'Where is supply slipping?',
      people: 'Buyer', act: ['confirmed delivery for', 'flagged a delay on', 'approved', 'received goods for'],
      ai: ['7 items may stock out within 10 days. Suggested reorders are ready.', 'Supplier Nordform has slipped on 4 of the last 6 deliveries.'],
      approvals: [['Expedite freight for Control boards v3', 'Control boards v3', 18, 'Within policy'], ['Switch supplier for Gaskets, nitrile', 'Gaskets, nitrile', 42, 'Needs Ops lead'], ['Bulk order, Steel coil', 'Steel coil, 2mm', 310, 'Needs CFO'], ['Accept partial delivery', 'Bearings kit B-440', 9, 'Within policy'], ['Pay early for 2% discount', 'Packaging, retail', 64, 'Within policy'], ['New supplier onboarding', 'Sensors, flow', 0, 'Needs Ops lead']],
      settings: [['Procurement policy', [['Auto-approve under', '$5K'], ['Three-way match tolerance', '2%'], ['Preferred suppliers only', 'on']]], ['Warehouses', [['Locations', '5 sites'], ['Cycle count', 'Weekly'], ['Safety stock rule', 'Per item class']]], ['Roles', [['Buyers', '14 people'], ['Approvers', '6 people'], ['Auditors', '3 people']]], ['Integrations', [['Accounting', 'Connected'], ['Carrier tracking', 'Connected'], ['EDI partners', '23 active']]]]
    },
    crm: {
      re: /crm|sales|pipeline|customer|lead|deal|account manag/, name: 'Harbor', kind: 'CRM for sales teams', users: 'Sales teams',
      cur: '$', unit: 'K', e: ['opportunity', 'Opportunities'], labels: { home: 'Pipeline', workflow: 'Deal desk', table: 'Opportunities', insights: 'Forecast', approvals: 'Approvals', settings: 'Settings' },
      groups: { home: 'Sell', workflow: 'Sell', table: 'Sell', insights: 'Analyze', approvals: 'Operate', settings: 'Admin' },
      names: ['Northwind Logistics', 'Acme Retail Group', 'Helios Energy', 'Brightwave Media', 'Orbital Health', 'Kestrel Bank', 'Lumen Foods', 'Atlas Mobility', 'Verde Capital', 'Polar Systems', 'Cobalt Insurance', 'Tidewater Marine', 'Summit Education', 'Aurora Telecom', 'Ironbridge Steel', 'Zenith Pharma'],
      idp: 'OPP', range: [24, 520], spread: 0.1, status: ['Qualified', 'Discovery', 'Proposal', 'Negotiation', 'At risk', 'Closed won'], pctLabel: 'Win prob.',
      cols: [['name', 'Account'], ['owner', 'Owner'], ['m1', 'Amount', 'cur'], ['m2', 'Weighted', 'cur'], ['m3', 'Last 90d', 'cur'], ['pct', 'Win prob.', 'pct'], ['status', 'Stage', 'status'], ['trend', 'Activity', 'spark']],
      kpis: [['Open pipeline', '$12.4M', '+8% this quarter', 1], ['Weighted forecast', '$4.1M', '+$310K', 1], ['Win rate', '27%', '−1.4 pts', 0], ['Avg. cycle', '64 days', '−3 days', 1]],
      workflow: { name: 'Deal desk', steps: [['Qualify', 'Confirm need, budget and authority'], ['Shape the offer', 'Scope, pricing and terms'], ['Review risk', 'Check discount, legal and delivery risk'], ['Approve', 'Deal desk and finance sign-off'], ['Send & track', 'Share the proposal and follow up']] },
      inputsT: 'Qualification', drivers: [['Deal size', 180, 'K'], ['Seats', 240, ''], ['Discount', 12, '%'], ['Term (months)', 24, '']],
      bridge: ['Start', 'New', 'Expansion', 'Slipped', 'Lost', 'Won', 'End'], group: ['Enterprise', 'Mid-market', 'SMB', 'Partners', 'Renewals', 'Expansion'],
      lines: ['Platform licence', 'Services', 'Support', 'Add-ons', 'Discount'], series: ['Forecast', 'Quota'], trendT: 'Pipeline: forecast vs quota', insightT: 'Which deals will slip?',
      people: 'Owner', act: ['logged a call with', 'moved to Proposal:', 'sent a quote to', 'updated the close date for'],
      ai: ['4 deals have gone quiet for 14+ days. Draft follow-ups are ready.', 'Kestrel Bank is likely to close early. Move forecast to commit?'],
      approvals: [['Discount 22% on Northwind Logistics', 'Northwind Logistics', 410, 'Needs CRO'], ['Non-standard payment terms', 'Helios Energy', 220, 'Needs Finance'], ['Extend pilot by 30 days', 'Orbital Health', 0, 'Within policy'], ['Bundle services at cost', 'Kestrel Bank', 90, 'Within policy'], ['Custom SLA clause', 'Verde Capital', 150, 'Needs Legal']],
      settings: [['Pipeline', [['Stages', '6 stages'], ['Forecast categories', 'Commit, Best case, Pipeline'], ['Close date required', 'on']]], ['Discount policy', [['Rep limit', '10%'], ['Manager limit', '20%'], ['Deal desk over', '20%']]], ['Roles', [['Reps', '48 people'], ['Managers', '9 people'], ['Revenue ops', '4 people']]], ['Integrations', [['Email & calendar', 'Connected'], ['Billing', 'Stripe'], ['Data warehouse', 'BigQuery']]]]
    },
    bi: {
      re: /\bbi\b|analytic|dashboard|metric|insight|report|data platform|warehouse|business intelligence/, name: 'Lumen', kind: 'BI & analytics platform', users: 'Analysts and operators',
      cur: '', unit: '', e: ['metric', 'Metrics'], labels: { home: 'Home', workflow: 'Analysis', table: 'Metrics', insights: 'Explore', approvals: 'Alerts', settings: 'Settings' },
      groups: { home: 'Explore', workflow: 'Explore', table: 'Explore', insights: 'Explore', approvals: 'Monitor', settings: 'Admin' },
      names: ['Weekly active users', 'Net revenue retention', 'Checkout conversion', 'Support first response', 'Gross margin', 'Churn, 30 day', 'Feature adoption', 'CAC payback', 'Pipeline velocity', 'NPS', 'Error rate', 'Time to value', 'Trial to paid', 'Order defect rate'],
      idp: 'MET', range: [2, 90], spread: 0.1, status: ['Healthy', 'Healthy', 'Watching', 'Anomaly', 'Stale'], pctLabel: 'Change', num: true,
      cols: [['name', 'Metric'], ['owner', 'Owner'], ['m1', 'Current', 'num'], ['m2', 'Target', 'num'], ['m3', 'Prior period', 'num'], ['pct', 'Change', 'var'], ['status', 'Status', 'status'], ['trend', '12 weeks', 'spark']],
      kpis: [['Weekly active users', '184K', '+4.2% WoW', 1], ['Net revenue retention', '112%', '+1.0 pt', 1], ['Checkout conversion', '3.1%', '−0.3 pts', 0], ['Data freshness', '99.2%', '2 tables stale', 0]],
      workflow: { name: 'Analysis', steps: [['Ask a question', 'Start from a metric or a hunch'], ['Explore', 'Slice, filter and compare'], ['Validate', 'Check data quality and definitions'], ['Review', 'Get a second pair of eyes'], ['Share', 'Publish to a dashboard or a channel']] },
      inputsT: 'The question', drivers: [['Metric', 'Checkout conversion', ''], ['Period (days)', 28, 'd'], ['Compare to', 'Prior period', ''], ['Segment', 'Mobile web', '']],
      bridge: ['Last period', 'Traffic', 'Mobile', 'Pricing', 'Bug', 'Other', 'This period'], group: ['Web', 'iOS', 'Android', 'API', 'Partners', 'Email'],
      lines: ['Sessions', 'Add to cart', 'Checkout started', 'Payment', 'Confirmed'], series: ['This period', 'Prior'], trendT: 'Conversion: this period vs prior', insightT: 'What changed this week?',
      people: 'Owner', act: ['edited the definition of', 'annotated', 'subscribed to', 'shared'],
      ai: ['Checkout conversion dropped 0.3 pts on mobile web since Tuesday. See the likely cause.', '2 tables are stale and affect 6 dashboards.'],
      approvals: [['Checkout conversion below threshold', 'Checkout conversion', 0, 'Alert'], ['Anomaly in order defect rate', 'Order defect rate', 0, 'Alert'], ['Stale source: payments_daily', 'Gross margin', 0, 'Alert'], ['Weekly active users above forecast', 'Weekly active users', 0, 'Info']],
      settings: [['Data sources', [['Warehouse', 'BigQuery · live'], ['Product events', 'Segment'], ['CRM', 'Salesforce · hourly']]], ['Metric definitions', [['Governed metrics', '84'], ['Certified', '51'], ['Require review to change', 'on']]], ['Access', [['Viewers', '320 people'], ['Editors', '41 people'], ['Row-level rules', '12']]], ['Alerts', [['Delivery', 'Slack, email'], ['Quiet hours', '19:00 to 07:00'], ['Anomaly sensitivity', 'Medium']]]]
    },
    dev: {
      re: /develop|devtool|engineer|deploy|incident|ci\b|cicd|observab|api|infra|platform eng|sre|code|git/, name: 'Relay', kind: 'Developer platform', users: 'Engineering teams',
      cur: '', unit: '', e: ['service', 'Services'], labels: { home: 'Overview', workflow: 'Incident response', table: 'Services', insights: 'Reliability', approvals: 'Deploy gates', settings: 'Settings' },
      groups: { home: 'Build', workflow: 'Operate', table: 'Build', insights: 'Operate', approvals: 'Operate', settings: 'Admin' },
      names: ['checkout-api', 'auth-service', 'search-indexer', 'billing-worker', 'notifications', 'edge-gateway', 'media-pipeline', 'recs-ranker', 'orders-db', 'feature-flags', 'webhooks', 'identity-sync', 'reports-batch', 'cdn-config'],
      idp: 'SVC', range: [20, 99], spread: 0.1, status: ['Healthy', 'Healthy', 'Degraded', 'Incident', 'Deploying'], pctLabel: 'Error rate', num: true,
      cols: [['name', 'Service'], ['owner', 'Team lead'], ['m1', 'p95 latency', 'ms'], ['m2', 'Requests/s', 'num'], ['m3', 'Deploys (7d)', 'num'], ['pct', 'Error rate', 'err'], ['status', 'Status', 'status'], ['trend', 'Traffic', 'spark']],
      kpis: [['Deploys this week', '312', '+18%', 1], ['Change failure rate', '4.1%', '−0.8 pts', 1], ['Mean time to recover', '28 min', '+6 min', 0], ['Open incidents', '2', '1 sev-2', 0]],
      workflow: { name: 'Incident response', steps: [['Detect', 'Alert fires and the on-call is paged'], ['Triage', 'Assess impact and assign severity'], ['Mitigate', 'Roll back, flag off or scale up'], ['Verify', 'Confirm recovery with the owners'], ['Review', 'Write up what happened and follow-ups']] },
      inputsT: 'Incident details', drivers: [['Severity', 'Sev-2', ''], ['Affected users', 14, '%'], ['Started (min ago)', 17, 'm'], ['Suspect change', 'deploy #4821', '']],
      bridge: ['Baseline', 'Deploy', 'Traffic', 'Database', 'Cache', 'Other', 'Current'], group: ['API', 'Web', 'Workers', 'Data', 'Edge', 'Internal'],
      lines: ['Compute', 'Database', 'Network', 'Third party', 'Storage'], series: ['Latency', 'Target'], trendT: 'p95 latency vs target', insightT: 'What is slowing us down?',
      people: 'Team lead', act: ['deployed', 'rolled back', 'acknowledged the alert for', 'merged a fix for'],
      ai: ['checkout-api latency rose after deploy #4821. A rollback is ready.', '2 services have no on-call owner this week.'],
      approvals: [['Deploy #4824 to production', 'checkout-api', 0, 'Checks passed'], ['Schema migration on orders-db', 'orders-db', 0, 'Needs DBA'], ['Enable flag: new-ranker 25%', 'recs-ranker', 0, 'Checks passed'], ['Hotfix for webhooks retries', 'webhooks', 0, 'Checks passed'], ['Increase gateway rate limit', 'edge-gateway', 0, 'Needs SRE']],
      settings: [['Environments', [['Production', '3 regions'], ['Staging', '1 region'], ['Preview', 'per pull request']]], ['Deploy policy', [['Require passing checks', 'on'], ['Freeze window', 'Fri 16:00 to Mon 09:00'], ['Auto-rollback on errors', 'on']]], ['Access', [['Engineers', '142 people'], ['On-call', '18 people'], ['Admins', '5 people']]], ['Integrations', [['Source control', 'GitHub'], ['Chat', 'Slack'], ['Paging', 'PagerDuty']]]]
    },
    admin: {
      re: /admin|identity|access|permission|iam|user manage|compliance|governance|audit|security/, name: 'Keystone', kind: 'Admin & access platform', users: 'IT and security admins',
      cur: '', unit: '', e: ['user', 'Users'], labels: { home: 'Overview', workflow: 'Access reviews', table: 'Users & access', insights: 'Risk', approvals: 'Requests', settings: 'Settings' },
      groups: { home: 'Govern', workflow: 'Govern', table: 'Manage', insights: 'Govern', approvals: 'Manage', settings: 'Admin' },
      names: ['Aiko Tanaka', 'Marcus Lee', 'Noa Levi', 'Elena Petrova', 'Ibrahim Yusuf', 'Hannah Weiss', 'Tomás Ribeiro', 'Sofia Alvarez', 'Lukas Brandt', 'Priya Raman', 'Daniel Okafor', 'Maya Chen', 'Jonas Berg', 'Amara Nwosu'],
      idp: 'USR', range: [3, 60], spread: 0.1, status: ['Active', 'Active', 'Active', 'Review due', 'Suspended', 'Invited'], pctLabel: 'Risk', num: true,
      cols: [['name', 'User'], ['owner', 'Manager'], ['m1', 'Apps', 'num'], ['m2', 'Roles', 'num'], ['m3', 'Privileged', 'num'], ['pct', 'Risk', 'risk'], ['status', 'Status', 'status'], ['trend', 'Sign-ins', 'spark']],
      kpis: [['Active users', '2,184', '+31 this month', 1], ['Reviews overdue', '14', '+3', 0], ['Privileged accounts', '96', '−5', 1], ['Stale access', '212', '−18%', 1]],
      workflow: { name: 'Access review', steps: [['Scope', 'Choose apps, groups and reviewers'], ['Collect', 'Pull current access from every system'], ['Review', 'Managers keep or remove access'], ['Approve', 'Security signs off on exceptions'], ['Remediate', 'Revoke access and record evidence']] },
      inputsT: 'Review scope', drivers: [['Applications', 18, ''], ['Reviewers', 46, ''], ['Due in (days)', 14, 'd'], ['Include contractors', 'Yes', '']],
      bridge: ['Start', 'Joiners', 'Movers', 'Leavers', 'Revoked', 'Other', 'End'], group: ['Engineering', 'Sales', 'Finance', 'Support', 'People', 'Legal'],
      lines: ['Admin roles', 'App roles', 'Groups', 'API keys', 'Shared accounts'], series: ['Granted', 'Used'], trendT: 'Access granted vs used', insightT: 'Where is access excessive?',
      people: 'Manager', act: ['approved access for', 'revoked access for', 'requested a role for', 'reviewed'],
      ai: ['212 accounts have not used their access in 90 days. Suggested removals are ready.', '3 contractors still have production access.'],
      approvals: [['Admin role for Marcus Lee', 'Marcus Lee', 0, 'Needs Security'], ['Access to Payroll app', 'Noa Levi', 0, 'Within policy'], ['Extend contractor access', 'Jonas Berg', 0, 'Needs Manager'], ['Add to Finance-Approvers', 'Sofia Alvarez', 0, 'Within policy']],
      settings: [['Policies', [['Review frequency', 'Quarterly'], ['Auto-revoke unused after', '90 days'], ['Require MFA', 'on']]], ['Roles', [['Role templates', '24'], ['Custom roles', '9'], ['Separation of duties', 'on']]], ['Directory', [['Identity provider', 'Okta · synced'], ['HR source', 'Workday'], ['Provisioning', 'SCIM']]], ['Audit', [['Retention', '7 years'], ['Export', 'Weekly to storage'], ['Tamper evidence', 'on']]]]
    },
    generic: {
      re: /./, name: 'Northline', kind: 'Enterprise software platform', users: 'Operations teams',
      cur: '', unit: '', e: ['record', 'Records'], labels: { home: 'Overview', workflow: 'Workflow', table: 'Records', insights: 'Insights', approvals: 'Approvals', settings: 'Settings' },
      groups: { home: 'Work', workflow: 'Work', table: 'Work', insights: 'Analyze', approvals: 'Operate', settings: 'Admin' },
      names: ['Project Aurora', 'Vendor onboarding', 'Q3 launch plan', 'Customer migration', 'Compliance audit', 'Hiring pipeline', 'Contract renewals', 'Facilities move', 'Data cleanup', 'Partner program', 'Pricing review', 'Platform upgrade'],
      idp: 'REC', range: [10, 90], spread: 0.1, status: ['On track', 'On track', 'At risk', 'Blocked', 'Draft'], pctLabel: 'Progress', num: true,
      cols: [['name', 'Name'], ['owner', 'Owner'], ['m1', 'Planned', 'num'], ['m2', 'Current', 'num'], ['m3', 'Remaining', 'num'], ['pct', 'Variance', 'var'], ['status', 'Status', 'status'], ['trend', 'Trend', 'spark']],
      kpis: [['Active records', '1,284', '+6%', 1], ['On-time rate', '91%', '−2 pts', 0], ['Open issues', '37', '+4', 0], ['Throughput', '212/wk', '+9%', 1]],
      workflow: { name: 'Core workflow', steps: [['Intake', 'Capture the request'], ['Plan', 'Scope and assign'], ['Review', 'Check quality and risk'], ['Approve', 'Sign off'], ['Complete', 'Close and report']] },
      inputsT: 'Inputs', drivers: [['Scope', 12, ''], ['Team size', 8, ''], ['Weeks', 6, 'w'], ['Risk buffer', 15, '%']],
      bridge: ['Plan', 'Scope', 'Capacity', 'Risk', 'Delays', 'Other', 'Actual'], group: ['Team A', 'Team B', 'Team C', 'Team D', 'Team E', 'Team F'],
      lines: ['Labor', 'Materials', 'Services', 'Travel', 'Other'], series: ['Actual', 'Plan'], trendT: 'Actual vs plan', insightT: 'What is drifting?',
      people: 'Owner', act: ['updated', 'commented on', 'approved', 'created'],
      ai: ['3 records are at risk of missing their dates. Review suggested actions.', 'Two owners are over capacity this week.'],
      approvals: [['Extend deadline by 2 weeks', 'Project Aurora', 0, 'Needs Lead'], ['Add contractor capacity', 'Q3 launch plan', 0, 'Within policy'], ['Reprioritize backlog', 'Customer migration', 0, 'Within policy'], ['Scope change', 'Platform upgrade', 0, 'Needs Lead']],
      settings: [['General', [['Workspace name', 'Northline'], ['Default view', 'Overview'], ['Notifications', 'Daily digest']]], ['Roles', [['Admins', '4 people'], ['Editors', '36 people'], ['Viewers', '210 people']]], ['Policies', [['Approval required over', 'Threshold'], ['Auto-archive after', '90 days'], ['Require comments', 'on']]], ['Integrations', [['Calendar', 'Connected'], ['Chat', 'Connected'], ['Storage', 'Connected']]]]
    }
  };
  const ORDER = ['finance', 'erp', 'crm', 'dev', 'admin', 'bi'];

  function detect(text, type) {
    const t = (text || '').toLowerCase() + ' ' + (type || '').toLowerCase();
    if (type && P[type]) return type;
    for (const k of ORDER) if (P[k].re.test(t)) return k;
    return 'generic';
  }

  function money(pack, v) {
    const c = pack.cur;
    if (pack.unit === 'M') return c + (v >= 10 ? v.toFixed(1) : v.toFixed(2)) + 'M';
    return c + (v >= 1000 ? (v / 1000).toFixed(2) + 'M' : Math.round(v) + 'K');
  }

  function rows(pack, seed, n) {
    const r = rng(seed * 7919 + 13), out = [], names = pack.names;
    for (let i = 0; i < n; i++) {
      const name = names[i % names.length] + (i >= names.length ? ' ' + (Math.floor(i / names.length) + 1) : '');
      const base = pack.range[0] + (pack.range[1] - pack.range[0]) * Math.pow(r(), 1.6);
      const m1 = +base.toFixed(2), m2 = +(m1 * (1 + (r() - 0.35) * pack.spread * 2)).toFixed(2), m3 = +(m2 * (0.35 + r() * 0.6)).toFixed(2);
      const pct = pack.num && !/Variance|Change/.test(pack.pctLabel) ? Math.round(55 + r() * 44) : +(((m2 - m1) / m1) * 100).toFixed(1);
      const status = pack.status[Math.floor(r() * pack.status.length)];
      const trend = Array.from({ length: 10 }, (_, k) => 40 + 30 * Math.sin(k / 2 + r() * 2) + k * (r() * 3 - 0.8) + r() * 12);
      out.push({ id: pack.idp + '-' + (1040 + i * 7 + Math.floor(r() * 5)), name, owner: PEOPLE[Math.floor(r() * PEOPLE.length)], m1, m2, m3, pct, status, trend, i });
    }
    return out;
  }
  function fmt(pack, f, row, key) {
    const v = row[key];
    switch (f) {
      case 'cur': return money(pack, v);
      case 'num': return pack.cur === '' ? (v >= 100 ? Math.round(v).toLocaleString('en-US') : v.toFixed(1)) : Math.round(v).toLocaleString('en-US');
      case 'ms': return Math.round(v * 4) + ' ms';
      case 'err': return (100 - v) / 25 < 0.2 ? '0.2%' : ((100 - v) / 25).toFixed(1) + '%';
      case 'risk': return v > 85 ? 'Low' : v > 70 ? 'Medium' : 'High';
      case 'pct': return Math.round(v) + '%';
      case 'var': return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(1) + '%';
      default: return v;
    }
  }
  function series(seed, n, start, drift, noise) { const r = rng(seed); let v = start; return Array.from({ length: n }, () => (v += drift + (r() - 0.5) * noise)); }
  function detail(pack, row, seed) {
    const r = rng(seed * 31 + row.i);
    const lines = pack.lines.map((l, k) => { const a = +(row.m1 * (0.12 + r() * 0.3) / pack.lines.length * 3).toFixed(2); return { l, a, b: +(a * (0.85 + r() * 0.35)).toFixed(2) }; });
    const act = pack.act, people = PEOPLE;
    return {
      lines, facts: [[pack.people, row.owner], ['Reference', row.id], ['Status', row.status], ['Last updated', 'Today, 09:14']],
      activity: [0, 1, 2, 3].map(k => ({ who: people[(row.i + k * 3) % people.length], what: act[k % act.length] + ' ' + row.name, when: ['2h ago', 'Yesterday', '3 days ago', 'Last week'][k] })),
      a: series(seed + row.i, 12, 40, 3, 14), b: series(seed + row.i + 99, 12, 42, 2.2, 10)
    };
  }
  function charts(pack, seed) {
    const r = rng(seed + 5), bridge = pack.bridge.map((l, i) => i === 0 ? { l, v: 100, t: 'start' } : i === pack.bridge.length - 1 ? { l, t: 'end' } : { l, v: Math.round((r() - 0.42) * 24) });
    let tot = 100; bridge.forEach(b => { if (b.t !== 'end' && b.t !== 'start') tot += b.v; }); bridge[bridge.length - 1].v = tot;
    return { trend: [series(seed + 1, 14, 100, 2.1, 6), series(seed + 2, 14, 100, 1.7, 3)], bridge, groups: pack.group.map(l => ({ l, v: Math.round(30 + r() * 70) })).sort((a, b) => b.v - a.v) };
  }

  g.DOMAIN = { P, detect, rows, fmt, money, series, detail, charts, rng, PEOPLE, STEPS };
})(window);
