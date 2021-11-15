//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "hardhat/console.sol";

contract CEth is ERC20 {

    address owner;
    
    uint private initialExchangeRate = 20000000000000000;

    event Mint(address minter, uint mintAmount, uint mintTokens);
    
    /// @notice Explain to an end user what this does
    /// @dev Explain to a developer any extra details
    /// @param Documents a parameter just like in doxygen (must be followed by parameter name)
    /// @return Documents the return variables of a contract’s function state variable
    constructor(uint _initialExchangeRate) ERC20("CETH Token", " CETH") {

        owner = msg.sender;

        require(_initialExchangeRate > 0, "initial exchange rate must be greater than zero.");

        initialExchangeRate = _initialExchangeRate;
    }

    /// @notice User supplies assets into the market and receives cTokens in exchange
    /// @return Whether or not the transfer succeeded
    function mint() external payable returns (bool) {
        
        mintInternal(msg.sender, msg.value);
        
        return true;
    }

    /// @notice User supplies assets into the market and receives cTokens in exchange
    function mintInternal(address minter, uint _mintAmount) internal {

        /*
         * We get the current exchange rate and calculate the number of cTokens to be minted:
         *  mintTokens = actualMintAmount / exchangeRate
         */
         uint mintTokens = (_mintAmount / initialExchangeRate) * (10 ** decimals());

        _mint(minter, mintTokens);

        emit Mint(minter, _mintAmount, mintTokens);
    }

    function calculateExchangeRate() internal {

    }
}
