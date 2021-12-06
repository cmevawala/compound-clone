//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./CToken.sol";
import "./Comptroller.sol";

import "hardhat/console.sol";

contract CDai is CToken {

    address erc20Contract;

    /// @notice Initialize the money market
    /// @param _erc20Contract The address of the ERC20 contract
    /// @param _initialExchangeRate The initial exchange rate, scaled by 1e18
    /// @param _comptroller The address of the Comptroller
    constructor(address _erc20Contract, uint256 _initialExchangeRate, Comptroller _comptroller) CToken(_initialExchangeRate, _comptroller, "CDAI Token", "CDAI") {
        admin = msg.sender;
        erc20Contract = _erc20Contract;
    }

    /// @notice User supplies assets into the market and receives cTokens in exchange
    /// @param _numOfTokens The amount of the underlying asset to supply
    /// @return Whether or not the transfer succeeded
    function mint(uint _numOfTokens) external returns (bool) {

        mintInternal(msg.sender, _numOfTokens);

        return true;
    }

    /// @notice Sender redeems cTokens in exchange for the underlying asset
    /// @param _redeemTokens The amount of the underlying asset to supply
    /// @return Whether or not the redeem succeeded or not
    function redeem(uint _redeemTokens) external returns(bool) {

        ERC20 erc20 = ERC20(erc20Contract);

        require(_redeemTokens > 0, "REDEEM_TOKENS_GREATER_THAN_ZERO.");
        require(erc20.balanceOf(msg.sender) > 0, "NO_TOKENS_AVAILABLE.");

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
    /// @param repayAmount The amount of the underlying asset to borrow
    /// @return Whether or not the repayment succeeded or not
    function borrowRepay(uint repayAmount) external returns(bool) {
        return borrowRepayInternal(msg.sender, repayAmount);
    }

    /// @notice Gets balance of this contract in terms of Ether, before this message
    /// @return The quantity of DAI owned by this contract
    function getCash() internal override view returns (uint) {
        ERC20 erc20 = ERC20(erc20Contract);
        return erc20.balanceOf(address(this)) - msg.value;
    }

    /// @notice Perform the actual transfer in
    /// @param from Address sending the DAI
    /// @param numberOfTokens Amount of DAI being sent
    /// @return Whether or not the transferIn succeeded or not
    function doTransferIn(address from, uint numberOfTokens) internal override returns (bool) {
        ERC20 erc20 = ERC20(erc20Contract);
        erc20.transferFrom(from, address(this), numberOfTokens);

        return true;
    }

    /// @notice Perform the actual transfer out
    /// @param to Address to which the DAI needs to be transferred
    /// @param amount The actual amount of DAI to be transferred
    /// @return Whether or not the transferOut succeeded or not
    function doTransferOut(address to, uint amount) internal override returns (bool) {
        ERC20 erc20 = ERC20(erc20Contract);

        erc20.approve(to, amount);
        erc20.transferFrom(address(this), to, amount);

        return true;
    }
}
