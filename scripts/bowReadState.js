// scripts/bowReadState.js
//
// Read-only helpers: check graduation status for a token, list every launch
// on the factory, and (commented) subscribe to new Launched events over a
// WebSocket provider.
//
// Usage: TOKEN=0x... node scripts/bowReadState.js

import { ethers } from "ethers";
import { getProvider, ADDRESSES, ABI } from "./bowConfig.js";

async function main() {
  const provider = getProvider();
  const factory = new ethers.Contract(ADDRESSES.factory, ABI.factory, provider);

  const token = process.env.TOKEN;
  if (token) {
    const tokenContract = new ethers.Contract(token, ABI.token, provider);
    const [symbol, migrated, graduationWeth] = await Promise.all([
      tokenContract.symbol(),
      tokenContract.migrated(),
      tokenContract.GRADUATION_WETH(),
    ]);
    console.log(`Token ${symbol} (${token})`);
    console.log("  Graduated:", migrated);
    console.log("  Graduation threshold:", ethers.formatEther(graduationWeth), "WETH");
  }

  const launchCount = Number(await factory.launchCount());
  console.log(`\n${launchCount} launches on this factory. Most recent 10:`);
  const start = Math.max(0, launchCount - 10);
  for (let i = launchCount - 1; i >= start; i--) {
    const launch = await factory.launches(i);
    console.log(
      `  #${i} token=${launch.token} pool=${launch.pool} positionId=${launch.positionId} deployer=${launch.deployer}`
    );
  }

  // --- Streaming new launches (requires a WebSocket RPC endpoint) ---------
  //
  // const wsProvider = new ethers.WebSocketProvider(WSS_RPC_URL, CHAIN_ID);
  // const LAUNCHED_TOPIC = ethers.id(
  //   "Launched(address,address,address,uint256,uint256)"
  // );
  // wsProvider.on(
  //   { address: ADDRESSES.factory, topics: [LAUNCHED_TOPIC] },
  //   (log) => {
  //     const parsed = factory.interface.parseLog(log);
  //     console.log("New launch:", parsed.args);
  //   }
  // );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
