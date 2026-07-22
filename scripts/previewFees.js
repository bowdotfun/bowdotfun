// scripts/previewFees.js
//
// Read-only preview of pending fees on a locked position, without spending
// any gas or moving funds — uses staticCall against the PositionManager.
//
// Usage: TOKEN=0x... POSITION_ID=123 node scripts/previewFees.js

import { ethers } from "ethers";
import { getProvider, ADDRESSES, ABI } from "./config.js";

const CREATOR_SHARE_BPS = 3500n; // 35%, per docs/OVERVIEW.md
const MAX_UINT128 = (1n << 128n) - 1n;

async function main() {
  const token = process.env.TOKEN;
  const positionId = process.env.POSITION_ID;
  if (!token || !positionId) {
    throw new Error("Set TOKEN=<address> and POSITION_ID=<uint256> in the environment");
  }

  const provider = getProvider();
  const npm = new ethers.Contract(ADDRESSES.positionManager, ABI.npm, provider);

  // For bow.fun launches this is always the Locker's address.
  const owner = await npm.ownerOf(positionId);

  const [amount0, amount1] = await npm.collect.staticCall(
    {
      tokenId: positionId,
      recipient: owner,
      amount0Max: MAX_UINT128,
      amount1Max: MAX_UINT128,
    },
    { from: owner }
  );

  const wethIsToken0 = ADDRESSES.weth.toLowerCase() < token.toLowerCase();
  const wethTotal = wethIsToken0 ? amount0 : amount1;
  const creatorWeth = (wethTotal * CREATOR_SHARE_BPS) / 10_000n;

  console.log("Pending WETH (total):", ethers.formatEther(wethTotal));
  console.log("Creator's 35% share:", ethers.formatEther(creatorWeth));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
