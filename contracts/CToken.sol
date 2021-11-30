//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./CTokenInterface.sol";
import "./InterestRateModel.sol";
import "./Comptroller.sol";

import "hardhat/console.sol";

abstract contract CToken is ERC20, CTokenInterface {

    InterestRateModel public interestRateModel;
    Comptroller public comptroller;

    uint256 public scaleBy = 10**decimals();

    event Mint(address minter, uint256 mintAmount, uint256 mintTokens);
    event Redeem(address redeemer, uint256 redeemAmount, uint256 redeemTokens);

    /// @notice Initialize the money market
    /// @param _initialExchangeRate The initial exchange rate, scaled by 1e18
    constructor(uint256 _initialExchangeRate, Comptroller _comproller,  string memory name, string memory symbol) ERC20(name, symbol) {
        require(_initialExchangeRate > 0, "initial exchange rate must be greater than zero.");

        initialExchangeRate = _initialExchangeRate;

        interestRateModel = new InterestRateModel();
        comptroller = _comproller;

        accrualBlockNumber = block.number;
        borrowIndex = 1 ** scaleBy;
    }

    /// @notice Explain to an end user what this does
    /// @return Documents the return variables of a contract’s function state variable
    function balanceOfUnderlying(address owner) external returns(uint) {
        
        require(balanceOf(owner) > 0, "NOT_HAVING_ENOUGH_CTOKENS");

         return (exchangeRateCurrent() * balanceOf(owner)) / scaleBy;
    }

    /// @notice User supplies assets into the market and receives cTokens in exchange
    function mintInternal(address _minter, uint256 _mintAmount) internal {
        /*
         * We get the current exchange rate and calculate the number of cTokens to be minted:
         * mintTokens = actualMintAmount / exchangeRate [WEI]
         */
        require(accrueInterest() == true, "ACCRUE_INTEREST_FAILED");

        doTransferIn(_minter, _mintAmount);

        uint256 mintTokens = (_mintAmount / calculateExchangeRate()) * scaleBy;

        _mint(_minter, mintTokens);

        emit Mint(_minter, _mintAmount, mintTokens);
    }

    /// @notice Accrue interest then return the up-to-date exchange rate
    /// @return Calculated exchange rate
    function exchangeRateCurrent() public returns (uint) {
        require(accrueInterest() == true, "ACCRUE_INTEREST_FAILED");

        return calculateExchangeRate();
    }

    /// @notice Explain to an end user what this does
    /// @return Documents the return variables of a contract’s function state variable
    function accrueInterest() public returns (bool) {

        uint currentBlockNumber = block.number;
        uint accrualBlockNumberPrior = accrualBlockNumber;

        // console.log("Prior Block Number: ");
        // console.log(accrualBlockNumberPrior);

        // console.log("Current Block Number: ");
        // console.log(currentBlockNumber);

        if (accrualBlockNumberPrior == currentBlockNumber) {
            return true;
        }

        /* Read the previous values out of storage */
        uint cashPrior = getCash();
        uint borrowsPrior = totalBorrows;
        uint reservesPrior = totalReserves;
        uint borrowIndexPrior = borrowIndex;

        uint borrowRate = interestRateModel.getBorrowRatePerBlock(cashPrior, borrowsPrior, reservesPrior);

        // console.log("---------Borrows Rate Per Block---------");
        // console.log(borrowRate);
        // console.log("----------------------------------------");

        uint blockDelta = currentBlockNumber - accrualBlockNumber;

        // console.log("--------------Block Delta--------------");
        // console.log(blockDelta);
        // console.log("----------------------------------------");


        uint simpleInterestFactor = borrowRate * blockDelta;
        uint interestAccumulated = ( simpleInterestFactor * borrowsPrior ) / 10**18;

        
        // console.log("--------Interest Rate Accumalated-------");
        // console.log(interestAccumulated);
        // console.log("----------------------------------------");

        uint borrowsNew = borrowsPrior + interestAccumulated;
        // uint reservesNew = (interestAccumulated * reserveFactorMantissa) + reservesPrior;
        uint borrowIndexNew = simpleInterestFactor + borrowIndexPrior;

        accrualBlockNumber = currentBlockNumber;
        // console.log("---------------Borrows New--------------");
        // console.log(borrowsNew);
        // console.log("----------------------------------------");
        totalBorrows = borrowsNew;
        // totalReserves = reservesNew;
        borrowIndex = borrowIndexNew;

        return true;
    }

    /// @notice Accrue interest then return the up-to-date exchange rate
    /// @return Calculated exchange rate
    function exchangeRateStored() view public returns (uint) {
        return calculateExchangeRate();
    }

    /// @notice Calculates the exchange rate from the underlying to the CToken
    /// @return Calculated exchange rate scaled by 1e18
    function calculateExchangeRate() view internal  returns (uint256) {
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
        require(accrueInterest() == true, "ACCRUE_INTEREST_FAILED");

        uint exchangeRateMantisa = exchangeRateStored();


        // calculate the exchange rate and the amount of underlying to be redeemed
        uint redeemAmount = ( redeemTokens * exchangeRateMantisa ) / scaleBy; // EXCHANGE in WEI


        // Fail gracefully if protocol has insufficient cash
        require(getCash() >= redeemAmount, "INSUFFICIENT_CASH");

        doTransferOut(redeemer, redeemAmount);

        // Burns amount
        _burn(redeemer, redeemTokens);

        emit Redeem(redeemer, redeemAmount, redeemTokens);
    }

    /// @notice Returns the current borrow interest rate APY for this cToken
    /// @return The borrow interest APY, scaled by 1e18
    function getBorrowRate() view public returns (uint) {
        // TODO: Can Total Borrows increase than Supply ?
        return interestRateModel.getBorrowRate(getCash(), totalBorrows, totalReserves);
    }

    // @notice Returns the current per-block borrow interest rate for this cToken
    /// @return The borrow interest rate per block, scaled by 1e18
    function getBorrowRatePerBlock() view external returns (uint) {
        return interestRateModel.getBorrowRatePerBlock(getCash(), totalBorrows, totalReserves);
    }

    /// @notice Returns the current supply interest rate APY for this cToken
    /// @return The supply interest rate APY, scaled by 1e18
    function getSupplyRate() view external returns (uint) {
        return interestRateModel.getSupplyRate(getCash(), totalBorrows, totalReserves, reserveFactorMantissa) ;
    }

    /// @notice Returns the current per-block supply interest rate for this cToken
    /// @return The supply interest rate per block, scaled by 1e18
    function getSupplyRatePerBlock() view external returns (uint) {
        return interestRateModel.getSupplyRatePerBlock(getCash(), totalBorrows, totalReserves, reserveFactorMantissa) ;
    }

    /// @notice Allows users to borrow from Market
    /// @param borrowAmount a parameter just like in doxygen (must be followed by parameter name)
    /// @return Documents the return variables of a contract’s function state variable
    function borrowInternal(uint borrowAmount) internal returns (bool) {
        require(accrueInterest(), "ACCRUING_INTEREST_FAILED");

        bool isListed = comptroller.isMarketListed(address(this));

        require(isListed, "TOKEN_NOT_LISTED_IN_MARKET");
    
        // Get Underlying Price is Zero

        // Insufficient Balance in the Market
        require(getCash() >= borrowAmount, "INSUFFICIENT_BALANCE_FOR_BORROW");

        // How much max the borrower can borrow - check liquidity
        uint accountLiquidity = comptroller.getAccountLiquidity(msg.sender);
        uint borrowBalanceStoredInternal = borrowBalanceStored(msg.sender);
        accountLiquidity = accountLiquidity - borrowBalanceStoredInternal;
        require(accountLiquidity > 0, "INSUFFICIENT_LIQUIDITY");


        // Get Borrower Balance && Account Borrow += borrow
        uint borrowBalanceNew = borrowBalanceStoredInternal + borrowAmount;

        // Transfer to borrower;
        doTransferOut(msg.sender, borrowAmount);

        accountBorrows[msg.sender].principal = borrowBalanceNew;
        accountBorrows[msg.sender].interestIndex = borrowIndex;
        
        totalBorrows += borrowAmount;

        // emit
        return true;
    }

    function borrowBalanceCurrent(address borrower) external returns (uint) {
        require(accrueInterest(), "ACCRUING_INTEREST_FAILED");

        return borrowBalanceInternal(borrower);
    }

    function borrowBalanceStored(address borrower) view public returns (uint) {
        return borrowBalanceInternal(borrower);
    }

    function borrowBalanceInternal(address borrower) view internal returns (uint) {

        BorrowSnapshot memory borrowSnapshot = accountBorrows[borrower];

        if (borrowSnapshot.principal == 0) return 0;

        return ( borrowSnapshot.principal * borrowIndex ) / borrowSnapshot.interestIndex;
    } 

    function getCash() virtual view internal returns (uint);

    function doTransferIn(address from, uint amount) internal virtual returns (uint);

    function doTransferOut(address to, uint amount) internal virtual returns (bool);
}