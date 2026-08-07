# TONX — crypto exchange preview

This is a mobile-first TON exchange prototype.

## Included

- Live market prices from CoinGecko's public simple-price endpoint.
- TON / USDT / BTC quote calculator.
- Local TON mnemonic generation/import and address derivation using `@ton/crypto` and `@ton/ton`.
- TON Connect UI integration scaffold.
- Telegram linking entry point.
- Responsive iPhone-first UI.

## Production blockers before public launch

1. Telegram Login must be configured with a real bot and HTTPS domain. Telegram's official flow requires linking the domain to the bot through BotFather and verifying the returned authorization hash on a backend.
2. The swap button in this preview is a quote simulator. Production on-chain swapping should use STON.fi's official SDK/Omniston or DEX API and build a transaction for TON Connect rather than pretending a quote is a completed trade.
3. TON Center API keys, Telegram bot tokens, and any server credentials must stay server-side and never be committed to this repository.
4. A production exchange that holds customer funds needs a real custody/liquidity, withdrawal, compliance and operational design. This preview is intentionally non-custodial.

## Official integrations researched

- TON mnemonic / wallet derivation: TON Docs
- TON Connect: TON Docs
- STON.fi DEX / Omniston: STON.fi docs
- Telegram Login: Telegram Bot API docs
