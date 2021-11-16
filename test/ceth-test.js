const { ethers } = require("hardhat");
const { formatEther, parseEther } = require("ethers/lib/utils");
const { expect } = require("chai");

describe.only("CToken Tests", function () {
  let CEthContract, cEth;
  let owner, s1;

  beforeEach(async function () {
    // Get the ContractFactory and Signers here.
    [owner, s1] = await ethers.getSigners();
    CEthContract = await ethers.getContractFactory("CEth");

    cEth = await CEthContract.deploy(parseEther("0.020000"));
  });

  it("should mint CETH on supply of ETH", async function () {
    expect(formatEther(await s1.getBalance())).to.be.equals("10000.0");

    const overrides = { value: parseEther("1") };
    await cEth.connect(s1).mint(overrides);

    expect(
      formatEther(await ethers.provider.getBalance(cEth.address))
    ).to.be.equals("1.0");

    const cTokenBalance = await cEth.balanceOf(s1.address);
    expect(formatEther(cTokenBalance)).to.be.equals("50.0");
  });

  it("should display the current exchange rate", async function () {
    const exchangeRate = formatEther(await cEth.exchangeRate());
    // eslint-disable-next-line no-unused-expressions
    expect(exchangeRate).not.to.be.undefined;
  });

  it("should allow the user to redeem the CETH", async function () {
    const overrides = { value: parseEther("1") };
    await cEth.connect(s1).mint(overrides);

    let cTokenBalance = await cEth.balanceOf(s1.address);
    await cEth.connect(s1).redeem(cTokenBalance);

    cTokenBalance = await cEth.balanceOf(s1.address);
    expect(formatEther(cTokenBalance)).to.be.equals("0.0");

    expect(
      formatEther(await ethers.provider.getBalance(cEth.address))
    ).to.be.equals("0.0");
  });

});
