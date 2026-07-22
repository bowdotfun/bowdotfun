# bow.fun Toolkit

The official developer toolkit for [bow.fun](https://bow.fun) — a fair-launch token
platform on **Robinhood Chain**. Tokens launch straight into a Uniswap V3 pool with
liquidity **locked forever**, creators earn a share of trading fees, and tokens
**graduate** once the pool holds 3.7 ETH. Every launched token address is mined to
end in `b03`.     
  
This repo packages everything from the [official docs](https://bow.fun/docs.html)
into a ready-to-run project: Solidity interfaces for every deployed contract,
ethers v6 scripts for the full lifecycle (launch → buy → sell → collect fees →
read state), and reference documentation.

## What's inside

```
bowfun-toolkit/
├── contracts/
│   └── interfaces/        # Solidity interfaces for every deployed contract
│       ├── IBowLaunchFactory.sol
│       ├── IBowLocker.sol
│       ├── IBowZap.sol
│       ├── IBowToken.sol
│       ├── ISwapRouter02.sol
│       └── INonfungiblePositionManager.sol
├── scripts/                 # ethers v6 scripts, one per workflow
│   ├── bowConfig.js         # shared addresses / provider / wallet setup
│   ├── bowLaunch.js         # mine a `b03` salt and launch a token
│   ├── bowBuy.js            # buy via BowZap (single tx, native ETH in)
│   ├── bowSell.js           # sell via the router + unwrap (cap-safe)
│   ├── bowQuote.js          # estimate/staticCall a buy quote with slippage
│   ├── bowCollectFees.js    # trigger fee collection on the Locker
│   ├── bowPreviewFees.js    # read-only preview of pending fees
│   ├── bowReadState.js      # graduation status, launch list, event stream
│   └── bowSaltMiner.js      # CREATE2 salt miner used by bowLaunch.js
├── docs/
│   ├── BOW_OVERVIEW.md          # network, contracts, how it works
│   ├── BOW_DEVELOPER_GUIDE.md   # full walkthrough matching the scripts
│   └── BOW_GOTCHAS.md           # sharp edges called out in the source docs
├── test/
│   └── bowLaunch.saltmining.test.js  # unit test for the CREATE2 salt miner
├── package.json
├── .env.example
├── .gitignore
└── LICENSE
```

## Quick start

```bash
git clone <this-repo>
cd bowfun-toolkit
npm install
cp .env.example .env   # fill in PRIVATE_KEY
```

Then run any script directly, e.g.:

```bash
node scripts/bowLaunch.js
node scripts/bowBuy.js
node scripts/bowSell.js
node scripts/bowCollectFees.js
node scripts/bowReadState.js
```

Each script is self-contained and documented — read the comments before running
against real funds. See [`docs/BOW_DEVELOPER_GUIDE.md`](./docs/BOW_DEVELOPER_GUIDE.md)
for a full narrative walkthrough, and [`docs/BOW_GOTCHAS.md`](./docs/BOW_GOTCHAS.md)
for the sharp edges (opcode-block timing, checksum casing on `b03`, slippage
reverts, etc.).

## Network

| Field     | Value                                     |
| --------- | ------------------------------------------ |
| Chain     | Robinhood Chain                            |
| Chain ID  | `4663` (`0x1237`)                          |
| RPC       | `https://rpc.mainnet.chain.robinhood.com`  |
| Explorer  | `https://robinhoodchain.blockscout.com`    |
| Gas token | ETH                                        |

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

> The Locker is **per-factory**. Always fetch the live one with
> `factory.locker()` rather than hardcoding it — the address above is current
> as of the source docs but the factory is the source of truth.

## License

MIT for the code in this repo (see [LICENSE](./LICENSE)). This does **not**
grant any rights to bow.fun's own contracts, brand, or trademarks — it's just
a wrapper/toolkit around their public interfaces.
