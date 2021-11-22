//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./CToken.sol";

import "hardhat/console.sol";


contract CDai is CToken {

    address erc20Contract;

    /// @notice Initialize the money market
    /// @param _initialExchangeRate The initial exchange rate, scaled by 1e18
    constructor(address _erc20Contract, uint256 _initialExchangeRate) CToken(_initialExchangeRate, "CDAI Token", "CDAI") {
        admin = msg.sender;
        erc20Contract = _erc20Contract;
    }

    /// @notice User supplies assets into the market and receives cTokens in exchange
    /// @param _numOfTokens a parameter just like in doxygen (must be followed by parameter name)
    /// @return Whether or not the transfer succeeded
    function mint(uint _numOfTokens) external returns (bool) {

        mintInternal(msg.sender, _numOfTokens);

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

        ERC20 erc20 = ERC20(erc20Contract);

        require(_redeemTokens > 0, "REDEEM_TOKENS_GREATER_THAN_ZERO.");
        require(erc20.balanceOf(msg.sender) > 0, "NO_TOKENS_AVAILABLE.");

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
        ERC20 erc20 = ERC20(erc20Contract);
        return erc20.balanceOf(address(this)) - msg.value;
    }

    function doTransferIn(address from, uint numberOfTokens) internal override returns (uint) {
        ERC20 erc20 = ERC20(erc20Contract);
        erc20.transferFrom(from, address(this), numberOfTokens);
    }

    function doTransferOut(address to, uint amount) internal override returns (bool) {
        ERC20 erc20 = ERC20(erc20Contract);

        erc20.approve(to, amount);
        erc20.transferFrom(address(this), to, amount);

        return true;
    }
}