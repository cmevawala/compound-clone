//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "hardhat/console.sol";

contract Oracle {
    function getAssetPrice(string memory asset) external pure returns (uint) {
        if (compareStrings(asset, "CETH")) return 311370.85 ether; // 311370850000000000000000;

        if (compareStrings(asset, "CDAI")) return 74.49 ether; // 74490000000000000000

        return 0;
    }

    function compareStrings(string memory a, string memory b) internal pure returns (bool) {
        return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
    }
}
