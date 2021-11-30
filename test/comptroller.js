const { ethers } = require("hardhat");
const { parseUnits, formatUnits, parseEther } = require("ethers/lib/utils");
const { expect } = require("chai");

const DaiABI = require("../abi/DaiABI.json");

describe.only("Comptroller Tests", function () {
  let ComptrollerContract, comptroller;
  let OracleContract, oracle;
  let CEthContract, cEth;
  let CDaiContract, cDai;
  let daiContract, signer, daiBalance;
  let owner, s1, s2;

  const daiAddress = "0x6b175474e89094c44da98b954eedeac495271d0f";
  const accountToInpersonate = "0x6F6C07d80D0D433ca389D336e6D1feBEA2489264";

  beforeEach(async function () {
    // Get the ContractFactory and Signers here.
    [owner, s1, s2] = await ethers.getSigners();

    ComptrollerContract = await ethers.getContractFactory("Comptroller");
    comptroller = await ComptrollerContract.deploy();

    CEthContract = await ethers.getContractFactory("CEth");
    cEth = await CEthContract.deploy(parseUnits("0.020000"), comptroller.address);

    CDaiContract = await ethers.getContractFactory("CDai");
    cDai = await CDaiContract.deploy(daiAddress, parseUnits("0.020000"), comptroller.address);

    OracleContract = await ethers.getContractFactory("Oracle");
    oracle = await OracleContract.deploy();

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

    // Supply ETH
    const overrides = { value: parseEther("1") };
    await cEth.connect(s1).mint(overrides);

    const cTokenBalance = await cEth.balanceOf(s1.address);
    expect(formatUnits(cTokenBalance)).to.be.equals("50.0");

    // Enter Market - Supplying ETH as Collateral
    let markets = [cEth.address];
    await comptroller.connect(s1).enterMarket(markets); // entering a market without supplying anything ?

    markets = await comptroller.getAccountEnteredMarkets(s1.address);
    expect(markets.length).to.equals(1);

    // Calculate Account Liquidity
    const liquidityInUSD = await comptroller.getAccountLiquidity(s1.address);
    expect(liquidityInUSD).not.to.be.undefined;
  });

  it("should allow the user to check the liquidity based on the collateral", async function () {
    await comptroller.addMarket(cEth.address);
    await comptroller.setCollateralFactor(cEth.address, parseUnits("0.75"));
    await comptroller.addMarket(cDai.address);

    // Supply ETH
    const overrides = { value: parseEther("1") };
    await cEth.connect(s1).mint(overrides);

    const cTokenBalance = await cEth.balanceOf(s1.address);
    expect(formatUnits(cTokenBalance)).to.be.equals("50.0");

    // Enter Market - Supplying ETH as Collateral
    let markets = [cEth.address];
    await comptroller.connect(s1).enterMarket(markets); // entering a market without supplying anything ?

    markets = await comptroller.getAccountEnteredMarkets(s1.address);
    expect(markets.length).to.equals(1);

    // Calculate Account Liquidity
    const liquidityInUSD = await comptroller.getAccountLiquidity(s1.address);
    expect(liquidityInUSD).not.to.be.undefined;

    // Fetching price from Price Feed
    const daiPriceInUSD = await oracle.getAssetPrice("CDAI");
    expect(formatUnits(daiPriceInUSD)).not.to.be.undefined;
  });

  it.only("should allow the user to borrow based on the liquidity", async function () {

    // CDai current exchange rate
    let exchangeRate = await cDai.callStatic.exchangeRateCurrent(); // +1 Block // PrevBlock = 1, CurrentBlock = 2
    expect(formatUnits(exchangeRate)).to.be.equals("0.02");

    // Supply DAI
    await daiContract.connect(signer).transfer(s1.address, parseUnits("10000"));
    await daiContract.connect(s1).approve(cDai.address, parseUnits("10000"));
    await cDai.connect(s1).mint(parseUnits("1000")); // +1 Block  // PrevBlock = 2, CurrentBlock = 3

    // CDai Contract Total Supply of DAI
    const cDaiTotalSupply = await daiContract.balanceOf(cDai.address);
    expect(formatUnits(cDaiTotalSupply)).to.be.equals("1000.0");

    // Verify User received CDai
    let cTokenBalance = await cDai.balanceOf(s1.address);
    expect(formatUnits(cTokenBalance)).to.be.equals("50000.0");



    // ---------------------------------------------------------------------

    // Verify borrow, supply and exchange rate before borrow action on CETH
    exchangeRate = await cEth.callStatic.exchangeRateCurrent(); // +1 Block // PrevBlock = 3, CurrentBlock = 4
    expect(formatUnits(exchangeRate)).to.be.equals("0.02");
    let borrowRate = await cEth.getBorrowRate();
    expect(formatUnits(borrowRate)).to.be.equals("0.02");
    let supplyRate = await cEth.getSupplyRate();
    expect(formatUnits(supplyRate)).to.be.equals("0.0");

    // Verify borrow, supply and exchange rate before borrow action on CDAI
    exchangeRate = await cDai.callStatic.exchangeRateStored();  // CY
    expect(formatUnits(exchangeRate)).to.be.equals("0.02");
    borrowRate = await cDai.getBorrowRate();
    expect(formatUnits(borrowRate)).to.be.equals("0.02");
    supplyRate = await cDai.getSupplyRate();
    expect(formatUnits(supplyRate)).to.be.equals("0.0");

    // ---------------------------------------------------------------------



    // Setup Markets
    await comptroller.addMarket(cEth.address);
    await comptroller.setCollateralFactor(cEth.address, parseUnits("0.75"));
    await comptroller.addMarket(cDai.address);

    // Supply ETH as Collateral
    const overrides = { value: parseEther("1") };
    await cEth.connect(s2).mint(overrides); // Once supplied as Collateral this cannot be redeemed // +1 Block // PrevBlock = 4, CurrentBlock = 5

    cTokenBalance = await cEth.balanceOf(s2.address);
    expect(formatUnits(cTokenBalance)).to.be.equals("50.0");

    // Enter Market - Supplying ETH as Collateral
    let markets = [cEth.address];
    await comptroller.connect(s2).enterMarket(markets); // entering a market without supplying anything ?



    // ---------------------------------------------------------------------

    // Verify borrow, supply and exchange rate before borrow action on CETH
    exchangeRate = await cEth.callStatic.exchangeRateCurrent(); // +1 Block // PrevBlock = 5, CurrentBlock = 6 // EY
    expect(formatUnits(exchangeRate)).to.be.equals("0.02");
    borrowRate = await cEth.getBorrowRate();
    expect(formatUnits(borrowRate)).to.be.equals("0.02");
    supplyRate = await cEth.getSupplyRate();
    expect(formatUnits(supplyRate)).to.be.equals("0.0");

    // Verify borrow, supply and exchange rate before borrow action on CDAI
    exchangeRate = await cDai.callStatic.exchangeRateStored(); // CY
    expect(formatUnits(exchangeRate)).to.be.equals("0.02");
    borrowRate = await cDai.getBorrowRate();
    expect(formatUnits(borrowRate)).to.be.equals("0.02");
    supplyRate = await cDai.getSupplyRate();
    expect(formatUnits(supplyRate)).to.be.equals("0.0");

    // ---------------------------------------------------------------------



    // DAI balance before borrow
    daiBalance = await daiContract.balanceOf(s2.address);
    expect(formatUnits(daiBalance)).to.equals("0.0");

    await cDai.connect(s2).borrow(parseUnits("100")); // Borrow more than the available liquidity // +1 Block // PrevBlock = 7, CurrentBlock = 8
    
    // DAI balance after borrow
    daiBalance = await daiContract.balanceOf(s2.address);
    expect(formatUnits(daiBalance)).to.equals("100.0");



    // ---------------------------------------------------------------------

    // Verify borrow, supply and exchange rate before borrow action on CETH
    exchangeRate = await cEth.callStatic.exchangeRateCurrent(); // +1 Block // PrevBlock = 8, CurrentBlock = 9 // EY
    expect(formatUnits(exchangeRate)).to.be.equals("0.02");
    borrowRate = await cEth.getBorrowRate();
    expect(formatUnits(borrowRate)).to.be.equals("0.02");
    supplyRate = await cEth.getSupplyRate();
    expect(formatUnits(supplyRate)).to.be.equals("0.0");

    // Verify borrow, supply and exchange rate before borrow action on CDAI
    exchangeRate = await cDai.callStatic.exchangeRateStored(); // CY
    expect(formatUnits(exchangeRate)).to.be.equals("0.02");
    borrowRate = await cDai.getBorrowRate();
    expect(formatUnits(borrowRate)).to.be.equals("0.05");
    supplyRate = await cDai.getSupplyRate();
    expect(formatUnits(supplyRate)).to.be.equals("0.004");

    // ---------------------------------------------------------------------



    // Verify borrowed balance with interest if accrued
    let borrowBalanceStored = await cDai.callStatic.borrowBalanceStored(s2.address);
    expect(formatUnits(borrowBalanceStored)).to.be.equal("100.0");

    // DAI balance before borrow
    daiBalance = await daiContract.balanceOf(s2.address);
    expect(formatUnits(daiBalance)).to.equals("100.0");

    await cDai.connect(s2).borrow(parseUnits("100")); // TODO: Borrow more than the available liquidity // +1 Block // PrevBlock = 9, CurrentBlock = 10
    
    // DAI balance after borrow
    daiBalance = await daiContract.balanceOf(s2.address);
    expect(formatUnits(daiBalance)).to.equals("200.0");


    // ---------------------------------------------------------------------

    // Verify borrow, supply and exchange rate before borrow action on CETH
    exchangeRate = await cEth.callStatic.exchangeRateCurrent(); // +1 Block // PrevBlock = 8, CurrentBlock = 9 // EY
    expect(formatUnits(exchangeRate)).to.be.equals("0.02");
    borrowRate = await cEth.getBorrowRate();
    expect(formatUnits(borrowRate)).to.be.equals("0.02");
    supplyRate = await cEth.getSupplyRate();
    expect(formatUnits(supplyRate)).to.be.equals("0.0");

    // Verify borrow, supply and exchange rate before borrow action on CDAI
    exchangeRate = await cDai.callStatic.exchangeRateStored(); // CY
    expect(formatUnits(exchangeRate)).to.be.equals("0.020000000047564687");
    borrowRate = await cDai.getBorrowRate();
    expect(formatUnits(borrowRate)).to.be.equals("0.080000000570776254");
    supplyRate = await cDai.getSupplyRate();
    expect(formatUnits(supplyRate)).to.be.equals("0.012800000213089802");

    // // ---------------------------------------------------------------------




    // // Verify borrowed balance with interest if accrued
    // borrowBalanceStored = await cDai.callStatic.borrowBalanceStored(s2.address);
    // expect(formatUnits(borrowBalanceStored)).to.be.equal("324.999999999211599999");


    // await cDai.connect(s1).redeem(parseUnits("100"));


    // // Verify underlying Balance of CEth
    // const balanceUnderlying = await cEth.callStatic.balanceOfUnderlying(s2.address);
    // console.log(formatUnits(balanceUnderlying));
  });

  async function logRates() {






  }

});
