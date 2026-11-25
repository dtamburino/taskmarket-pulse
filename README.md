# Taskmarket Pulse

A read-only dashboard for people who want to see where tasks are posted, what gets paid, and how activity changes on Base and Tempo. Built for the Taskmarket visualizer bounty; not an official Taskmarket product.

## Run locally

Node.js 22+; no application dependencies or credentials.

- `npm test` verifies UTC grouping, pagination, chain isolation, and stablecoin units.
- `npm start` serves the dashboard on `http://127.0.0.1:4177` with a live server-side fetch and a five-minute cache.
- `npm run build` fetches a real snapshot and writes a deployable static site to `dist/`.

## Deploy

This repository uses GitHub Pages as its public host and scheduled GitHub Actions as its server-side fetch. For a fork, select **GitHub Actions** under Settings → Pages once. After that, `npm run deploy` triggers a fresh publication on the default branch. The workflow also refreshes at four offsets per hour. GitHub may delay a scheduled run; the site shows the last verified fetch time, and a failed fetch does not replace the previous deployment. Pages serves the cached site and JSON together. No browser requests go to Taskmarket's API. The site warns explicitly when the last snapshot is over an hour old.

A Cloudflare Worker configuration is also included for installation with `npx wrangler deploy` on an already configured Workers account. The runtime adapter refreshes snapshots on access with a five-minute cache.

## Sources and units

Snapshots come from Taskmarket's public production API, without credentials.

| View | API data |
|---|---|
| Tasks posted, active agents, rewards posted and paid | `/api/stats/platform-time-series` |
| Task status/mode and heatmap | `/api/stats/breakdowns`, `/api/stats/activity-heatmap` |
| Latest events | `/api/stats/activity-feed`, filtered by each event's chain |
| Chain-specific paid workers and active wallets | `/api/market/stats` |
| Bounty Outcomes: seven complete UTC deadline cohorts | Public task deadline, state and award count; never inferred payment |
| Bounty Signal: pools vs. entry counts | Status-filtered and paginated `/api/tasks`; accepting bounties only |
| Last seven days of tasks by chain and weekly posters | Sorted, paginated `/api/tasks`, separately for each chain |

Times are UTC and the current period is partial. An on-page source receipt log records endpoint, chain filter, request count and last upstream response time for each source; downloading the JSON gets the exact snapshot shown. Wallet addresses deduplicate requester counts but aren't published with the dashboard data. Base is 8453 and Tempo is 4217. The platform charts, mode breakdown, feed, and heatmap returned identical data when queried with each chain ID and are not presented as separate chain figures. The amount fields use six decimal places; dollar values represent posted stablecoin face values, not exchange prices.

## License

Project code is MIT. The supplied Taskmarket brand mark belongs to Taskmarket and is used here under the bounty's branding guidance; it is not licensed as project code. Font license texts are included with the assets. No wallet connection, analytics, or third-party logos.

Brand fonts are served as WOFF2 from this site. Latin WOFF2 files are the official Google Fonts distribution of the same open-licensed Instrument Serif and Inter Tight families; font licenses are in the public directory. Original Instrument Serif fonts are retained as local inputs for generating share cards.
