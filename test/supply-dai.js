const { ethers } = require("hardhat");
const { formatUnits, parseUnits } = require("ethers/lib/utils");
const { expect } = require("chai");

const DaiABI = require("../abi/DaiABI.json");

describe("Supply DAI", function () {
    let CDaiContract, cDai;
    let owner, s1, s2, s3, s4, s5;
    let daiContract, signer, daiBalance;
    let ComptrollerContract, comptroller;

    const daiAddress = "0x6b175474e89094c44da98b954eedeac495271d0f";
    const accountToInpersonate = "0x6F6C07d80D0D433ca389D336e6D1feBEA2489264";

    beforeEach(async function () {
        ComptrollerContract = await ethers.getContractFactory("Comptroller");
        comptroller = await ComptrollerContract.deploy();

        // Get the ContractFactory and Signers here.
        [owner, s1, s2, s3, s4, s5] = await ethers.getSigners();
        CDaiContract = await ethers.getContractFactory("CDai");
        cDai = await CDaiContract.deploy(daiAddress, parseUnits("0.020000"), comptroller.address);

        // Account Impersonate to get DAI
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [accountToInpersonate],
        });

        signer = await ethers.getSigner(accountToInpersonate);
        daiContract = new ethers.Contract(daiAddress, DaiABI, signer);
        // const daiBalance = await daiContract.balanceOf(accountToInpersonate);
    });

    it("should mint CDAI on supply of DAI", async function () {

        await daiContract.connect(signer).transfer(s1.address, parseUnits("10000"));
        daiBalance = await daiContract.balanceOf(s1.address);
        expect(formatUnits(daiBalance)).to.be.equals("37000.0"); // DAI Balance - S1

        // Supply DAI
        await daiContract.connect(s1).approve(cDai.address, parseUnits("100"));
        await cDai.connect(s1).mint(parseUnits("1"));

        daiBalance = await daiContract.balanceOf(s1.address);
        expect(formatUnits(daiBalance)).to.be.equals("36999.0");

        const cTokenBalance = await cDai.balanceOf(s1.address);
        expect(formatUnits(cTokenBalance)).to.be.equals("50.0");

        daiBalance = await daiContract.balanceOf(cDai.address);
        expect(formatUnits(daiBalance)).to.be.equals("1.0"); // CDAI Balance
    });

    it("should display the current exchange rate", async function () {
        const exchangeRate = formatUnits(await cDai.exchangeRateStored());

        // eslint-disable-next-line no-unused-expressions
        expect(exchangeRate).not.to.be.undefined;
    });

    it("should allow the user to redeem the CDAI", async function () {

        // Transfer DAI
        // await daiContract.connect(signer).transfer(s1.address, parseUnits("10000"));

        // Supply DAI
        await daiContract.connect(s1).approve(cDai.address, parseUnits("100"));
        await cDai.connect(s1).mint(parseUnits("1"));
        let cTokenBalance = await cDai.balanceOf(s1.address);

        await cDai.connect(s1).redeem(parseUnits("50"));
        cTokenBalance = await cDai.balanceOf(s1.address);
        expect(formatUnits(cTokenBalance)).to.be.equals("0.0");

        daiBalance = await daiContract.balanceOf(s1.address);
        expect(formatUnits(daiBalance)).to.be.equals("36999.0");

        daiBalance = await daiContract.balanceOf(cDai.address);
        expect(formatUnits(daiBalance)).to.be.equals("0.0");
    });
});
