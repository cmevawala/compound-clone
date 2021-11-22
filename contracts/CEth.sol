//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./CToken.sol";

import "hardhat/console.sol";


contract CEth is CToken {

    /// @notice Initialize the money market
    /// @param _initialExchangeRate The initial exchange rate, scaled by 1e18
    constructor(uint256 _initialExchangeRate) CToken(_initialExchangeRate, "CETH Token", "CETH") {
        admin = msg.sender;
    }

    /// @notice User supplies assets into the market and receives cTokens in exchange
    /// @return Whether or not the transfer succeeded
    function mint() external payable returns (bool) {

        mintInternal(msg.sender, msg.value);

        return true;
    }

    /// @notice Explain to an end user what this does
    /// @return Documents the return variables of a contract’s function state variable
    function balanceOfUnderlying(address owner) external returns(uint) {
        
        require(balanceOf(owner) > 0, "NOT_HAVING_ENOUGH_CTOKENS");

        return exchangeRateCurrent() * balanceOf(owner);
    }

    /// @notice Explain to an end user what this does
    /// @return Documents the return variables of a contract’s function state variable
    function redeem(uint _redeemTokens) external returns(bool) {

        require(balanceOf(msg.sender) > 0, "NO_TOKENS_AVAILABLE.");
        require(_redeemTokens > 0, "REDEEM_TOKENS_GREATER_THAN_ZERO.");

        redeemInternal(msg.sender, _redeemTokens);

        return true;
    }

    /// @notice Returns the current per-block borrow interest rate for this cToken
    /// @return The borrow interest rate per block, scaled by 1e18
    function borrowRatePerBlock() external view returns (uint) {
        return interestRateModel.getBorrowRate(getCash(), totalBorrows, totalReserves);
    }

     /// @notice Returns the current per-block supply interest rate for this cToken
     /// @return The supply interest rate per block, scaled by 1e18
    function supplyRatePerBlock() external view returns (uint) {
        return interestRateModel.getSupplyRate(getCash(), totalBorrows, totalReserves, reserveFactorMantissa);
    }

    /// @notice Gets balance of this contract in terms of Ether, before this message
    /// @return The quantity of Ether owned by this contract
    function getCash() internal override view returns (uint) {
        return address(this).balance - msg.value;
    }

    function doTransferIn(address from, uint amount) internal override returns (uint) {
        return 0;
    }

    function doTransferOut(address to, uint amount) internal override returns (bool) {
        (bool success, ) = to.call{ value: amount}("");

        require(success, "REDEEM_FAILED");

        return success;
    }

    // collateral / collateral factor
    // calculate account liquidity - how much you can borrow
    // open price feed - USD price of token to borrow
    // enter market and borrow
    // borrowed balance
    // borrow rate
    // repay borrow
}
