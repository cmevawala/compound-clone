//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./CToken.sol";
import "./Comptroller.sol";

import "hardhat/console.sol";

contract CEth is CToken {

    /// @notice Initialize the money market
    /// @param _initialExchangeRate The initial exchange rate, scaled by 1e18
    constructor(uint256 _initialExchangeRate, Comptroller _comptroller) CToken(_initialExchangeRate, _comptroller, "CETH Token", "CETH") {
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
    function redeem(uint _redeemTokens) external returns(bool) {

        require(balanceOf(msg.sender) > 0, "NO_TOKENS_AVAILABLE.");
        require(_redeemTokens > 0, "REDEEM_TOKENS_GREATER_THAN_ZERO.");

        redeemInternal(msg.sender, _redeemTokens);

        return true;
    }

    /// @notice Borrows assets from the protocol to their own address
    /// @param borrowAmount a parameter just like in doxygen (must be followed by parameter name)
    function borrow(uint borrowAmount) external returns(bool) {
        return borrowInternal(borrowAmount);
    }

    function borrowRepay() external payable returns(bool) {
        return borrowRepayInternal(msg.sender, msg.value);
    }

    /// @notice Gets balance of this contract in terms of Ether, before this message
    /// @return The quantity of Ether owned by this contract
    function getCash() internal override view returns (uint) {
        return address(this).balance - msg.value;
    }

    function doTransferIn(address from, uint amount) internal override returns (bool) {
        return true;
    }

    function doTransferOut(address to, uint amount) internal override returns (bool) {
        (bool success, ) = to.call{ value: amount}("");

        require(success, "REDEEM_FAILED");

        return success;
    }
}
