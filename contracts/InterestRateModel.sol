//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "hardhat/console.sol";

contract InterestRateModel {

    uint constant scaleBy = 10**18;
    
    uint constant BLOCKS_PER_YEAR = 2102400;

    uint constant MULTIPLIER = (3 * 10**17); // 30%

    uint constant BASE_RATE = (2 * 10**16); // 2%


    /// @dev Calculates the utilization rate (borrows / (cash + borrows)) - reserves. 
    /// @dev https://ian.pw/posts/2020-12-20-understanding-compound-protocols-interest-rates
    function getUtilizationRate(uint cash, uint borrows, uint reserves) pure internal returns (uint) {

        if (borrows == 0) return 0;

        return ( borrows * scaleBy ) / ( cash + borrows - reserves ) ; // 1000 ETH / 10000 ETH ~ 0.1 i.e. 10%
    }

    /// @notice Calculates the current borrow rate per block
    /// @param cash a parameter just like in doxygen (must be followed by parameter name)
    /// @param borrows a parameter just like in doxygen (must be followed by parameter name)
    /// @param reserves a parameter just like in doxygen (must be followed by parameter name)
    /// @return borrowRate The borrow rate percentage (scaled by 1e18)
    function getBorrowRate(uint cash, uint borrows, uint reserves) pure public returns (uint borrowRate) {

        uint utilizationRate = getUtilizationRate(cash, borrows, reserves);

        borrowRate = (( MULTIPLIER * utilizationRate ) / scaleBy) + BASE_RATE; // 0.3 * 0.1 + 0.02 = 0.05 ~ 5%
    }

    function getBorrowRatePerBlock(uint cash, uint borrows, uint reserves) pure public returns (uint borrowRate) {
        return getBorrowRate(cash, borrows, reserves) / BLOCKS_PER_YEAR;
    }

    /// @notice Calculates the current supply rate per block
    /// @param cash a parameter just like in doxygen (must be followed by parameter name)
    /// @param borrows a parameter just like in doxygen (must be followed by parameter name)
    /// @param reserves a parameter just like in doxygen (must be followed by parameter name)
    /// @return supplyRate The supply rate percentage (scaled by 1e18)
    function getSupplyRate(uint cash, uint borrows, uint reserves, uint reserveFactor) pure external returns (uint supplyRate) {

        uint oneMinusReserveFactor = (1 * scaleBy) - reserveFactor; // 0.8

        uint borrowRate = getBorrowRate(cash, borrows, reserves); // 0.1

        return (borrowRate * getUtilizationRate(cash, borrows, reserves) * oneMinusReserveFactor) / scaleBy / scaleBy; // 0.05 * 0.1 * 0.8 = 0.004 ~ 0.4%
    }
}