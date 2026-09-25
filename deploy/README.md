# Putting ERA online — step by step

One cloud server runs everything (database, API + Telegram bot, customer website, back office)
with Docker. You start on the server's IP address; adding a domain with HTTPS later is a small
change (see the end).

| Address | What |
|---|---|
| `http://<server-ip>` | Customer website |
| `http://<server-ip>:8080` | Back office |

Commands marked **Mac** run in your own Terminal in this project folder. Commands marked
**Server** run after `ssh root@<server-ip>`.

---

## 1. Create the server (about 10 minutes)

1. **Make an SSH key** (your Mac's login key for the server) — skip if you already have one:
   **Mac**
   ```bash
   ssh-keygen -t ed25519 -C "era-server"
   ```
   Press Enter at every question. Then show the public half and copy it:
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```
2. At **digitalocean.com** (or Vultr — same idea), create an account, then **Create → Droplet**:
   - **Region:** Singapore
   - **Image:** Ubuntu 24.04 LTS
   - **Size:** Basic → Regular → **4 GB RAM / 2 CPUs** (about $24/month). The 2 GB size (about
     $12/month) also works — do the "swap" line in step 2.
   - **Authentication:** SSH Key → **New SSH Key** → paste what you copied.
   - Optional but recommended: tick **Backups** (the provider keeps weekly copies of the whole server).
3. Create it and copy its **IP address** (e.g. `203.0.113.10`). Below, replace `<server-ip>` with it.

## 2. Prepare the server (5 minutes)

**Mac**
```bash
ssh root@<server-ip>
```
Type `yes` the first time. You're now on the server. **Server**:
```bash
curl -fsSL https://get.docker.com | sh
```
```bash
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw allow 8080 && ufw --force enable
```
Only on the 2 GB size — adds 2 GB of swap so the build doesn't run out of memory:
```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile && echo '/swapfile none swap sw 0 0' >> /etc/fstab
```
Type `exit` to come back to your Mac.

## 3. Fill in the settings (5 minutes)

**Mac**
```bash
cp deploy/.env.example deploy/.env && open -a TextEdit deploy/.env
```
- Replace every `203.0.113.10` with your server's IP.
- `POSTGRES_PASSWORD` and `CHAT_TOKEN_SECRET`: paste a value from this command (run it twice, one
  value each):
  ```bash
  openssl rand -hex 24
  ```
- `ANTHROPIC_API_KEY` and `TELEGRAM_BOT_TOKEN`: your keys. Good moment to use **new** ones (the old
  ones were pasted into chat).

Save. `deploy/.env` is never committed to git and `push.sh` never overwrites it on the server.

## 4. Send the code and start it (10–15 minutes, mostly waiting)

**Mac**
```bash
ssh root@<server-ip> 'mkdir -p /opt/era/deploy' && scp deploy/.env root@<server-ip>:/opt/era/deploy/.env
```
```bash
deploy/push.sh root@<server-ip>
```
The first build takes several minutes. It ends by listing three containers (`postgres`, `api`,
`web`) as running.

## 5. Move your data (5 minutes)

Copies your current database (listings, leads, users, settings) and all photos from your Mac.
Sign-in passwords stay the same.

**Mac**
```bash
deploy/export-local-data.sh
```
```bash
scp -r deploy/data root@<server-ip>:/opt/era/deploy/
```
```bash
ssh root@<server-ip> 'cd /opt/era && deploy/import-data.sh'
```
Then remove the copy from your Mac (it contains customer data):
```bash
rm -rf deploy/data
```

## 6. Hand the Telegram bot to the server

Only one machine can run a bot token. Now that the server runs it, **remove the
`TELEGRAM_BOT_TOKEN=` line from the `.env` at the top of this project on your Mac** (or replace it
with a separate test bot from @BotFather), then restart your local API. Otherwise the two fight over
messages and customers get random gaps.

## 7. Check it

- Open `http://<server-ip>` — the customer website with photos.
- Open `http://<server-ip>:8080` — sign in to the back office.
- Message the Telegram bot — it should answer, and the chat appears in the back office's Inbox.

## 8. Nightly backups (2 minutes)

**Server**
```bash
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/era/deploy/backup.sh >> /var/log/era-backup.log 2>&1") | crontab -
```
Every night at 02:00 (server time) the database and photos are saved to `/var/backups/era`
(14 days of database copies, 7 days of photos). Test it once now:
```bash
/opt/era/deploy/backup.sh
```
These copies sit on the same server — the provider's **Backups** option (step 1) protects against
losing the whole server.

**Restoring a backup:** copy the chosen files to `/opt/era/deploy/data/era.dump` and
`/opt/era/deploy/data/uploads.tgz`, then run `deploy/import-data.sh`.

---

## Updating the system later

After changes on your Mac:
```bash
deploy/push.sh root@<server-ip>
```
Only code is sent; the server's settings, database and photos stay. New database changes
(migrations) are applied automatically when the API restarts.

## Looking at what's happening

**Server**
```bash
cd /opt/era && docker compose -f deploy/docker-compose.yml logs -f api
```
(Ctrl+C to stop watching.) `docker compose -f deploy/docker-compose.yml ps` shows what's running.

## Adding a domain (HTTPS) later

1. In your domain's DNS settings add two **A records** pointing to the server's IP: `www` and
   `admin` (e.g. `www.example.com`, `admin.example.com`).
2. In `deploy/.env` on your Mac, switch to the domain block (commented in the file):
   `CLIENT_SITE`, `ADMIN_SITE`, `CLIENT_URL`, `PUBLIC_SITE_URL`, `CORS_ORIGINS` with `https://`
   addresses, `COOKIE_SECURE=true`, and `PUBLIC_API_URL=https://www.example.com` (the Telegram bot
   then uses a webhook instead of polling).
3. Copy it up and redeploy:
   ```bash
   scp deploy/.env root@<server-ip>:/opt/era/deploy/.env && deploy/push.sh root@<server-ip>
   ```
Caddy fetches and renews the HTTPS certificates by itself. Telegram's "View on website" buttons
start working once the site has a public address.
