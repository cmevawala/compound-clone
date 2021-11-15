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

    expect(formatEther(await cEth.balanceOf(s1.address))).to.be.equals("50.0");
  });
});
