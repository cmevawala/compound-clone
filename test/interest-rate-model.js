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

  it("should get the current borrow rate for ETH", async function () {

    const borrowRate = await interestRateModel.getBorrowRate(9000, 1000, 0);
    expect(formatUnits(borrowRate)).to.equals("0.05");

  });

  it("should get the current borrow rate for ETH per Block", async function () {

    const borrowRate = await interestRateModel.getBorrowRatePerBlock(9000, 1000, 0);
    expect(formatUnits(borrowRate)).to.equals("0.000000023782343987");

  });

  it("should get the current supply rate for ETH", async function () {

    const supplyRate = await interestRateModel.getSupplyRate(9000, 1000, 0, parseEther("0.2"));
    expect(formatUnits(supplyRate)).to.equals("0.004");

  });

  it("should get the current borrow rate for ETH - with reserves", async function () {

    const borrowRate = await interestRateModel.getBorrowRate(9000, 1000, 2000);
    expect(formatUnits(borrowRate)).to.equals("0.0575");

  });

  it("should get the current supply rate for ETH - with reserves", async function () {

    const supplyRate = await interestRateModel.getSupplyRate(9000, 1000, 2000, parseEther("0.2"));
    expect(formatUnits(supplyRate)).to.equals("0.00575");

  });

});
