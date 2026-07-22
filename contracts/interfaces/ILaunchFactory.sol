// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ILaunchFactory
/// @notice Interface for the bow.fun LaunchFactory contract.
/// @dev Deployed at 0xC70E510E14710Ea535CAB7b2414860aF63FEab79 on Robinhood
///      Chain (chainId 4663). Reconstructed from the public bow.fun developer
///      docs (https://bow.fun/docs.html) for integration purposes. Field
///      order in `LaunchParams` matters — it is ABI-encoded as a tuple.
interface ILaunchFactory {
    /// @notice Parameters for launching a new token. Order is significant.
    struct LaunchParams {
        string name;              // ERC-20 name
        string symbol;            // ERC-20 symbol (case preserved on-chain)
        uint256 totalSupply;      // full supply, minted to the factory at launch
        uint256 launchDelay;      // opcode-blocks (~14s each) before public trading opens; 0 = instant
        uint256 maxWallet;        // anti-snipe per-wallet cap, active for `limitWindow` blocks
        uint256 limitWindow;      // opcode-blocks the `maxWallet` cap is enforced for
        uint256 targetFdvWeth;    // initial pool pricing, in WETH (wei)
        bytes32 salt;             // CREATE2 salt; mine so the token address ends in `b03`
        string description;       // free-text description
        string website;           // optional, "" if unused
        string telegram;          // optional, "" if unused
        string twitter;           // optional, "" if unused
        string logoURI;           // optional IPFS/HTTP URI, "" if unused
        string tokenURI;          // optional IPFS/HTTP metadata JSON URI, "" if unused
        uint256 devBuyMinTokens;  // slippage floor for the in-launch dev buy; 0 = any amount
    }

    /// @notice Emitted once per successful launch.
    event Launched(
        address indexed token,
        address indexed deployer,
        address pool,
        uint256 positionId,
        uint256 launchId
    );

    /// @notice Current flat fee (in wei) required to launch, independent of dev buy size.
    function launchFee() external view returns (uint256);

    /// @notice The Locker currently used by this factory. Always read this fresh —
    ///         it is per-factory and may change between factory deployments.
    function locker() external view returns (address);

    /// @notice Computes the CREATE2 init-code hash for a given param set and creator.
    /// @dev Used off-chain to brute-force a `salt` whose resulting address ends in `b03`.
    function tokenInitCodeHash(LaunchParams calldata p, address creator)
        external
        pure
        returns (bytes32);

    /// @notice Predicts the deterministic CREATE2 token address for a salt/init-code-hash pair.
    function predictToken(bytes32 salt, bytes32 initCodeHash)
        external
        view
        returns (address);

    /// @notice Deploys the token, creates and locks the pool, and optionally performs a dev buy.
    /// @dev msg.value must be >= launchFee(); any excess is used as the dev buy amount.
    ///      The dev buy is exempt from the anti-snipe `maxWallet` cap and always lands
    ///      before public trading opens.
    function launch(LaunchParams calldata p)
        external
        payable
        returns (address token, uint256 positionId);

    /// @notice Total number of tokens launched through this factory so far.
    function launchCount() external view returns (uint256);

    /// @notice A single past launch record, indexed from 0.
    function launches(uint256 index)
        external
        view
        returns (address token, address pool, uint256 positionId, address deployer);
}
