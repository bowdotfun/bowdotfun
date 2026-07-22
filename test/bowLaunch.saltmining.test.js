// test/bowLaunch.saltmining.test.js
//
// Unit test for the CREATE2 salt miner used in scripts/launch.js.
// Run with: node --test test/launch.saltmining.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { ethers } from "ethers";
import { mineSalt } from "../scripts/bowSaltMiner.js";

test("mineSalt finds a salt whose checksummed CREATE2 address ends in the target suffix", () => {
  const factoryAddress = "0xC70E510E14710Ea535CAB7b2414860aF63FEab79";
  const initCodeHash = ethers.keccak256(ethers.toUtf8Bytes("fixture-init-code"));

  // Use a short, fast-to-find suffix for the test so it runs quickly and
  // deterministically, while still exercising the real search + checksum logic.
  const { salt, address, iterations } = mineSalt(factoryAddress, initCodeHash, "0", 200_000);

  assert.equal(salt.length, 66); // "0x" + 64 hex chars = bytes32
  assert.ok(address.endsWith("0"));
  assert.equal(address, ethers.getAddress(address)); // already checksummed
  assert.ok(iterations > 0);
});

test("mineSalt throws when no match is found within the iteration budget", () => {
  const factoryAddress = "0xC70E510E14710Ea535CAB7b2414860aF63FEab79";
  const initCodeHash = ethers.keccak256(ethers.toUtf8Bytes("fixture-init-code-2"));

  assert.throws(() => {
    // An extremely unlikely 6-char suffix with a tiny iteration budget
    // should exhaust the budget and throw.
    mineSalt(factoryAddress, initCodeHash, "aB03cD", 5);
  }, /No salt found/);
});
