// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IBowLocker
/// @notice Interface for the bow.fun Locker contract.
/// @dev Deployed at 0x904dCCB96d877E6db365282251Fa3dD156476660 on Robinhood
///      Chain (chainId 4663) as of the current LaunchFactory. The Locker is
///      per-factory — always resolve the live address via
///      `IBowLaunchFactory.locker()` rather than hardcoding it.
///
///      The Locker takes ownership of every Uniswap V3 position NFT minted at
///      launch, permanently. There is deliberately no `decreaseLiquidity` /
///      withdraw path exposed anywhere in this interface — liquidity locked
///      here cannot be pulled out by anyone, including bow.fun.
interface IBowLocker {
    /// @notice Permissionlessly collects accrued trading fees for a locked position
    ///         and routes them to the configured receivers (creator, protocol, etc).
    /// @dev Anyone may call this; the split (e.g. creator's 35% WETH share) is fixed
    ///      by the contract and does not depend on the caller.
    /// @param tokenId The Uniswap V3 position NFT id (the `positionId` from `Launched`).
    function collect(uint256 tokenId) external;

    /// @notice The address of the underlying Uniswap V3 NonfungiblePositionManager
    ///         whose NFTs this Locker holds.
    function positionManager() external view returns (address);

    /// @notice The creator's fee share, in basis points, applied to WETH proceeds.
    /// @dev As documented, this is currently 3500 (35%).
    function creatorShareBps() external view returns (uint256);
}
