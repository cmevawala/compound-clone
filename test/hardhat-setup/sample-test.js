// const { ethers } = require("hardhat");
// const IERC20Json = require("../../artifacts/contracts/hardhat-setup/IERC20.sol/IERC20.json");
// const { formatEther } = require("ethers/lib/utils");

// // describe("Greeter", function () {
// //   it("Should return the new greeting once it's changed", async function () {
// //     const Greeter = await ethers.getContractFactory("Greeter");
// //     const greeter = await Greeter.deploy("Hello, world!");
// //     await greeter.deployed();
// //     expect(await greeter.greet()).to.equal("Hello, world!");
// //     const setGreetingTx = await greeter.setGreeting("Hola, mundo!");
// //     // wait until the transaction is mined
// //     await setGreetingTx.wait();
// //     expect(await greeter.greet()).to.equal("Hola, mundo!");
// //   });
// // });

// describe("IERC20", function () {
//   const DAI = "0x6b175474e89094c44da98b954eedeac495271d0f";
//   const DAI_WHALE = "0x28c6c06298d514db089934071355e5743bf21d60";

//   it("Should get the DAI balance", async function () {
//     const [owner] = await ethers.getSigners();

//     const erc20Contract = new ethers.Contract(DAI, IERC20Json.abi, owner);

//     // console.log(formatEther(await erc20Contract.balanceOf(DAI_WHALE)));
//   });
// });
