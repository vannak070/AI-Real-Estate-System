# Putting ERA online — step by step

One cloud server runs everything (database, API + Telegram bot, customer website, back office)
with Docker and automatic HTTPS.

**The demo for management review:**

| Address | What |
|---|---|
| https://demo.yarvorax.com | Customer website |
| https://admin.demo.yarvorax.com | Back office (normal sign-in) |

Both are hidden from Google (`ROBOTS_TAG`). Commands marked **Mac** run in your Terminal in this
project folder; **Server** commands run after `ssh root@<demo-ip>`.

> ⚠ **Do not use the `Yarvora-X` droplet (159.223.84.89).** It runs the live yarvorax.com website
> (nginx on ports 80/443) and has only 512 MB of memory. Installing this system there would take
> your website offline. Create a separate droplet below — your website is not affected.

---

## 1. Create a new droplet (about 10 minutes)

1. **SSH key** (your Mac's login key) — skip if you used one for Yarvora-X and still have it:
   **Mac**
   ```bash
   ls ~/.ssh/id_ed25519.pub || ssh-keygen -t ed25519 -C "era-demo"
   ```
   (press Enter at every question), then copy the public key:
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```
2. DigitalOcean → **Create → Droplets**:
   - **Region:** Singapore (SGP1)
   - **Image:** Ubuntu 24.04 (LTS) x64
   - **Size:** Basic → Regular. For the demo, **1 GB / 25 GB ($6/month)** is enough to *run* it
     (it uses about 350 MB) — but too small to *build* it, so your Mac builds it instead
     (`--build-on-mac` in step 5). With 2 GB or more the server can build it itself.
     You can resize up later (Resize → "CPU and RAM only") without reinstalling.
   - **Authentication:** SSH Key → choose yours (or **New SSH Key** and paste).
   - **Hostname:** `era-demo`
   - Optional, recommended: **Backups**.
3. Copy the new droplet's IP address — below it's `<demo-ip>`.

## 2. Point the demo addresses at it — GoDaddy (5 minutes, then up to ~1 hour to spread)

GoDaddy → **My Products** → yarvorax.com → **DNS** → **Add New Record**, twice:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `demo` | `<demo-ip>` | 600 seconds (or 1 hour) |
| A | `admin.demo` | `<demo-ip>` | 600 seconds (or 1 hour) |

Don't change any existing records — `@` and `www` keep pointing at your website. Check they've
spread (both lines should print the new IP):
**Mac**
```bash
dig +short demo.yarvorax.com; dig +short admin.demo.yarvorax.com
```
Keep going with steps 3–5 meanwhile; the HTTPS certificates are fetched automatically once the
addresses resolve.

## 3. Prepare the server (5 minutes)

**Mac**
```bash
ssh root@<demo-ip>
```
Type `yes` the first time. You're now on the server. **Server**:
```bash
curl -fsSL https://get.docker.com | sh
```
```bash
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable
```
On 1 GB and 2 GB sizes — adds 2 GB of swap (spare memory on disk) as a safety margin:
```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile && echo '/swapfile none swap sw 0 0' >> /etc/fstab
```
Type `exit` to come back to your Mac.

## 4. Settings (2 minutes)

`deploy/.env` is already prepared for the demo — addresses, HTTPS, Google-hiding and two new
random secrets are filled in. Only paste your two keys:
**Mac**
```bash
open -a TextEdit deploy/.env
```
- `ANTHROPIC_API_KEY=` — your Anthropic key (ideally a **new** one; the old one was pasted in chat).
- `TELEGRAM_BOT_TOKEN=` — the bot token (ideally after `/revoke` in @BotFather, same reason).

Save. This file is never committed and `push.sh` never overwrites it on the server.

## 5. Send the code and start it (10–15 minutes, mostly waiting)

**Mac**
```bash
ssh root@<demo-ip> 'mkdir -p /opt/era/deploy' && scp deploy/.env root@<demo-ip>:/opt/era/deploy/.env
```
On the **1 GB** droplet — Docker Desktop must be running on your Mac, which builds everything
and sends the finished images (about 5 minutes the first time, depending on your upload speed):
```bash
deploy/push.sh root@<demo-ip> --build-on-mac
```
On 2 GB or larger you can leave off `--build-on-mac` and the server builds it itself.
It ends by listing `postgres`, `api` and `web` as running.

## 6. Move your data (5 minutes)

Copies your current listings, leads, users, settings and all photos from your Mac. Sign-in
passwords stay the same.
**Mac**
```bash
deploy/export-local-data.sh
```
```bash
scp -r deploy/data root@<demo-ip>:/opt/era/deploy/
```
```bash
ssh root@<demo-ip> 'cd /opt/era && deploy/import-data.sh'
```
```bash
rm -rf deploy/data
```
(the last line removes the copy from your Mac — it contains customer data).

## 7. Give the Telegram bot to the demo server

Only one machine can run a bot token. **Remove the `TELEGRAM_BOT_TOKEN=` line from the `.env` at
the top of this project on your Mac** (or put a separate test bot's token there), then restart
your local API. If you forget, your laptop now refuses to take the bot over and says so in the
back office's Channels tab — but it's cleaner to remove it.

## 8. Check it

- https://demo.yarvorax.com — customer website with photos (padlock = HTTPS works).
- https://admin.demo.yarvorax.com — sign in, open **Inbox** and **Marketing → Channels** (the
  Telegram card should say "AI bot on").
- Message the bot on Telegram — it answers, and "View on website" buttons appear under photos.

If a page doesn't load yet, the DNS records from step 2 may still be spreading — check with the
`dig` command and try again in a few minutes.

## 9. Nightly backups (2 minutes)

**Server**
```bash
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/era/deploy/backup.sh >> /var/log/era-backup.log 2>&1") | crontab -
```
```bash
/opt/era/deploy/backup.sh
```
Every night at 02:00 the database and photos are saved to `/var/backups/era` (14 days of
database copies, 7 days of photos). The droplet's **Backups** option (step 1) protects against
losing the whole server. **Restore:** copy the chosen files to `/opt/era/deploy/data/era.dump` and
`/opt/era/deploy/data/uploads.tgz`, then run `deploy/import-data.sh`.

---

## Updating the demo later

```bash
deploy/push.sh root@<demo-ip> --build-on-mac
```
(without `--build-on-mac` on a 2 GB+ server).
Only code is sent; the server's settings, database and photos stay. Database changes (migrations)
apply automatically when the API restarts.

## Looking at what's happening

**Server**
```bash
cd /opt/era && docker compose -f deploy/docker-compose.yml logs -f api
```
(Ctrl+C stops watching.) `docker compose -f deploy/docker-compose.yml ps` shows what's running.

## Later: production

The same kit works for production — a new droplet (or this one), new DNS names (e.g.
`www.yarvorax.com`/`admin.yarvorax.com` or the client's own domain) in `deploy/.env`, and
`ROBOTS_TAG=all` so search engines can list it.

## Without a domain (IP address only)

Use `deploy/.env.example` instead: `CLIENT_SITE=:80`, `ADMIN_SITE=:8080`, `http://<ip>` addresses,
`COOKIE_SECURE=false`, no `PUBLIC_API_URL`, and also `ufw allow 8080`.
