// scripts/bowCollectFees.js
//
// Triggers permissionless fee collection on the Locker for a given position.
// Anyone can call this — proceeds route automatically to the configured
// receivers (creator gets a 35% WETH share) regardless of who pays gas.
//
// Usage: POSITION_ID=123 node scripts/bowCollectFees.js

import { ethers } from "ethers";
import { getProvider, getWallet, ADDRESSES, ABI } from "./bowConfig.js";

async function main() {
  const positionId = process.env.POSITION_ID;
  if (!positionId) throw new Error("Set POSITION_ID=<uint256> in the environment");

  const provider = getProvider();
  const wallet = getWallet(provider);

  // Always resolve the live Locker from the factory — it's per-factory and
  // may not match ADDRESSES.locker for older/newer factory deployments.
  const factory = new ethers.Contract(ADDRESSES.factory, ABI.factory, provider);
  const lockerAddress = await factory.locker();
  const locker = new ethers.Contract(lockerAddress, ABI.locker, wallet);

  const tx = await locker.collect(positionId);
  console.log("Collect tx sent:", tx.hash);
  await tx.wait();
  console.log("Fees collected and routed to configured receivers.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
