const { ethers } = require("hardhat");
const { parseUnits, formatUnits, parseEther } = require("ethers/lib/utils");
const { expect } = require("chai");

const DaiABI = require("../abi/DaiABI.json");

describe.only("Comptroller Tests", function () {
  let ComptrollerContract, comptroller;
  let CEthContract, cEth;
  let CDaiContract, cDai;
  let daiContract, signer, daiBalance;
  let owner, s1;

  const daiAddress = "0x6b175474e89094c44da98b954eedeac495271d0f";
  const accountToInpersonate = "0x6F6C07d80D0D433ca389D336e6D1feBEA2489264";

  beforeEach(async function () {
    // Get the ContractFactory and Signers here.
    [owner, s1] = await ethers.getSigners();

    CEthContract = await ethers.getContractFactory("CEth");
    cEth = await CEthContract.deploy(parseUnits("0.020000"));

    CDaiContract = await ethers.getContractFactory("CDai");
    cDai = await CDaiContract.deploy(daiAddress, parseUnits("0.020000"));

    ComptrollerContract = await ethers.getContractFactory("Comptroller");
    comptroller = await ComptrollerContract.deploy();

      // Account Impersonate to get DAI
      await hre.network.provider.request({
          method: "hardhat_impersonateAccount",
          params: [accountToInpersonate],
      });

      signer = await ethers.getSigner(accountToInpersonate);
      daiContract = new ethers.Contract(daiAddress, DaiABI, signer);
      // const daiBalance = await daiContract.balanceOf(accountToInpersonate);
  });

  it("should allow the admin to add ETH and DAI into the Markets", async function () {
    await comptroller.addMarket(cEth.address);
    await comptroller.addMarket(cDai.address);

    expect(await comptroller.getMarketsCount()).to.equals(2);
  });

  it("should print the collateral factor of ETH market", async function () {
    await comptroller.addMarket(cEth.address);

    const { isListed, } = await comptroller.markets(cEth.address);
    expect(isListed).to.equals(true);
  });

  it("should allow the admin to set the collateral factor the market", async function () {
    await comptroller.addMarket(cEth.address);
    await comptroller.setCollateralFactor(cEth.address, parseUnits("0.75"));

    const { collateralFactor, } = await comptroller.markets(cEth.address);
    expect(formatUnits(collateralFactor)).to.equals("0.75");
  });

  it("should allow the user to enter markets", async function () {
    await comptroller.addMarket(cEth.address);
    await comptroller.setCollateralFactor(cEth.address, parseUnits("0.75"));
    await comptroller.addMarket(cDai.address);

    let markets = [cEth.address, cDai.address];
    await comptroller.connect(s1).enterMarket(markets);

    markets = await comptroller.getAccountEnteredMarkets(s1.address);
    expect(markets.length).to.equals(2);
  });
  
  it("should allow the user to check it own liquidity", async function () {
    await comptroller.addMarket(cEth.address);
    await comptroller.setCollateralFactor(cEth.address, parseUnits("0.75"));
    await comptroller.addMarket(cDai.address);

    const overrides = { value: parseEther("1") };
    await cEth.connect(s1).mint(overrides);

    const cTokenBalance = await cEth.balanceOf(s1.address);
    expect(formatUnits(cTokenBalance)).to.be.equals("50.0");

    let markets = [cEth.address];
    await comptroller.connect(s1).enterMarket(markets); // entering a market without supplying anything ?

    markets = await comptroller.getAccountEnteredMarkets(s1.address);
    expect(markets.length).to.equals(1);

    const liquidity = await comptroller.getAccountLiquidity(s1.address);
    expect(liquidity).not.to.be.undefined;
  });

});
