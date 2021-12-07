const { ethers } = require("hardhat");
const { parseUnits, formatUnits, parseEther, formatEther } = require("ethers/lib/utils");
const { expect } = require("chai");

const DaiABI = require("../abi/DaiABI.json");

describe("Borrow ETH by providing DAI as Collateral", function () {
    let ComptrollerContract, comptroller;
    let CEthContract, cEth;
    let CDaiContract, cDai;
    let daiContract, signer, daiBalance;
    let owner, s1, s2, ethBalance;
    let borrowBalanceCurrent;
  
    const daiAddress = "0x6b175474e89094c44da98b954eedeac495271d0f";
    const accountToInpersonate = "0x6F6C07d80D0D433ca389D336e6D1feBEA2489264";

    this.timeout(50000);
  
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
  
      // Transfer DAI to S2 Account to provide Liquidity
      await daiContract.connect(signer).transfer(s2.address, parseUnits("10000"));
      await daiContract.connect(s2).approve(cDai.address, parseUnits("10000"));
    })
  
    it("should allow the user to borrow based on the liquidity", async function () {
  
        // Setup Markets
        await comptroller.addMarket(cDai.address);
        await comptroller.setCollateralFactor(cDai.address, parseUnits("0.90"));
        await comptroller.addMarket(cEth.address);
  
        // S1 providing liquidity to the ETH
        const overrides = { value: parseEther("1000") };
        await cEth.connect(s1).mint(overrides);
  
        // S2 supplying DAI
        await cDai.connect(s2).mint(parseUnits("10000"));
  
        // Enter Market - Supplying DAI as Collateral
        let markets = [cDai.address];
        await comptroller.connect(s2).enterMarket(markets);
  
        // ETH balance before borrow
        // ethBalance = await ethers.provider.getBalance(s2.address);
        // expect(parseInt(formatUnits(ethBalance))).to.equals(parseInt("9999.993299057032371123"));
  
        // Borrow 100 ETH
        await cEth.connect(s2).borrow(parseUnits("100"));
  
        // ETH balance after borrow
        ethBalance = await ethers.provider.getBalance(s2.address);
        expect(parseInt(formatUnits(ethBalance))).to.equals(parseInt("10096.989710301366246135"));
  
        // Verify borrowed balance of S2 with interest if accrued
        borrowBalanceCurrent = await cEth.callStatic.borrowBalanceCurrent(s2.address);
        expect(formatUnits(borrowBalanceCurrent)).to.be.equal("100.0");
  
        // const liquidityInUSD = await comptroller.getAccountLiquidity(s2.address);
        // console.log(formatUnits(liquidityInUSD));

        // Borrow 100 ETH
        await cEth.connect(s2).borrow(parseUnits("100"));
        
        // ETH balance after borrow
        ethBalance = await ethers.provider.getBalance(s2.address);
        expect(parseInt(formatUnits(ethBalance))).to.equals(parseInt("10196.983077945933541913"));
        // expect(formatUnits(ethBalance)).to.equals("10199.983077945933541913");

        for (let i = 0; i < 100; i++) {
          await ethers.provider.send("evm_mine");
        }
  
        // Verify borrowed balance of S2 with interest if accrued
        borrowBalanceCurrent = await cEth.callStatic.borrowBalanceCurrent(s2.address);
        expect(formatUnits(borrowBalanceCurrent)).to.be.equal("200.000763413165766084");
    })
  
    it("should not allow the user to borrow more than the liquidity", async function () {
  
        // Setup Markets
        await comptroller.addMarket(cDai.address);
        await comptroller.setCollateralFactor(cDai.address, parseUnits("0.90"));
        await comptroller.addMarket(cEth.address);
    
        // S1 providing liquidity to the ETH
        const overrides = { value: parseEther("1000") };
        await cEth.connect(s1).mint(overrides);
      
        // S2 supplying DAI
        await cDai.connect(s2).mint(parseUnits("10000"));
  
        // Enter Market - Supplying DAI as Collateral
        let markets = [cDai.address];
        await comptroller.connect(s2).enterMarket(markets);
  
        // Borrow 10000 ETH
        await expect(cEth.connect(s2).borrow(parseUnits("10000"))).to.be.revertedWith(
          "INSUFFICIENT_BALANCE_FOR_BORROW"
        );
    });

    it("should not allow the user to redeem when user has supplied the asset as collateral", async function () {
      // Setup Markets
      await comptroller.addMarket(cDai.address);
      await comptroller.setCollateralFactor(cDai.address, parseUnits("0.90"));
      await comptroller.addMarket(cEth.address);

      // S1 providing liquidity to the ETH
      let overrides = { value: parseEther("1000") };
      await cEth.connect(s1).mint(overrides);

      // S2 supplying DAI
      await cDai.connect(s2).mint(parseUnits("10000"));

      // Enter Market - Supplying DAI as Collateral
      let markets = [cDai.address];
      await comptroller.connect(s2).enterMarket(markets);

      // Redeem after supplying as Collateral
      let cTokenBalance = await cDai.balanceOf(s2.address);
      await expect(cDai.connect(s2).redeem(cTokenBalance)).to.be.revertedWith("REDEEM_FAILED_DUE_TO_ASSET_AS_COLLATERAL");
    });
  
    it("should allow the user to borrow and repay the borrowed amount with interest", async function () {
  
        // Setup Markets
        await comptroller.addMarket(cDai.address);
        await comptroller.setCollateralFactor(cDai.address, parseUnits("0.90"));
        await comptroller.addMarket(cEth.address);
  
        // S1 providing liquidity to the ETH
        let overrides = { value: parseEther("1000") };
        await cEth.connect(s1).mint(overrides);
  
        // S2 supplying DAI
        await cDai.connect(s2).mint(parseUnits("10000"));
  
        // Enter Market - Supplying DAI as Collateral
        let markets = [cDai.address];
        await comptroller.connect(s2).enterMarket(markets);

        // let cTokenBalance = await cDai.balanceOf(s2.address);
        // await cDai.connect(s2).redeem(cTokenBalance);
  
        // Borrow 100 ETH
        await cEth.connect(s2).borrow(parseUnits("100"));

        for (let i = 0; i < 50; i++) {
            await ethers.provider.send("evm_mine");
        }

        // Verify borrowed balance of S2 with interest if accrued
        borrowBalanceCurrent = await cEth.callStatic.borrowBalanceCurrent(s2.address);
        expect(formatUnits(borrowBalanceCurrent)).to.be.equal("100.000118911708623003");

        const oneThirdRepayment = (borrowBalanceCurrent / 3) / 10**18;
        overrides = { value: parseEther(oneThirdRepayment.toString()) };
        await cEth.connect(s2).borrowRepay(overrides);
  
        borrowBalanceCurrent = await cEth.callStatic.borrowBalanceCurrent(s2.address);
        expect(formatUnits(borrowBalanceCurrent)).to.be.equal("66.666829179434155626");
  
        let totalBorrows = await cEth.totalBorrows();
        expect(formatUnits(totalBorrows)).to.equals("66.6667483193847937");
        
        // ETH balance after borrow repay
        ethBalance = await ethers.provider.getBalance(s2.address);
        expect(parseInt(formatUnits(ethBalance))).to.equals(parseInt("10263.65298205220924691"));
    })
});
  