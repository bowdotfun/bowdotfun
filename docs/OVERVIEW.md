# Overview

bow.fun is a fair-launch token platform on **Robinhood Chain**. It launches a
new ERC-20 straight into a Uniswap V3 pool, with liquidity locked forever, and
lets the creator earn a share of ongoing trading fees. Tokens **graduate** once
the pool accumulates 3.7 ETH. Every launched token address is mined so it ends
in `b03`.

## Design principles

- **Non-custodial** — every action is signed by the user's own wallet. Nothing
  is held in escrow by bow.fun.
- **Immutable tokens** — no owner, no mint function, no transfer tax, no
  blacklist. What's deployed at launch is what exists forever.
- **LP locked by contract** — the liquidity position NFT is transferred to the
  `Locker` contract on launch and there is no `decreaseLiquidity` /
  withdraw path. Nobody, including bow.fun, can pull liquidity.

## Network

| Field     | Value                                     |
| --------- | ------------------------------------------ |
| Chain     | Robinhood Chain                            |
| Chain ID  | `4663` (`0x1237`)                          |
| RPC       | `https://rpc.mainnet.chain.robinhood.com`  |
| Explorer  | `https://robinhoodchain.blockscout.com`    |
| Gas token | ETH                                        |

### Block-time gotcha

The `block.number` opcode advances roughly every **14 seconds**, even though
RPC blocks are produced roughly 10 times per second. The trading gate
(`launchDelay`) counts *opcode* blocks, so `launchDelay = 1` is approximately
**14 seconds**, not one RPC block. Use `launchDelay = 0` for instant public
trading.

## Deployed contracts

| Contract         | Address                                      | Role                                          |
| ---------------- | --------------------------------------------- | ---------------------------------------------- |
| LaunchFactory     | `0xC70E510E14710Ea535CAB7b2414860aF63FEab79` | Deploys tokens, creates + locks the pool       |
| Locker            | `0x904dCCB96d877E6db365282251Fa3dD156476660` | Owns every position NFT forever; splits fees   |
| BowZap            | `0xCCA95E5442BbF175d8a1Ad136Be317fA6D55CC38` | 1-tx buy / sell helper                         |
| WETH              | `0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73` | Quote asset                                    |
| SwapRouter02      | `0xCaf681a66D020601342297493863E78C959E5cb2` | Uniswap V3 router                              |
| PositionManager   | `0x73991a25C818Bf1f1128dEAaB1492D45638DE0D3` | V3 positions                                   |
| UniswapV3Factory  | `0x1f7d7550B1b028f7571E69A784071F0205FD2EfA` | V3 pools                                       |

The **Locker is per-factory** — always fetch the current one with
`factory.locker()`. New launches use the factory address above.

## How it works

**Launch (one transaction).** The factory deploys the token via `CREATE2` (the
full 1B supply is minted to the factory), creates and prices the V3 pool at
your target market cap, mints a **single-sided** position (token-only side),
transfers the position NFT to the **Locker** forever, writes on-chain
socials/IPFS metadata, and optionally performs a **dev buy** in the same
transaction.

**Anti-snipe.** A per-wallet **2% cap** is enforced for `limitWindow` blocks
after launch, then lifts automatically. The launch gate also blocks public
trading for `launchDelay` opcode-blocks — the deployer and the launchpad itself
are exempt from this gate, so the dev buy always lands first.

**Fees.** Trading fees accrue to the locked V3 position. Anyone can
permissionlessly trigger `Locker.collect(positionId)`; the proceeds are split
automatically between the configured receivers, with the **creator receiving a
35% WETH share** regardless of who calls collect.

**Graduation.** Once the pool's WETH side reaches `GRADUATION_WETH` (3.7 ETH),
`token.migrated()` flips to `true`. `checkMigration()` is a permissionless
latch anyone can call to trigger the check on-chain.
