// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ISwapRouter02
/// @notice Minimal interface for the Uniswap V3 SwapRouter02 used by bow.fun.
/// @dev Deployed at 0xCaf681a66D020601342297493863E78C959E5cb2 on Robinhood
///      Chain (chainId 4663). Only the functions used in the bow.fun sell
///      flow are declared here; this is not the full router interface.
///
///      Sell flow: swap token -> WETH with `recipient` set to the sentinel
///      address 0x0000...02 ("keep output in the router"), then call
///      `unwrapWETH9` in the same `multicall` to send native ETH to the user.
///      This avoids the router (and the pool) ever tripping the anti-snipe
///      per-wallet cap, since the pool address itself is cap-exempt.
interface ISwapRouter02 {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    /// @notice Swaps `amountIn` of `tokenIn` for at least `amountOutMinimum` of `tokenOut`.
    function exactInputSingle(ExactInputSingleParams calldata params)
        external
        payable
        returns (uint256 amountOut);

    /// @notice Unwraps the router's held WETH balance to native ETH and sends it to `recipient`.
    /// @param amountMinimum Minimum WETH amount required, else reverts.
    function unwrapWETH9(uint256 amountMinimum, address recipient) external payable;

    /// @notice Batches multiple calls (e.g. exactInputSingle + unwrapWETH9) into one transaction.
    function multicall(bytes[] calldata data) external payable returns (bytes[] memory results);
}
