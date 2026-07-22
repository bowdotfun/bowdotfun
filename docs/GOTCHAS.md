# Gotchas

Sharp edges worth knowing before you ship anything against bow.fun.

- **Symbols keep their case.** `doge` and `DOGE` are both valid and will
  survive on-chain exactly as typed — there's no forced uppercasing.
- **`b03` is checksummed lowercase.** Mine salts against
  `ethers.getAddress(rawAddress).endsWith("b03")`, not the raw hex bits, or
  you can end up mining a valid-looking-but-wrong match like `…B03`.
- **The trading gate counts opcode blocks (~14s each), not RPC blocks.**
  RPC blocks land roughly 10/sec on Robinhood Chain, but `launchDelay` is
  measured in `block.number` opcode increments, which only advance about
  every 14 seconds. Set `launchDelay = 0` for instant public trading.
- **Slippage reverts surface as `Too little received`.** If you see this,
  raise `minOut` (or re-quote right before sending).
- **Tokens are fully immutable.** No owner, no mint, no tax, no pause, no
  blacklist. `setPool` / `setMetadata` are one-time, launchpad-only calls that
  happen inside the launch transaction itself — there's no post-launch
  admin surface at all.
- **The Locker is per-factory.** Don't hardcode a Locker address in
  long-lived code — always read it fresh via `factory.locker()`.
- **Don't sell through BowZap during the anti-snipe window.** The zap briefly
  holds your tokens mid-swap, which itself counts against the 2% per-wallet
  cap. Sell directly through the router instead, since the pool address is
  cap-exempt.
