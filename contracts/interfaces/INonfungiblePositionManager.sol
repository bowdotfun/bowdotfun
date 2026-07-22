// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title INonfungiblePositionManager
/// @notice Minimal interface for the Uniswap V3 PositionManager used by bow.fun,
///         covering only what's needed to preview pending fees on a locked position.
/// @dev Deployed at 0x73991a25C818Bf1f1128dEAaB1492D45638DE0D3 on Robinhood
///      Chain (chainId 4663). Every bow.fun launch position NFT is owned by
///      the Locker contract forever.
interface INonfungiblePositionManager {
    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }

    /// @notice Standard ERC-721 owner lookup — for locked bow.fun positions this
    ///         always returns the Locker's address.
    function ownerOf(uint256 tokenId) external view returns (address owner);

    /// @notice Collects owed fees for a position. Call with `staticCall` (off-chain)
    ///         to preview pending amounts without spending gas or moving funds.
    function collect(CollectParams calldata params)
        external
        payable
        returns (uint256 amount0, uint256 amount1);
}
