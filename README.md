# OKA Shop 🫙

The online shop for **OKA Small Cheesecake Shop** (小小起司蛋糕店): handmade cheesecake in 220g jars, made in Tainan and shipped chilled across Taiwan.

- **Shop** (`/`), in English and 繁體中文:
  - flavors, and a gift box builder: up to 6 jars, 10% off the jars only when the box is full, plus NT$50 for the box, with a quantity per box
  - bag with NT$220 shipping (free from NT$2,000)
  - **LINE Login** at checkout
  - ship date picker (Mon–Fri, with closed days and an optional daily limit)
  - bank-transfer payment step where the customer enters the **last 5 digits** of their account
  - **My orders** with live status
  - **Share button**: the phone's share menu on mobile, or LINE / Facebook / copy link on a computer. Shared links show a preview image with the OKA logo.
- **Automatic LINE messages** from the OKA Official Account: order received (with the bank details), payment confirmed, shipped (with tracking number), cancelled. The team can get new-order and payment-report alerts on their own LINE.
- **Admin** (`/admin`), password sign-in for the owner and staff:
  - **Orders:** status counters, filters, search, confirm payment, mark shipped with tracking, cancel or undo, a history and LINE message log per order, team notes, CSV export
  - **Production:** jars to bake per flavor for each ship date
  - **Customers:** everyone who logged in with LINE, with contact details from their latest order, number of orders, total paid, join date and whether they're a LINE friend (non-friends don't get messages); search, order history per customer, CSV export (owner only)
  - **Products:** names, prices, status (on sale / coming soon / hidden), photos
  - **Settings:** shipping, gift box discount, ship days, closed dates, daily limit, bank details
  - **Team:** staff accounts. Staff handle orders; only owners change products, prices and settings.
- **Prices are calculated on the server**, so they can't be changed in the browser. The shop page uses the same `public/js/pricing.js` to show them.
- **Runs on Cloudflare** (Workers + D1 database + R2 for photos), the same way as Parsley Time. It also runs on Node.js 22.13+ for local development.

## Put it online with Cloudflare

`wrangler.jsonc` holds the settings. On the first deploy Cloudflare creates the `oka-shop` D1 database and the `oka-shop-photos` R2 bucket.

1. In the Cloudflare dashboard, open **R2** once and enable it. It's free up to 10 GB, but Cloudflare may ask for a card.
2. Go to **Workers & Pages → Create → Import a repository** and choose `oka-shop`. Keep the defaults (deploy command `npx wrangler deploy`) and click **Deploy**.
3. In the new Worker, go to **Settings → Variables and Secrets** and add these, each as type **Secret**:

   | Name | Value |
   |---|---|
   | `ADMIN_PASSWORD` | The password for your first admin sign-in |
   | `LINE_LOGIN_CHANNEL_ID` | LINE Login channel → Basic settings → Channel ID |
   | `LINE_LOGIN_CHANNEL_SECRET` | LINE Login channel → Basic settings → Channel secret |
   | `LINE_MESSAGING_TOKEN` | Messaging API channel → Channel access token (long-lived) |

4. Open `https://oka-shop.<your-name>.workers.dev/admin`. Sign in with the name you want (for example `Nick`) and your `ADMIN_PASSWORD`. That first sign-in creates the owner account.
5. In **Settings**, fill in your bank details. Check the shipping fee, ship days and closed dates.
6. In the account menu, choose **Send new orders to my LINE**. Before that, open the shop in the same browser and log in with LINE once.

Every push to `main` updates the shop automatically. Orders stay in D1; Cloudflare keeps 30 days of point-in-time backups (Time Travel), and you can export orders as CSV.

**Your own domain:** go to Worker → Settings → Domains & Routes → Add custom domain. If you change the domain, also update the LINE Login callback URL (below).

Without the LINE secrets the shop still opens, but checkout shows "Online ordering isn't open yet". Without `LINE_MESSAGING_TOKEN`, orders work but no LINE messages are sent; each order's message log then shows "not sent".

## Set up LINE (one time)

