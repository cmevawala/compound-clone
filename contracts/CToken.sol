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
    event AccrueInterest(uint cashPrior, uint interestAccumulated, uint borrowIndex, uint totalBorrows);
    event Borrow(address borrower, uint borrowAmount, uint accountBorrows, uint totalBorrows);
    event RepayBorrow(address borrower, uint repayAmount, uint accountBorrows, uint totalBorrows);

    /// @notice Initialize the money market
    /// @param _initialExchangeRate The initial exchange rate, scaled by 1e18
    /// @param _comptroller The address of the Comptroller
    /// @param _name EIP-20 name of this token
    /// @param _symbol EIP-20 symbol of this token
    constructor(uint256 _initialExchangeRate, Comptroller _comptroller, string memory _name, string memory _symbol) ERC20(_name, _symbol) {
        require(_initialExchangeRate > 0, "initial exchange rate must be greater than zero.");

        initialExchangeRate = _initialExchangeRate;

        interestRateModel = new InterestRateModel();
        comptroller = _comptroller;

        accrualBlockNumber = block.number;
        borrowIndex = 1 * scaleBy;

        totalReserves = 0;
    }

    /// @notice Get balance of underlying asset for the owner
    /// @param owner The address of the account to query
    /// @return Balance of underlying asset
    function balanceOfUnderlying(address owner) external returns(uint) {
        
        require(balanceOf(owner) > 0, "NOT_HAVING_ENOUGH_CTOKENS");

         return (exchangeRateCurrent() * balanceOf(owner)) / scaleBy;
    }

    /// @notice User supplies assets into the market and receives cTokens in exchange
    /// @param _minter The address of the account which is supplying the assets
    /// @param _mintAmount The amount of asset that is supplied
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

    /// @notice Accrues interest on the borrowed amount
    /// @return Wether or not the operation succeeded or not 
    function accrueInterest() public returns (bool) {

        uint currentBlockNumber = block.number;
        uint accrualBlockNumberPrior = accrualBlockNumber;

        if (accrualBlockNumberPrior == currentBlockNumber) {
            return true;
        }

        /* Read the previous values out of storage */
        uint cashPrior = getCash();
        uint borrowsPrior = totalBorrows;
        uint reservesPrior = totalReserves;
        uint borrowIndexPrior = borrowIndex;

        uint borrowRate = interestRateModel.getBorrowRatePerBlock(cashPrior, borrowsPrior, reservesPrior);

        uint blockDelta = currentBlockNumber - accrualBlockNumber;

        uint simpleInterestFactor = borrowRate * blockDelta;
        uint interestAccumulated = ( simpleInterestFactor * borrowsPrior ) / 10**18;
        uint totalBorrowsNew = borrowsPrior + interestAccumulated;
        // uint reservesNew = (interestAccumulated * RESERVE_FACTOR_MANTISA) + reservesPrior;
        uint borrowIndexNew = simpleInterestFactor + borrowIndexPrior;

        accrualBlockNumber = currentBlockNumber;
        totalBorrows = totalBorrowsNew;
        // totalReserves = reservesNew;
        borrowIndex = borrowIndexNew;

        emit AccrueInterest(cashPrior, interestAccumulated, borrowIndexNew, totalBorrowsNew);

        return true;
    }

    /// @notice Calculate the up-to-date exchange rate and return
    /// @return Calculated exchange rate
    function exchangeRateStored() public view returns (uint) {
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

    /// @notice Sender redeems cTokens in exchange for the underlying asset
    /// @param redeemer The address of the account which is redeeming the CTokens
    /// @param redeemTokens The no. of CTokens to be redeemed
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
    function getBorrowRate() public view returns (uint) {
        // TODO: Can Total Borrows increase than Supply ?
        return interestRateModel.getBorrowRate(getCash(), totalBorrows, totalReserves);
    }

    // @notice Returns the current per-block borrow interest rate for this cToken
    /// @return The borrow interest rate per block, scaled by 1e18
    function getBorrowRatePerBlock() external view returns (uint) {
        return interestRateModel.getBorrowRatePerBlock(getCash(), totalBorrows, totalReserves);
    }

    /// @notice Returns the current supply interest rate APY for this cToken
    /// @return The supply interest rate APY, scaled by 1e18
    function getSupplyRate() external view returns (uint) {
        return interestRateModel.getSupplyRate(getCash(), totalBorrows, totalReserves, RESERVE_FACTOR_MANTISA) ;
    }

    /// @notice Returns the current per-block supply interest rate for this cToken
    /// @return The supply interest rate per block, scaled by 1e18
    function getSupplyRatePerBlock() external view returns (uint) {
        return interestRateModel.getSupplyRatePerBlock(getCash(), totalBorrows, totalReserves, RESERVE_FACTOR_MANTISA) ;
    }

    /// @notice Allows users to borrow from Market
    /// @param borrowAmount The amount of the underlying asset to borrow
    /// @return Whether or not the borrowed operation succeeded or not
    function borrowInternal(uint borrowAmount) internal returns (bool) {
        require(borrowAmount > 0, "REDEEM_TOKENS_GREATER_THAN_ZERO.");

        require(accrueInterest(), "ACCRUING_INTEREST_FAILED");

        bool isListed = comptroller.isMarketListed(address(this));

        require(isListed, "TOKEN_NOT_LISTED_IN_MARKET");
    
        // Get Underlying Price is Zero

        // Insufficient Balance in the Market
        require(getCash() >= borrowAmount, "INSUFFICIENT_BALANCE_FOR_BORROW");

        // How much max the borrower can borrow - check liquidity
        uint accountLiquidity = comptroller.getAccountLiquidity(msg.sender);
        uint borrowBalanceStoredInternal = borrowBalanceStored(msg.sender);

        require(accountLiquidity >= borrowBalanceStoredInternal, "INSUFFICIENT_LIQUIDITY");
        
        // Reduce Liquidity
        accountLiquidity = accountLiquidity - borrowBalanceStoredInternal;

        // Get Borrower Balance && Account Borrow += borrow
        uint borrowBalanceNew = borrowBalanceStoredInternal + borrowAmount;

        // Transfer to borrower;
        doTransferOut(msg.sender, borrowAmount);

        accountBorrows[msg.sender].principal = borrowBalanceNew;
        accountBorrows[msg.sender].interestIndex = borrowIndex;
        
        totalBorrows += borrowAmount;

        emit Borrow(msg.sender, borrowAmount, borrowBalanceNew, totalBorrows);

        // emit
        return true;
    }

    /// @notice Explain to an end user what this does
    /// @param borrower a parameter just like in doxygen (must be followed by parameter name)
    /// @return Documents the return variables of a contract’s function state variable
    function borrowBalanceCurrent(address borrower) external returns (uint) {
        require(accrueInterest(), "ACCRUING_INTEREST_FAILED");

        return borrowBalanceInternal(borrower);
    }

    /// @notice Explain to an end user what this does
    /// @param borrower a parameter just like in doxygen (must be followed by parameter name)
    /// @return Documents the return variables of a contract’s function state variable
    function borrowBalanceStored(address borrower) public view returns (uint) {
        return borrowBalanceInternal(borrower);
    }

    /// @notice Calculate borrowed balance of the borrower with interest rate
    /// @param borrower address of the borrower
    /// @return Borrowed balance along with accrured interest
    function borrowBalanceInternal(address borrower) internal view returns (uint) {

        BorrowSnapshot memory borrowSnapshot = accountBorrows[borrower];

        if (borrowSnapshot.principal == 0) return 0;

        return ( borrowSnapshot.principal * borrowIndex ) / borrowSnapshot.interestIndex;
    }

    /// @notice Explain to an end user what this does
    /// @param borrower address of borrower
    /// @param repayAmount amount that is being repayed
    /// @return Wether or not the repayment succeeded or not
    function borrowRepayInternal(address borrower, uint repayAmount) internal returns (bool) {

        require(accrueInterest(), "ACCRUING_INTEREST_FAILED");

        // Repay Amount is greater than 0
        require(repayAmount > 0, "REPAY_AMOUNT_LESS_THAN_ZERO");
        
        // Current Borrow Balance with Interest
        uint amountToRepay = borrowBalanceStored(borrower);

        // Amount to Repay must be greater than zero
        require(repayAmount <= amountToRepay, "REPAY_AMMOUNT_MUST_BE_LESS_THAN");

        doTransferIn(borrower, repayAmount);

        // New Balance = Total Borrow Bal. - repayAmount
        uint accountBorrowsNew = amountToRepay - repayAmount;
        accountBorrows[borrower].principal = accountBorrowsNew;

        totalBorrows = totalBorrows - repayAmount;

        emit RepayBorrow(borrower, repayAmount, accountBorrowsNew, totalBorrows);

        return true;
    }

    function getCash() virtual internal view returns (uint);

    function doTransferIn(address from, uint amount) internal virtual returns (bool);

    function doTransferOut(address to, uint amount) internal virtual returns (bool);
}