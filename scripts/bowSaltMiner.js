// scripts/bowSaltMiner.js
//
// Brute-forces a CREATE2 `salt` such that the resulting bow.fun token address,
// once checksummed (EIP-55), ends in "b03". Factored out of launch.js so it
// can also be unit tested (see test/launch.saltmining.test.js).

import { ethers } from "ethers";

/**
 * @param {string} factoryAddress - the LaunchFactory address.
 * @param {string} initCodeHash - result of factory.tokenInitCodeHash(p, creator).
 * @param {string} suffix - required (case-sensitive, checksummed) suffix, default "b03".
 * @param {number} maxIterations - safety cap to avoid an infinite loop.
 * @returns {{ salt: string, address: string, iterations: number }}
 */
export function mineSalt(factoryAddress, initCodeHash, suffix = "b03", maxIterations = 5_000_000) {
  for (let i = 0; i < maxIterations; i++) {
    const salt = ethers.zeroPadValue(ethers.toBeHex(i), 32);
    const raw =
      "0x" +
      ethers.keccak256(
        ethers.concat(["0xff", factoryAddress, salt, initCodeHash])
      ).slice(-40);
    const checksummed = ethers.getAddress(raw);
    if (checksummed.endsWith(suffix)) {
      return { salt, address: checksummed, iterations: i + 1 };
    }
  }
  throw new Error(
    `No salt found ending in "${suffix}" within ${maxIterations} iterations`
  );
}
