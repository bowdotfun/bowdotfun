// scripts/buy.js
//
// Buys a bow.fun token with native ETH via BowZap, in a single transaction.
//
// Usage: TOKEN=0x... node scripts/buy.js

import { ethers } from "ethers";
import { getProvider, getWallet, ADDRESSES, ABI, POOL_FEE } from "./config.js";

async function main() {
  const token = process.env.TOKEN;
  if (!token) throw new Error("Set TOKEN=<token address> in the environment");

  const provider = getProvider();
  const wallet = getWallet(provider);
  const zap = new ethers.Contract(ADDRESSES.zap, ABI.zap, wallet);

  const ethIn = ethers.parseEther("0.05");

  // Get an exact quote first (see scripts/quote.js for more detail), then
  // apply slippage tolerance. Using minOut = 0n here only for illustration —
  // never do this with real funds.
  const estimatedOut = await zap.buy.staticCall(token, POOL_FEE, 0n, {
    value: ethIn,
  });
  const minOut = (estimatedOut * 95n) / 100n; // 5% slippage tolerance

  const tx = await zap.buy(token, POOL_FEE, minOut, { value: ethIn });
  console.log("Buy tx sent:", tx.hash);
  await tx.wait();
  console.log(`Bought ~${ethers.formatEther(estimatedOut)} tokens (minOut applied: ${ethers.formatEther(minOut)})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
