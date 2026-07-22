// scripts/launch.js
//
// Launches a new token on bow.fun: mines a CREATE2 salt so the token address
// ends in "b03", then calls LaunchFactory.launch() with an optional dev buy.
//
// Usage: node scripts/launch.js

import { ethers } from "ethers";
import { getProvider, getWallet, ADDRESSES, ABI } from "./config.js";
import { mineSalt } from "./saltMiner.js";

async function main() {
  const provider = getProvider();
  const wallet = getWallet(provider);
  const factory = new ethers.Contract(ADDRESSES.factory, ABI.factory, wallet);

  // ---- 1. Describe the token -------------------------------------------
  const supply = 1_000_000_000n * 10n ** 18n; // 1B tokens, 18 decimals

  const params = [
    "My Token", // name
    "mytoken", // symbol (case preserved on-chain)
    supply, // totalSupply
    0n, // launchDelay (opcode-blocks; 0 = instant public trading)
    (supply * 200n) / 10000n, // maxWallet = 2% anti-snipe cap
    10n, // limitWindow (opcode-blocks the 2% cap stays active)
    ethers.parseEther("1.5"), // targetFdvWeth = starting market cap in WETH
    ethers.ZeroHash, // salt — placeholder, replaced after mining below
    "before pepe, there was...", // description
    "https://mytoken.xyz", // website (optional, "" if unused)
    "https://t.me/mytoken", // telegram (optional, "" if unused)
    "https://x.com/mytoken", // twitter (optional, "" if unused)
    "", // logoURI (optional IPFS/HTTP URI, "" for none)
    "", // tokenURI (optional IPFS/HTTP metadata JSON, "" for none)
    0n, // devBuyMinTokens (slippage floor for the dev buy; 0 = any)
  ];

  // ---- 2. Mine a salt so the address ends in "b03" ----------------------
  const initCodeHash = await factory.tokenInitCodeHash(params, wallet.address);
  const { salt, address: predicted, iterations } = mineSalt(
    ADDRESSES.factory,
    initCodeHash
  );
  params[7] = salt;
  console.log(`Mined salt after ${iterations} iterations -> ${predicted}`);

  // ---- 3. Launch, optionally with a dev buy in the same tx --------------
  const launchFee = await factory.launchFee();
  const devBuyEth = ethers.parseEther("0.1"); // set to 0n for no dev buy
  const tx = await factory.launch(params, { value: launchFee + devBuyEth });
  console.log("Launch tx sent:", tx.hash);
  const receipt = await tx.wait();

  // ---- 4. Recover the token address and positionId -----------------------
  const token = await factory.predictToken(salt, initCodeHash);
  const launchedEvent = receipt.logs
    .map((log) => {
      try {
        return factory.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((parsed) => parsed && parsed.name === "Launched");

  console.log("Token address:", token);
  console.log("Position id:", launchedEvent.args.positionId.toString());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
