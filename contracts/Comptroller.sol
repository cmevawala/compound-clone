//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;
import "./CToken.sol";

import "hardhat/console.sol";


contract Comptroller {

    address public admin;

    struct Market {
        bool isListed;
        uint collateralFactor;
    }

    mapping(address => Market) public markets;
    
    /// @notice A list of all markets
    CToken[] public allMarkets;

    constructor() {
        admin = msg.sender;
    }

    function addMarket(CToken cToken) external {
        require(msg.sender == admin, "RESTRICED_ACCESS");

        require(markets[address(cToken)].isListed == false, "MARKET_ALREADY_LISTED");

        markets[address(cToken)] = Market({isListed: true, collateralFactor: 0});

        for (uint i = 0; i < allMarkets.length; i ++) {
            require(allMarkets[i] != CToken(cToken), "MARKET_ALREADY_LISTED");
        }
        allMarkets.push(CToken(cToken));
    }

}
