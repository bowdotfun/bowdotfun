# Developer Guide

This walks through the same lifecycle as the `scripts/` folder: setup, launch,
buy, sell, quoting, fee collection, and reading state. All examples use
**ethers v6**.

## Setup

```js
import { ethers } from "ethers";

const RPC = "https://rpc.mainnet.chain.robinhood.com";
const provider = new ethers.JsonRpcProvider(RPC, 4663);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const A = {
  factory: "0xC70E510E14710Ea535CAB7b2414860aF63FEab79",
  locker:  "0x904dCCB96d877E6db365282251Fa3dD156476660",
  zap:     "0xCCA95E5442BbF175d8a1Ad136Be317fA6D55CC38",
  weth:    "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73",
  router:  "0xCaf681a66D020601342297493863E78C959E5cb2",
};
const POOL_FEE = 10000; // 1% tier — used everywhere on bow.fun
```

This is factored out into [`scripts/config.js`](../scripts/config.js) so every
other script can just `import` it.

## Launch a token

`LaunchParams` is a **tuple** — field order matters, and it's mirrored exactly
in [`contracts/interfaces/ILaunchFactory.sol`](../contracts/interfaces/ILaunchFactory.sol).
Before launching you mine a `salt` so the CREATE2 token address ends in
checksummed `b03`. See [`scripts/launch.js`](../scripts/launch.js) for the
full runnable version; the shape is:

1. Build the params array (name, symbol, supply, `launchDelay`, `maxWallet`,
   `limitWindow`, `targetFdvWeth`, `salt`, description, socials, `logoURI`,
   `tokenURI`, `devBuyMinTokens`).
2. Call `factory.tokenInitCodeHash(p, deployerAddress)` to get the init code
   hash, then brute-force salts until the resulting CREATE2 address, when
   checksummed, ends in `b03`.
3. Call `factory.launch(p, { value: fee + devBuyEth })`. Sending ETH beyond
   `launchFee()` performs a **dev buy** in the same transaction — it's exempt
   from the 2% anti-snipe cap and always lands before any public buyer.
4. The token address is deterministic (`factory.predictToken(salt, initHash)`);
   the `positionId` comes out of the `Launched` event.

IPFS metadata (`logoURI`, `tokenURI`) is optional — pass empty strings if you
don't want to pin anything.

## Buy — `BowZap.buy`

Native ETH straight into the token, one transaction. The zap wraps ETH,
swaps through the pool, and sends tokens straight to the caller. See
[`scripts/buy.js`](../scripts/buy.js).

During the opening 2% window, a buy larger than 2% of supply reverts with
`MaxWalletExceeded` — that's the anti-snipe mechanism working as intended, not
a bug.

## Sell — via the router, not the Zap

**Don't** route sells through the Zap during the opening anti-snipe window —
the zap would hold your tokens mid-swap and would itself trip the 2% cap.
Instead sell **directly through the Uniswap V3 router** so tokens flow
`you → pool` (the pool address is cap-exempt), then unwrap WETH back to native
ETH in the same transaction via `multicall`. See
[`scripts/sell.js`](../scripts/sell.js).

If you'd rather receive WETH instead of native ETH, call `exactInputSingle`
with `recipient: yourAddress` directly and skip the unwrap call.

## Quoting & slippage

The single-sided pool behaves like a constant-product curve early on. For a
rough estimate:

```
tokensOut ≈ supply * ethIn*(1-fee) / (targetFdvWeth + ethIn*(1-fee))
```

For an exact number, `staticCall` the same function you're about to send —
see [`scripts/quote.js`](../scripts/quote.js) — then apply your slippage
tolerance to get `minOut`.

## Collect fees

Fee collection is **permissionless** — anyone can call it, and proceeds always
route to the configured receivers (the creator gets a 35% WETH share)
regardless of who pays the gas. See
[`scripts/collectFees.js`](../scripts/collectFees.js) to trigger collection,
and [`scripts/previewFees.js`](../scripts/previewFees.js) to preview the
pending amount without spending anything (via `staticCall`).

## Read state

[`scripts/readState.js`](../scripts/readState.js) covers:

- Checking `token.migrated()` to see if a token has graduated (crossed
  `GRADUATION_WETH`, 3.7 ETH).
- Paging through `factory.launchCount()` / `factory.launches(i)` to list every
  token launched on a given factory.
- Subscribing to the `Launched(address,address,address,uint256,uint256)` topic
  over a WebSocket provider to stream new launches in real time.
