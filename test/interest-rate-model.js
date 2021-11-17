const { ethers } = require("hardhat");
const { formatEther, parseEther, formatUnits } = require("ethers/lib/utils");
const { expect } = require("chai");

describe.only("Interest Rate Model Tests", function () {
  let InterestRateModelContract, interestRateModel;
  let owner, s1;

  beforeEach(async function () {
    // Get the ContractFactory and Signers here.
    [owner, s1] = await ethers.getSigners();
    InterestRateModelContract = await ethers.getContractFactory("InterestRateModel");

    interestRateModel = await InterestRateModelContract.deploy();
  });

  it("should get the current supply rate for ETH", async function () {

    // Cash = 1000ETH
    // Borrows = 100ETH
    // Utilization Rate = 0.1%
    // AnnualBorrowRate = 0.1 + 5 * 10**16 ~ 5.045
    // Supply Rate = 5.045 * 0.1 * (1 - SpreadBPS)
    const supplyRate = await interestRateModel.getSupplyRate(900, 100);
    expect(formatUnits(supplyRate)).to.equals("0.000000215967465753");

  });

  it("should get the current supply rate for ETH", async function () {

    const borrowRate = await interestRateModel.getBorrowRate(900, 100);
    expect(formatUnits(borrowRate)).to.equals("0.000002399638508371");

  });

});
