//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./CTokenInterface.sol";
import "./InterestRateModel.sol";

import "hardhat/console.sol";


abstract contract CToken is ERC20, CTokenInterface {

    InterestRateModel public interestRateModel;

    uint256 public scaleBy = 10**decimals();

    event Mint(address minter, uint256 mintAmount, uint256 mintTokens);
    event Redeem(address redeemer, uint256 redeemAmount, uint256 redeemTokens);

    /// @notice Initialize the money market
    /// @param _initialExchangeRate The initial exchange rate, scaled by 1e18
    constructor(uint256 _initialExchangeRate, string memory name, string memory symbol) ERC20(name, symbol) {
        require(_initialExchangeRate > 0, "initial exchange rate must be greater than zero.");

        initialExchangeRate = _initialExchangeRate;

        interestRateModel = new InterestRateModel();

        accrualBlockNumber = block.number;
    }

    /// @notice User supplies assets into the market and receives cTokens in exchange
    function mintInternal(address _minter, uint256 _mintAmount) internal {
        /*
         * We get the current exchange rate and calculate the number of cTokens to be minted:
         * mintTokens = actualMintAmount / exchangeRate [WEI]
         */

        doTransferIn(_minter, _mintAmount);

        uint256 mintTokens = (_mintAmount / calculateExchangeRate()) * scaleBy;

        _mint(_minter, mintTokens);

        emit Mint(_minter, _mintAmount, mintTokens);
    }

    /// @notice Accrue interest then return the up-to-date exchange rate
    /// @return Calculated exchange rate
    function exchangeRateCurrent() public returns (uint) {
        require(accrueInterest() == true, "accrue interest failed");

        return calculateExchangeRate();
    }

    /// @notice Explain to an end user what this does
    /// @return Documents the return variables of a contract’s function state variable
    function accrueInterest() public returns (bool) {

        uint currentBlockNumber = block.number;
        uint accrualBlockNumberPrior = accrualBlockNumber;

        require(accrualBlockNumberPrior != currentBlockNumber, "INVALID_BLOCK_NUMBER");

        /* Read the previous values out of storage */
        uint cashPrior = getCash();
        uint borrowsPrior = totalBorrows;
        uint reservesPrior = totalReserves;

        uint borrowRate = interestRateModel.getBorrowRate(cashPrior, borrowsPrior, reservesPrior);

        uint blockDelta = currentBlockNumber - accrualBlockNumber;

        uint simpleInterestFactor = borrowRate * blockDelta;
        uint interestAccumulated = simpleInterestFactor * borrowsPrior;
        uint borrowsNew = interestAccumulated + borrowsPrior;
        uint reservesNew = (interestAccumulated * reserveFactorMantissa) + reservesPrior;

        accrualBlockNumber = currentBlockNumber;
        totalBorrows = borrowsNew;
        totalReserves = reservesNew;

        return true;
    }

    /// @notice Accrue interest then return the up-to-date exchange rate
    /// @return Calculated exchange rate
    function exchangeRateStored() view public returns (uint) {
        return calculateExchangeRate();
    }

    /// @notice Calculates the exchange rate from the underlying to the CToken
    /// @return Calculated exchange rate scaled by 1e18
    function calculateExchangeRate() internal view returns (uint256) {
        // 0.020000 => 20000000000000000
        uint256 _totalSupply = totalSupply();
        if (_totalSupply == 0) {
            /*
             * If there are no tokens minted:
             *  exchangeRate = initialExchangeRate
             */
            return initialExchangeRate; // in WEI
        } else {
            /*
             * Otherwise:
             *  exchangeRate = (totalCash + totalBorrows - totalReserves) / totalSupply
             */
            uint256 totalCash = getCash();
            uint256 cashPlusBorrowsMinusReserves;

            cashPlusBorrowsMinusReserves = totalCash + totalBorrows - totalReserves; // cash in WEI
            return cashPlusBorrowsMinusReserves / ( totalSupply() / scaleBy ); // totalSupply in WEI
        }
    }

    /// @notice Explain to an end user what this does
    function redeemInternal(address redeemer, uint redeemTokens) internal {

        // calculate the exchange rate and the amount of underlying to be redeemed
        uint redeemAmount = ( redeemTokens * calculateExchangeRate() ) / scaleBy; // EXCHANGE in WEI

        // Fail gracefully if protocol has insufficient cash
        require(getCash() >= redeemAmount, "INSUFFICIENT_CASH");

        doTransferOut(redeemer, redeemAmount);

        // Burns amount
        _burn(redeemer, redeemTokens);

        emit Redeem(redeemer, redeemAmount, redeemTokens);
    }

    function getCash() internal virtual view returns (uint);

    function doTransferIn(address from, uint amount) internal virtual returns (uint);

    function doTransferOut(address to, uint amount) internal virtual returns (bool);
}