// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IBowToken
/// @notice Interface for an ERC-20 token deployed by the bow.fun LaunchFactory.
/// @dev These tokens are fully immutable post-launch: no owner, no mint, no
///      transfer tax, no blacklist. `setPool` / `setMetadata` are one-time,
///      launchpad-only calls that execute inside the launch transaction —
///      there is no admin surface after that.
interface IBowToken {
    /// @notice Standard ERC-20 symbol. Case is preserved exactly as launched.
    function symbol() external view returns (string memory);

    /// @notice The Uniswap V3 pool this token trades in.
    function pool() external view returns (address);

    /// @notice Whether this token has graduated (pool WETH side reached GRADUATION_WETH).
    function migrated() external view returns (bool);

    /// @notice Permissionless latch — anyone can call this to check and record migration.
    /// @return True if the token is (now, or already was) migrated.
    function checkMigration() external returns (bool);

    /// @notice The token's logo URI, as set at launch (IPFS or HTTP). May be empty.
    function logoURI() external view returns (string memory);

    /// @notice The WETH threshold (in wei) at which this token graduates. Currently 3.7 ETH.
    function GRADUATION_WETH() external view returns (uint256);
}
