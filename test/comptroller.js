const { ethers } = require("hardhat");
const { parseEther, formatUnits } = require("ethers/lib/utils");
const { expect } = require("chai");

describe("Comptroller Tests", function () {
  let ComptrollerContract, comptroller;
  let CEthContract, cEth;
  let CDaiContract, cDai;
  let owner, s1;

  beforeEach(async function () {
    // Get the ContractFactory and Signers here.
    [owner, s1] = await ethers.getSigners();

    CEthContract = await ethers.getContractFactory("CEth");
    cEth = await CEthContract.deploy(parseEther("0.020000"));

    CDaiContract = await ethers.getContractFactory("CDai");
    cDai = await CDaiContract.deploy(parseEther("0.020000"));

    ComptrollerContract = await ethers.getContractFactory("Comptroller");
    comptroller = await ComptrollerContract.deploy();
  });

  it("should add the ETH and DAI into the Markets", async function () {
    
  });
  
});
