# TONX Telegram bot

The bot is intentionally configured through an environment variable. Never commit the Telegram bot token to GitHub.

## Environment

`BOT_TOKEN` — token from @BotFather.

`WEBAPP_URL` — the public TONX HTTPS URL.

`OWNER_CHAT_ID` — optional administrator chat ID for private admin notifications.

## Run

```bash
npm install
BOT_TOKEN='...' WEBAPP_URL='https://YOUR-DOMAIN/' npm start
```

The bot uses Telegram's Bot API and provides a button that opens TONX. Authentication of a website user should be done with Telegram Login/OIDC on a backend; a static GitHub Pages site cannot safely verify Telegram credentials by itself.

For production, deploy this folder to a serverless/Node host and configure the secrets in that host's secret manager.
