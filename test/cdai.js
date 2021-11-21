const { ethers } = require("hardhat");
const { formatEther, parseEther, formatUnits } = require("ethers/lib/utils");

const DaiABI = require("../abi/DaiABI.json")

describe.only("CDAI Tests", function () {
    let CDaiContract, cDai;
    let owner, s1, s2, s3, s4, s5;
    let daiAddress = "0x6b175474e89094c44da98b954eedeac495271d0f";

    beforeEach(async function () {
        // Get the ContractFactory and Signers here.
        [owner, s1, s2, s3, s4, s5] = await ethers.getSigners();
        CDaiContract = await ethers.getContractFactory("CDai");

        cDai = await CDaiContract.deploy(parseEther("0.020000"));
    });

    it("should mint CDAI on supply of DAI", async function () {

        const accountToInpersonate = "0x6F6C07d80D0D433ca389D336e6D1feBEA2489264";
    
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [accountToInpersonate],
        });
    
        const signer = await ethers.getSigner(accountToInpersonate);
        const daiContract = new ethers.Contract(daiAddress, DaiABI, signer);
        const daiBalance = await daiContract.balanceOf(accountToInpersonate);
        console.log(formatEther(daiBalance));

        await daiContract.connect(signer).transfer(owner.address, daiBalance);
        const accountBalance = await daiContract.balanceOf(owner.address);
        console.log(formatEther(accountBalance));
      
    });

    //   it("should display the current exchange rate", async function () {
    //     const exchangeRate = formatEther(await cDai.exchangeRateStored());

    //     // eslint-disable-next-line no-unused-expressions
    //     expect(exchangeRate).not.to.be.undefined;
    //   });

    //   it("should allow the user to redeem the CDAI", async function () {

    //     const overrides = { value: parseEther("1") };
    //     await cDai.connect(s1).mint(overrides);

    //     // console.log("DAI before Redeeming CDAI: " + formatEther(await s1.getBalance()));

    //     let cTokenBalance = await cDai.balanceOf(s1.address);
    //     await cDai.connect(s1).redeem(cTokenBalance);

    //     expect(
    //       formatEther(await ethers.provider.getBalance(cDai.address))
    //     ).to.be.equals("0.0");

    //     cTokenBalance = await cDai.balanceOf(s1.address);
    //     expect(formatEther(cTokenBalance)).to.be.equals("0.0");

    //     // console.log("DAI after Redeeming CDAI: "  + formatEther(await s1.getBalance()));
    //   });

    //   it("should display the underlying balance of CDAI", async function () {

    //     const overrides = { value: parseEther("1") };

    //     let suppliers = [s1, s2, s3];

    //     await cDai.connect(s1).mint(overrides);
    //     await cDai.connect(s2).mint(overrides);
    //     await cDai.connect(s3).mint(overrides);

    //     // console.log("DAI before Redeeming CDAI: " + formatEther(await s1.getBalance()));

    //     const balanceUnderlying = await cDai.callStatic.balanceOfUnderlying(s1.address);
    //   });

});
