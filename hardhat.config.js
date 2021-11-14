require("dotenv").config();

require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
require("hardhat-gas-reporter");
require("solidity-coverage");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

task("faucet", "Sends ETH and tokens to an address", async () => {
  const [sender] = await hre.ethers.getSigners();
  const receiver = "0xfEEC97FAD402bFaCBD36098ea2cB829CC7Cf2944";

  const tx2 = await sender.sendTransaction({
    to: receiver,
    value: hre.ethers.constants.WeiPerEther,
  });
  await tx2.wait();

  console.log(`Transferred 1 ETH to ${receiver}`);
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.4",
  networks: {
    ropsten: {
      url: process.env.ROPSTEN_URL || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "INR",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
