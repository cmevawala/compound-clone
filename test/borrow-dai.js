const { ethers } = require("hardhat");
const { parseUnits, formatUnits, parseEther } = require("ethers/lib/utils");
const { expect } = require("chai");

const DaiABI = require("../abi/DaiABI.json");

describe("Borrow DAI by providing ETH as Collateral", function () {
    let ComptrollerContract, comptroller;
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
      cEth = await CEthContract.deploy(
        parseUnits("0.020000"),
        comptroller.address
      );
  
      CDaiContract = await ethers.getContractFactory("CDai");
      cDai = await CDaiContract.deploy(
        daiAddress,
        parseUnits("0.020000"),
        comptroller.address
      );
  
      // Account Impersonate to get DAI
      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [accountToInpersonate],
      });
  
      signer = await ethers.getSigner(accountToInpersonate);
      daiContract = new ethers.Contract(daiAddress, DaiABI, signer);
      // daiBalance = await daiContract.balanceOf(accountToInpersonate);
  
      // Transfer DAI to S1 Account to provide Liquidity
      await daiContract.connect(signer).transfer(s1.address, parseUnits("10000"));
      await daiContract.connect(s1).approve(cDai.address, parseUnits("10000"));
    });
  
    it("should allow the user to borrow based on the liquidity", async function () {
  
        // Setup Markets
        await comptroller.addMarket(cEth.address);
        await comptroller.setCollateralFactor(cEth.address, parseUnits("0.75"));
        await comptroller.addMarket(cDai.address);
  
        // S1 providing liquidity to the DAI
        await cDai.connect(s1).mint(parseUnits("1000"));
  
        // S2 Supplying ETH as Collateral
        const overrides = { value: parseEther("1") };
        await cEth.connect(s2).mint(overrides);
  
        // Enter Market - Supplying ETH as Collateral
        let markets = [cEth.address];
        await comptroller.connect(s2).enterMarket(markets);
  
        // DAI balance before borrow
        daiBalance = await daiContract.balanceOf(s2.address);
        expect(formatUnits(daiBalance)).to.equals("0.0");
  
        // Borrow 100 DAI
        await cDai.connect(s2).borrow(parseUnits("100"));
  
        // DAI balance after borrow
        daiBalance = await daiContract.balanceOf(s2.address);
        expect(formatUnits(daiBalance)).to.equals("100.0");
  
        // Verify borrowed balance of S2 with interest if accrued
        let borrowBalanceStored = await cDai.callStatic.borrowBalanceCurrent(
          s2.address
        );
        expect(formatUnits(borrowBalanceStored)).to.be.equal("100.0");
  
        // Borrow 100 DAI
        await cDai.connect(s2).borrow(parseUnits("100"));
  
        // DAI balance after borrow
        daiBalance = await daiContract.balanceOf(s2.address);
        expect(formatUnits(daiBalance)).to.equals("200.0");
  
        // Verify borrowed balance of S2 with interest if accrued
        borrowBalanceStored = await cDai.callStatic.borrowBalanceCurrent(s2.address);
        expect(formatUnits(borrowBalanceStored)).to.be.equal("200.000002378234195084");
    }).timeout(5000);
  
    it("should not allow the user to borrow more than the liquidity", async function () {
  
        // Setup Markets
        await comptroller.addMarket(cEth.address);
        await comptroller.setCollateralFactor(cEth.address, parseUnits("0.75"));
        await comptroller.addMarket(cDai.address);
    
        // S1 providing liquidity to the DAI
        await cDai.connect(s1).mint(parseUnits("1000"));
      
        // S1 Supplying ETH as Collateral
        const overrides = { value: parseEther("1") };
        await cEth.connect(s2).mint(overrides);
  
        // Enter Market - Supplying ETH as Collateral
        let markets = [cEth.address];
        await comptroller.connect(s2).enterMarket(markets);
  
        // Borrow 10000 DAI
        await expect(cDai.connect(s2).borrow(parseUnits("10000"))).to.be.revertedWith(
          "INSUFFICIENT_BALANCE_FOR_BORROW"
        );
    });
  
    it("should allow the user to borrow and repay the borrowed amount with interest", async function () {
  
        // Setup Markets
        await comptroller.addMarket(cEth.address);
        await comptroller.setCollateralFactor(cEth.address, parseUnits("0.75"));
        await comptroller.addMarket(cDai.address);
    
        // S1 providing liquidity to the DAI
        await cDai.connect(s1).mint(parseUnits("1000"));
  
        // S2 Supplying ETH as Collateral
        const overrides = { value: parseEther("1") };
        await cEth.connect(s2).mint(overrides);
  
        // Enter Market - Supplying ETH as Collateral
        let markets = [cEth.address];
        await comptroller.connect(s2).enterMarket(markets);
  
        // Borrow 100 DAI
        await cDai.connect(s2).borrow(parseUnits("100"));
  
        // Verify borrowed balance of S2 with interest if accrued
        borrowBalanceStored = await cDai.callStatic.borrowBalanceCurrent(s2.address);
        expect(formatUnits(borrowBalanceStored)).to.be.equal("100.0");
  
        const halfRepayment = (borrowBalanceStored / 2 / 2) / 10**18;
        await daiContract.connect(s2).approve(cDai.address, parseUnits(halfRepayment.toString()));
        await cDai.connect(s2).borrowRepay(parseUnits(halfRepayment.toString()));
  
        borrowBalanceStored = await cDai.callStatic.borrowBalanceCurrent(s2.address);
        expect(formatUnits(borrowBalanceStored)).to.be.equal("75.000008323819909034");
  
        // console.log(formatUnits(await cDai.totalBorrows()));
        let totalBorrows = await cDai.totalBorrows();
        expect(formatUnits(totalBorrows)).to.equals("75.0000047564687974");
        daiBalance = await daiContract.balanceOf(cDai.address);
        expect(formatUnits(daiBalance)).to.equals("925.0");
  
        for (let i = 0; i < 50; i++) {
          await ethers.provider.send("evm_mine");
        }
  
        borrowBalanceStored = await cDai.callStatic.borrowBalanceCurrent(s2.address);
        expect(formatUnits(borrowBalanceStored)).to.be.equal("75.000084130042040124");
    });
});
  