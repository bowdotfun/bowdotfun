// scripts/bowConfig.js
//
// Shared provider / wallet / contract-address setup used by every other
// script in this repo. Requires PRIVATE_KEY in your environment (see
// .env.example). Uses ethers v6.

import "dotenv/config";
import { ethers } from "ethers";

export const RPC_URL = "https://rpc.mainnet.chain.robinhood.com";
export const CHAIN_ID = 4663;
export const EXPLORER = "https://robinhoodchain.blockscout.com";

// Uniswap V3 fee tier used by every bow.fun pool: 1% (10000 / 1e6).
export const POOL_FEE = 10000;

// Deployed contract addresses (see docs/BOW_OVERVIEW.md).
// NOTE: `locker` is per-factory. It's included here for convenience, but
// scripts that need it should prefer `await factory.locker()` at runtime.
export const ADDRESSES = {
  factory: "0xC70E510E14710Ea535CAB7b2414860aF63FEab79",
  locker: "0x904dCCB96d877E6db365282251Fa3dD156476660",
  zap: "0xCCA95E5442BbF175d8a1Ad136Be317fA6D55CC38",
  weth: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73",
  router: "0xCaf681a66D020601342297493863E78C959E5cb2",
  positionManager: "0x73991a25C818Bf1f1128dEAaB1492D45638DE0D3",
  uniswapV3Factory: "0x1f7d7550B1b028f7571E69A784071F0205FD2EfA",
};

export function getProvider() {
  return new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID);
}

export function getWallet(provider = getProvider()) {
  if (!process.env.PRIVATE_KEY) {
    throw new Error(
      "Missing PRIVATE_KEY. Copy .env.example to .env and fill it in."
    );
  }
  return new ethers.Wallet(process.env.PRIVATE_KEY, provider);
}

// Minimal ABI fragments, mirroring contracts/interfaces/*.sol.
export const ABI = {
  factory: [
    "function launchFee() view returns (uint256)",
    "function locker() view returns (address)",
    "function tokenInitCodeHash((string name,string symbol,uint256 totalSupply,uint256 launchDelay,uint256 maxWallet,uint256 limitWindow,uint256 targetFdvWeth,bytes32 salt,string description,string website,string telegram,string twitter,string logoURI,string tokenURI,uint256 devBuyMinTokens) p, address creator) pure returns (bytes32)",
    "function predictToken(bytes32 salt, bytes32 initCodeHash) view returns (address)",
    "function launch((string name,string symbol,uint256 totalSupply,uint256 launchDelay,uint256 maxWallet,uint256 limitWindow,uint256 targetFdvWeth,bytes32 salt,string description,string website,string telegram,string twitter,string logoURI,string tokenURI,uint256 devBuyMinTokens) p) payable returns (address token, uint256 positionId)",
    "function launchCount() view returns (uint256)",
    "function launches(uint256) view returns (address token, address pool, uint256 positionId, address deployer)",
    "event Launched(address indexed token, address indexed deployer, address pool, uint256 positionId, uint256 launchId)",
  ],
  zap: [
    "function buy(address token, uint24 fee, uint256 minOut) payable returns (uint256)",
  ],
  erc20: [
    "function approve(address,uint256) returns (bool)",
    "function allowance(address,address) view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
  ],
  router: [
    "function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96) params) payable returns (uint256)",
    "function unwrapWETH9(uint256 amountMinimum, address recipient) payable",
    "function multicall(bytes[] data) payable returns (bytes[])",
  ],
  locker: ["function collect(uint256 tokenId)"],
  npm: [
    "function ownerOf(uint256) view returns (address)",
    "function collect((uint256 tokenId,address recipient,uint128 amount0Max,uint128 amount1Max) params) payable returns (uint256 amount0, uint256 amount1)",
  ],
  token: [
    "function symbol() view returns (string)",
    "function pool() view returns (address)",
    "function migrated() view returns (bool)",
    "function checkMigration() returns (bool)",
    "function logoURI() view returns (string)",
    "function GRADUATION_WETH() view returns (uint256)",
  ],
};
