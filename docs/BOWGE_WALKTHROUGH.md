# BOWGE Walkthrough — Launching a Token on bow.fun

> **Example / fictional deployment.** This walkthrough uses a made-up token,
> **BOWGE**, purely to demonstrate every function in this toolkit end to end.
> All contract
> addresses, chain config, and function signatures below are the real bow.fun
> deployment on Robinhood Chain; only the token itself is illustrative.

> **Dev wallet for this test:** `0xb56974129a582a36891820f80237c195c553dbf6`
> This is the deployer/dev-buy wallet used throughout this walkthrough — it's
> the `wallet.address` returned by `getWallet()` in [`scripts/bowConfig.js`](../scripts/bowConfig.js),
> the address that pays the launch fee, receives the dev buy, and later
> collects the creator's 35% fee share.

## The narrative

**BOWGE** is bow.fun's own take on Doge — the platform mascot in Shiba form,
launched natively on **Robinhood Chain** instead of riding on Ethereum L1 like
the original meme did. The pitch is simple: bow.fun already gives every token
immutable contracts and liquidity that's locked forever the moment it launches,
so BOWGE exists as the "canonical" demonstration of what a fair-launch meme
looks like when there's no owner, no mint function, and no way for anyone —
including the bow.fun team — to ever pull the liquidity back out. It's the
dog that proves the rails work.

We'll walk through the entire lifecycle using the scripts in this repo:

