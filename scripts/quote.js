// scripts/quote.js
//
// Two ways to estimate a buy: a closed-form approximation, and an exact
// on-chain quote via staticCall against BowZap (no gas spent, no tx sent).
//
// Usage: TOKEN=0x... node scripts/quote.js

import { ethers } from "ethers";
import { getProvider, getWallet, ADDRESSES, ABI, POOL_FEE } from "./config.js";

const FEE_BPS = 10000n; // 1% pool fee, in basis points of 1e6 (10000 / 1e6)
const BPS_DENOM = 1_000_000n;

/**
 * Rough closed-form estimate for a single-sided constant-product pool:
 *   tokensOut ≈ supply * ethIn*(1-fee) / (targetFdvWeth + ethIn*(1-fee))
 * Useful for UI previews; always confirm with staticCall before sending.
 */
function estimateTokensOut({ supply, targetFdvWeth, ethIn }) {
  const ethInAfterFee = (ethIn * (BPS_DENOM - FEE_BPS)) / BPS_DENOM;
  return (supply * ethInAfterFee) / (targetFdvWeth + ethInAfterFee);
}

async function main() {
  const token = process.env.TOKEN;
  if (!token) throw new Error("Set TOKEN=<token address> in the environment");

  const provider = getProvider();
  const wallet = getWallet(provider);
  const zap = new ethers.Contract(ADDRESSES.zap, ABI.zap, wallet);

  const ethIn = ethers.parseEther("0.05");

  // Exact quote: staticCall never broadcasts, so this costs nothing.
  const exactOut = await zap.buy.staticCall(token, POOL_FEE, 0n, {
    value: ethIn,
  });
  console.log(`Exact quote for ${ethers.formatEther(ethIn)} ETH:`, ethers.formatEther(exactOut), "tokens");

  const slippageBps = 500n; // 5%
  const minOut = (exactOut * (10_000n - slippageBps)) / 10_000n;
  console.log("Suggested minOut (5% slippage):", ethers.formatEther(minOut));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

export { estimateTokensOut };
