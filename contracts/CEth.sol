//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "hardhat/console.sol";

import "./CTokenStorage.sol";
import "./InterestRateModel.sol";

contract CEth is ERC20, CTokenStorage {
    uint256 scaleBy = 10**decimals();

    InterestRateModel interestRateModel;

    event Mint(address minter, uint256 mintAmount, uint256 mintTokens);
    event Redeem(address redeemer, uint256 redeemAmount, uint256 redeemTokens);

    /// @notice Initialize the money market
    /// @param _initialExchangeRate The initial exchange rate, scaled by 1e18
    constructor(uint256 _initialExchangeRate) ERC20("CETH Token", " CETH") {
        admin = msg.sender;

        require(_initialExchangeRate > 0, "initial exchange rate must be greater than zero.");

        initialExchangeRate = _initialExchangeRate;

        interestRateModel = new InterestRateModel();

        accrualBlockNumber = block.number;
    }


    /// @notice User supplies assets into the market and receives cTokens in exchange
    /// @return Whether or not the transfer succeeded
    function mint() external payable returns (bool) {
        
        mintInternal(msg.sender, msg.value);

        return true;
    }

    /// @notice User supplies assets into the market and receives cTokens in exchange
    function mintInternal(address minter, uint256 _mintAmount) internal {
        /*
         * We get the current exchange rate and calculate the number of cTokens to be minted:
         * mintTokens = actualMintAmount / exchangeRate [WEI]
         */
         
        uint256 mintTokens = (_mintAmount / calculateExchangeRate()) * scaleBy;

        _mint(minter, mintTokens);

        emit Mint(minter, _mintAmount, mintTokens);
    }

    /// @notice Accrue interest then return the up-to-date exchange rate
    /// @return Calculated exchange rate
    function exchangeRateCurrent() public returns (uint) {
        require(accrueInterest() == true, "accrue interest failed");

        return calculateExchangeRate();
    }

    /// @notice Accrue interest then return the up-to-date exchange rate
    /// @return Calculated exchange rate
    function exchangeRateStored() view public returns (uint) {
        return calculateExchangeRate();
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

    /// @notice Explain to an end user what this does
    function redeemInternal(address redeemer, uint redeemTokens) internal {

        // calculate the exchange rate and the amount of underlying to be redeemed
        uint redeemAmount = ( redeemTokens * calculateExchangeRate() ) / scaleBy; // EXCHANGE in WEI

        // Fail gracefully if protocol has insufficient cash
        require(getCashPrior() >= redeemAmount, "INSUFFICIENT_CASH");

        // Burns amount
        _burn(redeemer, redeemTokens);

        (bool success,) = redeemer.call{ value: redeemAmount}("");
        require(success, "REDEEM_FAILED");

        emit Redeem(redeemer, redeemAmount, redeemTokens);
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
            uint256 totalCash = getCashPrior();
            uint256 cashPlusBorrowsMinusReserves;

            cashPlusBorrowsMinusReserves = totalCash + totalBorrows - totalReserves; // cash in WEI
            return cashPlusBorrowsMinusReserves / ( totalSupply() / scaleBy ); // totalSupply in WEI
        }
    }

    /// @notice Gets balance of this contract in terms of Ether, before this message
    /// @return The quantity of Ether owned by this contract
    function getCashPrior() internal view returns (uint256) {
        return address(this).balance - msg.value;
    }

    /// @notice Explain to an end user what this does
    /// @return Documents the return variables of a contract’s function state variable
    function accrueInterest() public returns (bool) {

        uint currentBlockNumber = block.number;
        uint accrualBlockNumberPrior = accrualBlockNumber;

        require(accrualBlockNumberPrior != currentBlockNumber, "INVALID_BLOCK_NUMBER");

        /* Read the previous values out of storage */
        uint cashPrior = getCashPrior();
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


    /**
     * @notice Returns the current per-block borrow interest rate for this cToken
     * @return The borrow interest rate per block, scaled by 1e18
     */
    function borrowRatePerBlock() external view returns (uint) {
        return interestRateModel.getBorrowRate(getCashPrior(), totalBorrows, totalReserves);
    }

    /**
     * @notice Returns the current per-block supply interest rate for this cToken
     * @return The supply interest rate per block, scaled by 1e18
     */
    function supplyRatePerBlock() external view returns (uint) {
        return interestRateModel.getSupplyRate(getCashPrior(), totalBorrows, totalReserves, reserveFactorMantissa);
    }

}
