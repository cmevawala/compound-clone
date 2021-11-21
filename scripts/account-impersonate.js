const DaiABI = require("../abi/DaiABI.json")
const { ethers } = require("hardhat");
const hre = require("hardhat");

const daiAddress = "0x6b175474e89094c44da98b954eedeac495271d0f";

async function main() {

    const accountToInpersonate = "0x6F6C07d80D0D433ca389D336e6D1feBEA2489264";
    const accountToFund = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [accountToInpersonate],
    });

    const signer = await ethers.getSigner(accountToInpersonate);

    const daiContract = new ethers.Contract(daiAddress, DaiABI, signer);
    const daiBalance = await daiContract.balanceOf(accountToInpersonate);
    console.log("whale dai balance", daiBalance / 1e18)

    console.log("transfering to", accountToFund)

    await daiContract.connect(signer).transfer(accountToFund, daiBalance)
    const accountBalance = await daiContract.balanceOf(accountToFund)
  
    console.log("transfer complete")
    console.log("funded account balance", accountBalance / 1e18)
  
    const whaleBalanceAfter = await daiContract.balanceOf(accountToInpersonate)
    console.log("whale dai balance after", whaleBalanceAfter / 1e18)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });