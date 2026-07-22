// scripts/bowSell.js
//
// Sells a bow.fun token back to native ETH, directly through the Uniswap V3
// router (never through BowZap — see docs/GOTCHAS.md for why). Approves the
// router once if needed, then swaps token -> WETH and unwraps to native ETH
// atomically via multicall.
//
// Usage: TOKEN=0x... AMOUNT=1000000 node scripts/bowSell.js

import { ethers } from "ethers";
import { getProvider, getWallet, ADDRESSES, ABI, POOL_FEE } from "./bowConfig.js";

// Sentinel recipient meaning "keep the output tokens in the router" —
// required so the subsequent unwrapWETH9 call in the same multicall can
// find them.
const ADDRESS_THIS = "0x0000000000000000000000000000000000000002";

async function main() {
  const token = process.env.TOKEN;
  if (!token) throw new Error("Set TOKEN=<token address> in the environment");
  const amountToSell = process.env.AMOUNT || "1000000"; // human units

  const provider = getProvider();
  const wallet = getWallet(provider);
  const tokenContract = new ethers.Contract(token, ABI.erc20, wallet);
  const router = new ethers.Contract(ADDRESSES.router, ABI.router, wallet);

  const amountIn = ethers.parseEther(amountToSell); // assumes 18 decimals

  // 1. One-time approval of the router, if not already granted.
  const currentAllowance = await tokenContract.allowance(
    wallet.address,
    ADDRESSES.router
  );
  if (currentAllowance < amountIn) {
    const approveTx = await tokenContract.approve(
      ADDRESSES.router,
      ethers.MaxUint256
    );
    console.log("Approve tx sent:", approveTx.hash);
    await approveTx.wait();
  }

  // 2. Swap token -> WETH (kept in the router), then unwrap to native ETH —
  //    atomic via multicall, so it can't be interrupted mid-flight.
  const minOut = 0n; // NOTE: set a real slippage floor in production, see quote.js

  const swapCalldata = router.interface.encodeFunctionData("exactInputSingle", [
    {
      tokenIn: token,
      tokenOut: ADDRESSES.weth,
      fee: POOL_FEE,
      recipient: ADDRESS_THIS,
      amountIn,
      amountOutMinimum: minOut,
      sqrtPriceLimitX96: 0n,
    },
  ]);
  const unwrapCalldata = router.interface.encodeFunctionData("unwrapWETH9", [
    minOut,
    wallet.address,
  ]);

  const tx = await router.multicall([swapCalldata, unwrapCalldata]);
  console.log("Sell tx sent:", tx.hash);
  await tx.wait();
  console.log("Sold. Native ETH sent to", wallet.address);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
