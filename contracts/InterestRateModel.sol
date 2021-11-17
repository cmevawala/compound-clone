//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "hardhat/console.sol";

contract InterestRateModel {

    uint constant scaleBy = 10**18;
    uint constant oneMinusSpreadBasisPoints = 9000;
    uint constant BLOCKS_PER_YEAR = 2102400;

    uint constant MULTIPLIER = 45; // 45%
    uint constant BASE_RATE = 5 * 10**18; // 5%

    /// @dev Calculates the utilization rate (borrows / (cash + borrows))
    function getUtilizationRate(uint cash, uint borrows) pure internal returns (uint) {

        require(borrows > 0, "ZERO_UTILIZATION_RATE_WHEN_BORROW_IS_ZERO");

        return ( borrows * scaleBy ) / ( cash + borrows ); // 100 ETH / 900 ETH ~ 0.1 i.e. 10%
    }

    /// @dev Calculates the utilization and borrow rates for use by get{Supply,Borrow}Rate functions
    function getUtilizationAndAnnualBorrowRate(uint cash, uint borrows) pure internal returns (uint utilizationRate, uint annualBorrowRate) {

        utilizationRate = getUtilizationRate(cash, borrows);

        uint utilizationRateMuled = utilizationRate * MULTIPLIER / 100;

        // Borrow Interest Rate = ( Multiplier * Utilization Rate ) + Base Rate
        annualBorrowRate = utilizationRateMuled + BASE_RATE;
    }

    function getSupplyRate(uint cash, uint borrows) pure external returns (uint supplyRate) {
        uint utilizationRate;
        uint annualBorrowRate;

        (utilizationRate, annualBorrowRate) = getUtilizationAndAnnualBorrowRate(cash, borrows);

        // Supply Rate =  BorrowingInterest * Utilization Rate * (1 - Reserve Factor)
        uint utilizationRate1 = utilizationRate * oneMinusSpreadBasisPoints;

        uint doubleScaledProductWithHalfScale = ( annualBorrowRate * utilizationRate1 ) + ( scaleBy / 2 );

        uint supplyRate0 = doubleScaledProductWithHalfScale / scaleBy;

        supplyRate = supplyRate0 / ( 10000 * BLOCKS_PER_YEAR );
    }

    function getBorrowRate(uint cash, uint borrows) pure external returns (uint borrowRate) {
        uint utilizationRate;
        uint annualBorrowRate;

        (utilizationRate, annualBorrowRate) = getUtilizationAndAnnualBorrowRate(cash, borrows);
        borrowRate = annualBorrowRate / BLOCKS_PER_YEAR;
    }
}