1. [Prerequisites](#1-prerequisites)
2. [Configure the launch parameters](#2-configure-the-launch-parameters)
3. [Mine a `b03` salt](#3-mine-a-b03-salt)
4. [Launch BOWGE (with a dev buy)](#4-launch-bowge-with-a-dev-buy)
5. [Understand the anti-snipe window](#5-understand-the-anti-snipe-window)
6. [Quote a buy](#6-quote-a-buy)
7. [Buy BOWGE via BowZap](#7-buy-bowge-via-bowzap)
8. [Sell BOWGE via the router](#8-sell-bowge-via-the-router)
9. [Collect trading fees](#9-collect-trading-fees)
10. [Check graduation status](#10-check-graduation-status)
11. [Full script reference](#11-full-script-reference)

---

## 1. Prerequisites

```bash
git clone <this-repo>
cd bowfun-toolkit
npm install
cp .env.example .env
```

Edit `.env` and set `PRIVATE_KEY` to a wallet holding ETH on **Robinhood Chain**
(chain ID `4663`, RPC `https://rpc.mainnet.chain.robinhood.com`). You'll need
enough ETH to cover the launch fee, gas, and whatever dev buy you want to make.

Every script in this walkthrough reads shared config from
[`scripts/bowConfig.js`](../scripts/bowConfig.js) — addresses, ABI fragments,
the provider, and your wallet.

---

## 2. Configure the launch parameters

bow.fun's `launch()` function takes a single tuple, `LaunchParams` (mirrored
in [`contracts/interfaces/IBowLaunchFactory.sol`](../contracts/interfaces/IBowLaunchFactory.sol)).
Field order matters — it's ABI-encoded positionally, not by name. Here's the
BOWGE configuration we'll use:

| Field             | Value                         | Why                                                          |
| ----------------- | ------------------------------ | -------------------------------------------------------------|
| `name`            | `"Bow Doge"`                   | Display name                                                  |
| `symbol`          | `"BOWGE"`                      | Case is preserved on-chain exactly as typed                   |
| `totalSupply`     | `1_000_000_000e18` (1B)        | Standard bow.fun supply                                       |
| `launchDelay`     | `0`                            | Instant public trading, no gate                               |
| `maxWallet`       | `2%` of supply                 | Anti-snipe cap while `limitWindow` is active                  |
| `limitWindow`     | `10` opcode-blocks (~140s)     | How long the 2% cap stays enforced                            |
| `targetFdvWeth`   | `1.5 ETH`                      | Starting market cap, priced in WETH                           |
| `salt`            | *(mined in step 3)*            | CREATE2 salt so the address ends in `b03`                     |
| `description`     | `"bow.fun's own Doge..."`      | Free text shown in the app                                    |
| `website`         | `"https://bowge.example"`      | Optional                                                       |
| `telegram`        | `"https://t.me/bowge"`         | Optional                                                       |
| `twitter`         | `"https://x.com/bowge"`        | Optional                                                       |
| `logoURI`         | `""`                           | Optional IPFS/HTTP URI — empty here for simplicity             |
| `tokenURI`        | `""`                           | Optional metadata JSON — empty here for simplicity             |
| `devBuyMinTokens` | `0`                            | No slippage floor on the dev buy for this example              |

This is exactly what's hardcoded (with generic placeholder values) in
[`scripts/bowLaunch.js`](../scripts/bowLaunch.js). For this walkthrough, open
that file and swap the placeholder `name`/`symbol`/socials for the BOWGE
values above:

```js
const p = [
  "Bow Doge",                                  // name
  "BOWGE",                                      // symbol
  supply,                                       // totalSupply
  0n,                                           // launchDelay — instant trading
  (supply * 200n) / 10000n,                     // maxWallet = 2%
  10n,                                          // limitWindow (opcode-blocks)
  ethers.parseEther("1.5"),                     // targetFdvWeth
  ethers.ZeroHash,                              // salt — placeholder, mined next
  "bow.fun's own Doge, launched natively on Robinhood Chain.",
  "https://bowge.example",                      // website
  "https://t.me/bowge",                         // telegram
  "https://x.com/bowge",                        // twitter
  "",                                            // logoURI
  "",                                            // tokenURI
  0n,                                           // devBuyMinTokens
];
```

---

## 3. Mine a `b03` salt

Every bow.fun token address is mined so the **checksummed** address ends in
`b03`. This is a CREATE2 property: given the factory address, the deployer's
address, and the `LaunchParams` init-code hash, you can brute-force a `salt`
until the resulting address matches.

[`scripts/bowSaltMiner.js`](../scripts/bowSaltMiner.js) does exactly this:

```js
import { mineSalt } from "./bowSaltMiner.js";

const initCodeHash = await factory.tokenInitCodeHash(p, wallet.address);
const { salt, address, iterations } = mineSalt(ADDRESSES.factory, initCodeHash);

p[7] = salt; // patch the salt into the params tuple
console.log(`Mined after ${iterations} tries -> BOWGE will deploy at ${address}`);
```

Sample output for a BOWGE run:

```
Mined after 412,908 tries -> BOWGE will deploy at 0x8f3a...e2b03
```

> **Gotcha:** the suffix check must run against the **checksummed** (EIP-55)
> address, not the raw lowercase hex — otherwise you might mine a false match
> like `...B03` that doesn't actually satisfy the checksum casing bow.fun
> requires. `mineSalt` handles this correctly via `ethers.getAddress()`.

---

## 4. Launch BOWGE (with a dev buy)

With the salt mined and patched into `p[7]`, call `launch()`. Sending ETH
beyond `launchFee()` performs a **dev buy** in the same transaction — the
team's/deployer's own buy, which is exempt from the anti-snipe cap and always
lands before any public buyer, since the deployer and the launchpad itself are
exempt from the `launchDelay` gate.

```bash
node scripts/bowLaunch.js
```

Internally, [`scripts/bowLaunch.js`](../scripts/bowLaunch.js) does:

```js
const launchFee = await factory.launchFee();   // currently 0 on bow.fun
const devBuyEth = ethers.parseEther("0.1");    // BOWGE dev buy: 0.1 ETH
const tx = await factory.launch(p, { value: launchFee + devBuyEth });
const receipt = await tx.wait();

const token = await factory.predictToken(salt, initCodeHash);
const launchedEvent = receipt.logs
  .map((l) => { try { return factory.interface.parseLog(l); } catch { return null; } })
  .find((e) => e && e.name === "Launched");

console.log("BOWGE token address:", token);
console.log("Position id:", launchedEvent.args.positionId.toString());
```

Sample output:

```
Launch tx sent: 0x91cf...4a02
Token address: 0x8f3a...e2b03
Position id: 4821
```

What happened in that one transaction:

1. The `BOWGE` ERC-20 was deployed via `CREATE2` at the mined address, with
   the full 1B supply minted to the factory.
2. A Uniswap V3 pool was created and priced so BOWGE opens at a **1.5 ETH**
   fully-diluted valuation.
3. A **single-sided** liquidity position (BOWGE-only side) was minted.
4. That position NFT was transferred to the **Locker**, forever — there is no
   `decreaseLiquidity` path available to anyone, including the deployer.
5. On-chain metadata (description, socials) was written.
6. The 0.1 ETH dev buy executed, landing before the public could trade.

---

## 5. Understand the anti-snipe window

For the next `limitWindow` opcode-blocks (10 blocks × ~14s ≈ **140 seconds**
for BOWGE), any single wallet trying to buy more than **2% of supply**
(`maxWallet`) in one transaction will revert with `MaxWalletExceeded`. This is
intentional — it's what stops a bot from scooping up the whole supply the
instant BOWGE goes live. The deployer's dev buy is exempt from this cap, which
is why it's structured to execute inside the launch transaction itself, before
the window even starts ticking for the public.

After the window lifts, BOWGE trades with no cap at all — same as any other
Uniswap V3 pool.

---

## 6. Quote a buy

Before sending a real buy transaction, get an exact on-chain quote via
`staticCall` (free — no gas spent, nothing broadcast):

```bash
TOKEN=0x8f3a...e2b03 node scripts/bowQuote.js
```

[`scripts/bowQuote.js`](../scripts/bowQuote.js):

```js
const ethIn = ethers.parseEther("0.05");
const exactOut = await zap.buy.staticCall(token, POOL_FEE, 0n, { value: ethIn });

const slippageBps = 500n; // 5%
const minOut = (exactOut * (10_000n - slippageBps)) / 10_000n;

console.log(`Exact quote for 0.05 ETH:`, ethers.formatEther(exactOut), "BOWGE");
console.log("Suggested minOut (5% slippage):", ethers.formatEther(minOut));
```

Sample output right after launch (pool still near its 1.5 ETH starting FDV):

```
Exact quote for 0.05 ETH: 31,004,820.44 BOWGE
Suggested minOut (5% slippage): 29,454,579.42 BOWGE
```

---

## 7. Buy BOWGE via BowZap

`BowZap.buy` wraps your ETH and swaps it for BOWGE in one transaction, sending
tokens straight to your wallet:

```bash
TOKEN=0x8f3a...e2b03 node scripts/bowBuy.js
```

[`scripts/bowBuy.js`](../scripts/bowBuy.js) reuses the same quote-then-slip
pattern from step 6 before sending the real transaction:

```js
const ethIn = ethers.parseEther("0.05");
const estimatedOut = await zap.buy.staticCall(token, POOL_FEE, 0n, { value: ethIn });
const minOut = (estimatedOut * 95n) / 100n;

const tx = await zap.buy(token, POOL_FEE, minOut, { value: ethIn });
await tx.wait();
```

During the anti-snipe window (step 5), a buy larger than 2% of supply here
would revert with `MaxWalletExceeded` — that's expected behavior, not a bug.

---

## 8. Sell BOWGE via the router

**Don't** sell BOWGE through BowZap during the anti-snipe window — the zap
briefly holds your tokens mid-swap, which itself counts against the 2% cap.
Instead, sell **directly through the Uniswap V3 router**, since the pool
address itself is cap-exempt:

```bash
TOKEN=0x8f3a...e2b03 AMOUNT=1000000 node scripts/bowSell.js
```

[`scripts/bowSell.js`](../scripts/bowSell.js) approves the router once, then
atomically swaps BOWGE → WETH and unwraps to native ETH via `multicall`:

```js
// 1. one-time approval
if ((await bowge.allowance(wallet.address, A.router)) < amountIn) {
  await (await bowge.approve(A.router, ethers.MaxUint256)).wait();
}

// 2. swap BOWGE -> WETH (kept in router), then unwrap -> native ETH, atomic
const swapCalldata = router.interface.encodeFunctionData("exactInputSingle", [{
  tokenIn: token, tokenOut: A.weth, fee: POOL_FEE,
  recipient: ADDRESS_THIS, amountIn, amountOutMinimum: minOut, sqrtPriceLimitX96: 0n,
}]);
const unwrapCalldata = router.interface.encodeFunctionData("unwrapWETH9", [minOut, wallet.address]);
await (await router.multicall([swapCalldata, unwrapCalldata])).wait();
```

Native ETH lands directly in your wallet — no separate unwrap step needed.

---

## 9. Collect trading fees

Fee collection is **permissionless** — anyone can trigger it, and proceeds
always route to the configured receivers, with the **creator (you, for
BOWGE) getting a 35% WETH share** regardless of who calls it or pays the gas.

**Preview pending fees first** (free, read-only):

```bash
TOKEN=0x8f3a...e2b03 POSITION_ID=4821 node scripts/bowPreviewFees.js
```

```
Pending WETH (total): 0.412 WETH
Creator's 35% share: 0.1442 WETH
```

**Then actually collect:**

```bash
POSITION_ID=4821 node scripts/bowCollectFees.js
```

[`scripts/bowCollectFees.js`](../scripts/bowCollectFees.js) always resolves
the live Locker from the factory first (it's per-factory, so never hardcode
it long-term):

```js
const lockerAddress = await factory.locker();
const locker = new ethers.Contract(lockerAddress, ABI.locker, wallet);
await (await locker.collect(positionId)).wait();
```

---

## 10. Check graduation status

BOWGE **graduates** once the pool's WETH side reaches `GRADUATION_WETH`
(3.7 ETH). Check anytime with:

```bash
TOKEN=0x8f3a...e2b03 node scripts/bowReadState.js
```

[`scripts/bowReadState.js`](../scripts/bowReadState.js):

```js
const bowge = new ethers.Contract(token, ABI.token, provider);
console.log("Graduated:", await bowge.migrated());
console.log("Threshold:", ethers.formatEther(await bowge.GRADUATION_WETH()), "WETH");
```

Early on, expect:

```
Token BOWGE (0x8f3a...e2b03)
  Graduated: false
  Graduation threshold: 3.7 WETH
```

`checkMigration()` is a permissionless latch — anyone can call it on-chain to
force the graduation check to run and flip `migrated()` once the threshold is
crossed.

---

## 11. Full script reference

| Step               | Command                                                              | Script                                                             |
| ------------------- | ---------------------------------------------------------------------| ---------------------------------------------------------------------|
| Mine salt + launch  | `node scripts/bowLaunch.js`                                          | [`bowLaunch.js`](../scripts/bowLaunch.js) + [`bowSaltMiner.js`](../scripts/bowSaltMiner.js) |
| Quote a buy         | `TOKEN=... node scripts/bowQuote.js`                                 | [`bowQuote.js`](../scripts/bowQuote.js)                               |
| Buy                 | `TOKEN=... node scripts/bowBuy.js`                                   | [`bowBuy.js`](../scripts/bowBuy.js)                                   |
| Sell                | `TOKEN=... AMOUNT=... node scripts/bowSell.js`                       | [`bowSell.js`](../scripts/bowSell.js)                                 |
| Preview fees        | `TOKEN=... POSITION_ID=... node scripts/bowPreviewFees.js`           | [`bowPreviewFees.js`](../scripts/bowPreviewFees.js)                   |
| Collect fees        | `POSITION_ID=... node scripts/bowCollectFees.js`                     | [`bowCollectFees.js`](../scripts/bowCollectFees.js)                   |
| Read state          | `TOKEN=... node scripts/bowReadState.js`                             | [`bowReadState.js`](../scripts/bowReadState.js)                       |

For the sharp edges referenced throughout this walkthrough (opcode-block
timing, `b03` checksum casing, slippage revert messages, the Zap-vs-router
sell distinction), see [`BOW_GOTCHAS.md`](./BOW_GOTCHAS.md). For the full
contract/network reference, see [`BOW_OVERVIEW.md`](./BOW_OVERVIEW.md).

> Reminder: everything above is illustrative. BOWGE isn't a real token — swap
> in your own parameters, verify addresses against
> [bow.fun/docs.html](https://bow.fun/docs.html), and test on a small dev buy
> before committing real funds.
