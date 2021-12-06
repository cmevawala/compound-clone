//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;
import "./CToken.sol";
import "./Oracle.sol";

import "hardhat/console.sol";

contract Comptroller {

    /// @notice Emitted when a collateral factor is changed by admin
    event NewCollateralFactor(CToken cToken, uint oldCollateralFactorMantissa, uint newCollateralFactorMantissa);

    uint256 constant public scaleBy = 10**18;

    Oracle oracle;

    address public admin;

    struct Market {
        bool isListed;
        uint collateralFactor;
    }

    mapping(address => Market) public markets;
    
    CToken[] public allMarkets;
    mapping(address => CToken[]) public accountEnteredMarkets;


    constructor() {
        admin = msg.sender;
        oracle = new Oracle();
    }

    function getMarketsCount() view external returns (uint) {
        return allMarkets.length;
    }

    function isMarketListed(address cToken) view external returns (bool) {
        return markets[cToken].isListed;
    }

    function addMarket(address cToken) external returns (bool) {
        require(msg.sender == admin, "RESTRICED_ACCESS");

        require(markets[cToken].isListed == false, "MARKET_ALREADY_LISTED");

        markets[cToken] = Market({isListed: true, collateralFactor: 25});

        for (uint i = 0; i < allMarkets.length; i ++) {
            require(allMarkets[i] != CToken(cToken), "MARKET_ALREADY_LISTED");
        }

        allMarkets.push(CToken(cToken));

        return true;
    }

    function setCollateralFactor(address cToken, uint newCollateralFactor) external returns (bool) {
        require(msg.sender == admin, "RESTRICED_ACCESS");

        uint maxCollateralFactor = 0.9 ether;
        require(newCollateralFactor > 0 && newCollateralFactor <= maxCollateralFactor, "COLLETERAL_FACTOR_VALIDATION_FAILED");

        Market storage market = markets[cToken];

        uint oldCollateralFactor = market.collateralFactor;
        market.collateralFactor = newCollateralFactor;

        emit NewCollateralFactor(CToken(cToken), oldCollateralFactor, newCollateralFactor);

        return true;
    }

    function enterMarket(address[] memory cTokens) external returns (bool) {

        delete accountEnteredMarkets[msg.sender];

        for (uint i = 0; i < cTokens.length; i++) {
            CToken cToken = CToken(cTokens[i]);

            Market memory marketToJoin = markets[cTokens[i]];

            require(marketToJoin.isListed, "MARKET_NOT_LISTED");

            accountEnteredMarkets[msg.sender].push(cToken);
        }

        // After entering user should not be able to transfer or redeem tokens

        return  true;
    }

    function getAccountEnteredMarkets(address borrower) view external returns (CToken[] memory) {
        return accountEnteredMarkets[borrower];
    }

    // function exitMarket() {
    // }

    function getAccountLiquidity(address borrower) view external returns (uint sum) {

        CToken[] memory enteredMarkets = accountEnteredMarkets[borrower];

        for (uint i = 0; i < enteredMarkets.length; i++) {

            CToken cToken = enteredMarkets[i];

            Market memory market = markets[address(cToken)];

            uint price = oracle.getAssetPrice(cToken.symbol());

            uint collateraledToken = (cToken.balanceOf(borrower) * cToken.exchangeRateStored()) / scaleBy;

            uint maxTokenAsCollateral = ( collateraledToken * market.collateralFactor ) / scaleBy;

            sum += (maxTokenAsCollateral * price) / scaleBy;
        }
    }

}
