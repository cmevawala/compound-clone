//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./CToken.sol";
import "./Comptroller.sol";

import "hardhat/console.sol";

contract CEth is CToken {

    /// @notice Initialize the money market
    /// @param _initialExchangeRate The initial exchange rate, scaled by 1e18
    /// @param _comptroller The address of the Comptroller
    constructor(uint256 _initialExchangeRate, Comptroller _comptroller) CToken(_initialExchangeRate, _comptroller, "CETH Token", "CETH") {
        admin = msg.sender;
    }

    /// @notice User supplies assets into the market and receives cTokens in exchange
    /// @return Whether or not the transfer succeeded or not
    function mint() external payable returns (bool) {

        mintInternal(msg.sender, msg.value);

        return true;
    }

    /// @notice Sender redeems cTokens in exchange for the underlying asset
    /// @param _redeemTokens The number of cTokens to redeem into underlying
    /// @return Whether or not the redeem succeeded or not
    function redeem(uint _redeemTokens) external returns(bool) {

        require(balanceOf(msg.sender) > 0, "NO_TOKENS_AVAILABLE.");
        require(_redeemTokens > 0, "REDEEM_TOKENS_GREATER_THAN_ZERO.");

        redeemInternal(msg.sender, _redeemTokens);

        return true;
    }

    /// @notice Borrows assets from the protocol to their own address
    /// @param borrowAmount The amount of the underlying asset to borrow
    /// @return Whether or not the borrow succeeded or not
    function borrow(uint borrowAmount) external returns(bool) {
        return borrowInternal(borrowAmount);
    }

    /// @notice Sender repays their own borrow
    /// @return Whether or not the repayment succeeded or not
    function borrowRepay() external payable returns(bool) {
        return borrowRepayInternal(msg.sender, msg.value);
    }

    /// @notice Gets balance of this contract in terms of Ether, before this message
    /// @return The quantity of Ether owned by this contract
    function getCash() internal override view returns (uint) {
        return address(this).balance - msg.value;
    }

    /// @notice Perform the actual transfer in, which is a no-op
    /// @param from Address sending the Ether
    /// @param amount Amount of Ether being sent
    /// @return Whether or not the transferIn succeeded or not
    function doTransferIn(address from, uint amount) internal override returns (bool) {
        return true;
    }

    /// @notice Perform the actual transfer out
    /// @param to Address to which the ether needs to be transferred
    /// @param amount The actual amount of Ether to be transferred
    /// @return Whether or not the transferOut succeeded or not
    function doTransferOut(address to, uint amount) internal override returns (bool) {
        (bool success, ) = to.call{ value: amount}("");

        require(success, "REDEEM_FAILED");

        return success;
    }
}
