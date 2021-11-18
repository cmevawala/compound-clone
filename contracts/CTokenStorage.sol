//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

contract CTokenStorage {

    /// @notice Administrator for this contract
    address public admin;

    /// @notice Initial exchange rate used when minting the first CTokens (used when totalSupply = 0)
    uint internal initialExchangeRate;

    /// @notice Total amount of outstanding borrows of the underlying in this market
    uint public totalBorrows;

    /// @notice Total amount of reserves of the underlying held in this market
    uint public totalReserves;

    /// @notice Fraction of interest currently set aside for reserves
    uint constant public reserveFactorMantissa = 20 ether;

    /// @notice Block number that interest was last accrued at
    uint public accrualBlockNumber;

}
