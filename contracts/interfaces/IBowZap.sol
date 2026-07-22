// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IBowZap
/// @notice Interface for the bow.fun BowZap helper contract.
/// @dev Deployed at 0xCCA95E5442BbF175d8a1Ad136Be317fA6D55CC38 on Robinhood
///      Chain (chainId 4663). Provides a single-transaction native-ETH buy
///      path (wrap + swap) for bow.fun tokens.
///
///      NOTE: Do not use this contract to sell during the anti-snipe window —
///      the zap briefly holds tokens mid-swap, which counts against the
///      per-wallet 2% cap. Sell directly through the Uniswap V3 router
///      instead (see ISwapRouter02.sol).
interface IBowZap {
    /// @notice Wraps `msg.value` ETH and swaps it for `token` in one transaction,
    ///         sending the output tokens directly to the caller.
    /// @param token The bow.fun token to buy.
    /// @param fee The Uniswap V3 pool fee tier (bow.fun pools use 10000 = 1%).
    /// @param minOut Minimum tokens to receive; revert with "Too little received" otherwise.
    /// @return amountOut The amount of `token` received.
    function buy(address token, uint24 fee, uint256 minOut)
        external
        payable
        returns (uint256 amountOut);
}
