const { ethers } = require("hardhat");
const { formatEther, parseEther, formatUnits } = require("ethers/lib/utils");
const { expect } = require("chai");

describe("CETH Tests", function () {
  let CEthContract, cEth;
  let owner, s1, s2, s3, s4, s5;

  beforeEach(async function () {
    // Get the ContractFactory and Signers here.
    [owner, s1, s2, s3, s4, s5] = await ethers.getSigners();
    CEthContract = await ethers.getContractFactory("CEth");

    cEth = await CEthContract.deploy(parseEther("0.020000"));
  });

  it("should mint CETH on supply of ETH", async function () {
    // expect(formatEther(await s1.getBalance())).to.be.equals("10000.0");

    const overrides = { value: parseEther("1") };
    await cEth.connect(s1).mint(overrides);

    expect(
      formatEther(await ethers.provider.getBalance(cEth.address))
    ).to.be.equals("1.0");

    const cTokenBalance = await cEth.balanceOf(s1.address);
    expect(formatEther(cTokenBalance)).to.be.equals("50.0");
  });

  it("should display the current exchange rate", async function () {
    const exchangeRate = formatEther(await cEth.exchangeRateStored());

    // eslint-disable-next-line no-unused-expressions
    expect(exchangeRate).not.to.be.undefined;
  });

  it("should allow the user to redeem the CETH", async function () {

    const overrides = { value: parseEther("1") };
    await cEth.connect(s1).mint(overrides);

    // console.log("ETH before Redeeming CETH: " + formatEther(await s1.getBalance()));

    let cTokenBalance = await cEth.balanceOf(s1.address);
    await cEth.connect(s1).redeem(cTokenBalance);

    expect(
      formatEther(await ethers.provider.getBalance(cEth.address))
    ).to.be.equals("0.0");

    cTokenBalance = await cEth.balanceOf(s1.address);
    expect(formatEther(cTokenBalance)).to.be.equals("0.0");

    // console.log("ETH after Redeeming CETH: "  + formatEther(await s1.getBalance()));
  });

  // it("should display the underlying balance of CETH", async function () {

  //   const overrides = { value: parseEther("1") };

  //   let suppliers = [s1, s2, s3];

  //   await cEth.connect(s1).mint(overrides);
  //   await cEth.connect(s2).mint(overrides);
  //   await cEth.connect(s3).mint(overrides);

  //   // console.log("ETH before Redeeming CETH: " + formatEther(await s1.getBalance()));

  //   const balanceUnderlying = await cEth.callStatic.balanceOfUnderlying(s1.address);
  // });

});