Everything happens in the [LINE Developers Console](https://developers.line.biz/console/). Sign in with the LINE account that manages the OKA Official Account (@637xgnpi).

1. **Messaging API (messages to customers):**
   1. In [LINE Official Account Manager](https://manager.line.biz/), go to **Settings → Messaging API → Enable Messaging API** and pick (or create) a provider, for example "OKA".
   2. In the Developers Console, open that provider → the Messaging API channel → **Messaging API** tab → **Channel access token (long-lived) → Issue**. This is `LINE_MESSAGING_TOKEN`.
2. **LINE Login (customers sign in):**
   1. In the **same provider**, choose **Create a new channel → LINE Login**. Set the app type to **Web app**.
   2. On the **LINE Login** tab, set **Callback URL** to `https://<your shop address>/auth/line/callback`, for example `https://oka-shop.<your-name>.workers.dev/auth/line/callback`.
   3. On **Basic settings → Linked LINE Official Account**, choose OKA. This makes LINE ask customers to add OKA as a friend when they log in. LINE only delivers shop messages to friends.
   4. Copy the **Channel ID** and **Channel secret** into the Cloudflare secrets.
   5. Switch the channel from **Developing** to **Published**. Until then, only people added as testers can log in.

Push messages count toward your Official Account plan's monthly message allowance. Each order uses about 3–4 messages.

## How an order flows

| Status | What happens |
|---|---|
| **Awaiting payment** (待付款) | Customer checks out. They get a LINE message with the total and bank details; the team gets an alert. |
| **Payment reported** (已回報匯款) | Customer enters the last 5 digits. The team gets an alert, and the order shows under "Transfers to check". |
| **Paid** (已付款) | You press **Confirm payment** after checking your bank. The customer gets a confirmation with the ship date. |
| **Shipped** (已出貨) | You press **Mark shipped** and optionally add the tracking number. The customer is told. |
| **Cancelled** (已取消) | Possible until shipped. The customer is told. |

Undo steps (for example back to "Payment reported") never message the customer. **Resend last update** in an order's details sends the current message again.

## Run it on your computer

```bash
npm start            # http://localhost:3000, admin at /admin (first password: oka-admin)
npm test             # API tests (pricing, checkout, admin, LINE login and messages with a fake LINE)
npm install && npm run dev   # the Cloudflare version, run locally with wrangler
```

Without LINE secrets, the local version offers a **test login** (any name) instead of LINE, so you can try the whole checkout. It's switched off automatically when LINE is set up, and on Cloudflare it only exists if you set `DEV_LOGIN=1`.

| Variable | Default | Meaning |
|---|---|---|
| `ADMIN_PASSWORD` | `oka-admin` | Password for the first admin sign-in (creates the owner) |
| `LINE_LOGIN_CHANNEL_ID`, `LINE_LOGIN_CHANNEL_SECRET` | none | LINE Login |
| `LINE_MESSAGING_TOKEN` | none | LINE messages |
| `APP_TIMEZONE` | `Asia/Taipei` | Timezone for "today" and ship dates |
| `DEV_LOGIN` | on locally, off on Cloudflare | Test login without LINE |
| `PORT`, `DATA_DIR` | `3000`, `./data` | Node version only |

## Code map

| Path | What it does |
|---|---|
| `src/app.js` | API: shop data, LINE login, orders, admin, photos. Shared by both hosts. |
| `src/line.js`, `src/messages.js` | LINE Login and Messaging API calls, and the message texts (中文 / English) |
| `src/worker.js`, `wrangler.jsonc` | Cloudflare host (D1 + R2) |
| `server.js`, `src/node-db.js` | Node host (node:sqlite + a photos folder) |
| `public/js/pricing.js` | Box price, shipping and ship dates, used by both the server and the shop page |
| `public/index.html`, `public/js/shop.js` | Shop page |
| `public/admin.html`, `public/js/admin.js` | Admin page |
| `public/css/oka.css`, `public/img/` | Design (navy line art on bakery paper) and the logo |
| `public/privacy.html` | Privacy policy (個資法). Please have it checked before launch. |
