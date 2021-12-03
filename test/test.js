// it("should allow the user to borrow based on the liquidity", async function () {
//     // CDai current exchange rate
//     let exchangeRate = await cDai.callStatic.exchangeRateCurrent(); // +1 Block // PrevBlock = 1, CurrentBlock = 2
//     expect(formatUnits(exchangeRate)).to.be.equals("0.02");

//     // Supply DAI
//     await daiContract.connect(signer).transfer(s1.address, parseUnits("10000"));
//     await daiContract.connect(s1).approve(cDai.address, parseUnits("10000"));
//     await cDai.connect(s1).mint(parseUnits("1000")); // +1 Block  // PrevBlock = 2, CurrentBlock = 3

//     // CDai Contract Total Supply of DAI
//     const cDaiTotalSupply = await daiContract.balanceOf(cDai.address);
//     expect(formatUnits(cDaiTotalSupply)).to.be.equals("1000.0");

//     // Verify User received CDai
//     let cTokenBalance = await cDai.balanceOf(s1.address);
//     expect(formatUnits(cTokenBalance)).to.be.equals("50000.0");

//     // ---------------------------------------------------------------------

//     // Verify borrow, supply and exchange rate before borrow action on CETH
//     exchangeRate = await cEth.callStatic.exchangeRateCurrent(); // +1 Block // PrevBlock = 3, CurrentBlock = 4
//     expect(formatUnits(exchangeRate)).to.be.equals("0.02");
//     let borrowRate = await cEth.getBorrowRate();
//     expect(formatUnits(borrowRate)).to.be.equals("0.02");
//     let supplyRate = await cEth.getSupplyRate();
//     expect(formatUnits(supplyRate)).to.be.equals("0.0");

//     // Verify borrow, supply and exchange rate before borrow action on CDAI
//     exchangeRate = await cDai.callStatic.exchangeRateCurrent(); // CY
//     expect(formatUnits(exchangeRate)).to.be.equals("0.02");
//     borrowRate = await cDai.getBorrowRate();
//     expect(formatUnits(borrowRate)).to.be.equals("0.02");
//     supplyRate = await cDai.getSupplyRate();
//     expect(formatUnits(supplyRate)).to.be.equals("0.0");

//     let cDaibalanceOfUnderlying = await cDai.callStatic.balanceOfUnderlying(
//       s1.address
//     );
//     expect(formatUnits(cDaibalanceOfUnderlying)).to.be.equal("1000.0");

//     // ---------------------------------------------------------------------

//     // Setup Markets
//     await comptroller.addMarket(cEth.address);
//     await comptroller.setCollateralFactor(cEth.address, parseUnits("0.75"));
//     await comptroller.addMarket(cDai.address);

//     // Supply ETH as Collateral
//     const overrides = { value: parseEther("1") };
//     await cEth.connect(s2).mint(overrides); // Once supplied as Collateral this cannot be redeemed // +1 Block // PrevBlock = 4, CurrentBlock = 5

//     cTokenBalance = await cEth.balanceOf(s2.address);
//     expect(formatUnits(cTokenBalance)).to.be.equals("50.0");

//     // Enter Market - Supplying ETH as Collateral
//     let markets = [cEth.address];
//     await comptroller.connect(s2).enterMarket(markets); // entering a market without supplying anything ?

//     // ---------------------------------------------------------------------

//     // Verify borrow, supply and exchange rate before borrow action on CETH
//     exchangeRate = await cEth.callStatic.exchangeRateCurrent(); // +1 Block // PrevBlock = 5, CurrentBlock = 6 // EY
//     expect(formatUnits(exchangeRate)).to.be.equals("0.02");
//     borrowRate = await cEth.getBorrowRate();
//     expect(formatUnits(borrowRate)).to.be.equals("0.02");
//     supplyRate = await cEth.getSupplyRate();
//     expect(formatUnits(supplyRate)).to.be.equals("0.0");

//     // Verify borrow, supply and exchange rate before borrow action on CDAI
//     exchangeRate = await cDai.callStatic.exchangeRateCurrent(); // CY
//     expect(formatUnits(exchangeRate)).to.be.equals("0.02");
//     borrowRate = await cDai.getBorrowRate();
//     expect(formatUnits(borrowRate)).to.be.equals("0.02");
//     supplyRate = await cDai.getSupplyRate();
//     expect(formatUnits(supplyRate)).to.be.equals("0.0");

//     cDaibalanceOfUnderlying = await cDai.callStatic.balanceOfUnderlying(
//       s1.address
//     );
//     expect(formatUnits(cDaibalanceOfUnderlying)).to.be.equal("1000.0");

//     let cEthbalanceOfUnderlying = await cEth.callStatic.balanceOfUnderlying(
//       s2.address
//     );
//     expect(formatUnits(cEthbalanceOfUnderlying)).to.be.equal("1.0");

//     // ---------------------------------------------------------------------

//     // DAI balance before borrow
//     daiBalance = await daiContract.balanceOf(s2.address);
//     expect(formatUnits(daiBalance)).to.equals("0.0");

//     await cDai.connect(s2).borrow(parseUnits("100")); // Borrow more than the available liquidity // +1 Block // PrevBlock = 7, CurrentBlock = 8

//     // DAI balance after borrow
//     daiBalance = await daiContract.balanceOf(s2.address);
//     expect(formatUnits(daiBalance)).to.equals("100.0");

//     // ---------------------------------------------------------------------

//     // Verify borrow, supply and exchange rate before borrow action on CETH
//     exchangeRate = await cEth.callStatic.exchangeRateCurrent(); // +1 Block // PrevBlock = 8, CurrentBlock = 9 // EY
//     expect(formatUnits(exchangeRate)).to.be.equals("0.02");
//     borrowRate = await cEth.getBorrowRate();
//     expect(formatUnits(borrowRate)).to.be.equals("0.02");
//     supplyRate = await cEth.getSupplyRate();
//     expect(formatUnits(supplyRate)).to.be.equals("0.0");

//     // Verify borrow, supply and exchange rate before borrow action on CDAI
//     exchangeRate = await cDai.callStatic.exchangeRateCurrent(); // CY
//     expect(formatUnits(exchangeRate)).to.be.equals("0.02");
//     borrowRate = await cDai.getBorrowRate();
//     expect(formatUnits(borrowRate)).to.be.equals("0.05");
//     supplyRate = await cDai.getSupplyRate();
//     expect(formatUnits(supplyRate)).to.be.equals("0.004");

//     cDaibalanceOfUnderlying = await cDai.callStatic.balanceOfUnderlying(
//       s1.address
//     );
//     expect(formatUnits(cDaibalanceOfUnderlying)).to.be.equal("1000.0");

//     cEthbalanceOfUnderlying = await cEth.callStatic.balanceOfUnderlying(
//       s2.address
//     );
//     expect(formatUnits(cEthbalanceOfUnderlying)).to.be.equal("1.0");

//     // ---------------------------------------------------------------------

//     // Verify borrowed balance with interest if accrued
//     let borrowBalanceStored = await cDai.callStatic.borrowBalanceStored(
//       s2.address
//     );
//     expect(formatUnits(borrowBalanceStored)).to.be.equal("100.0");

//     // DAI balance before borrow
//     daiBalance = await daiContract.balanceOf(s2.address);
//     expect(formatUnits(daiBalance)).to.equals("100.0");

//     await cDai.connect(s2).borrow(parseUnits("100")); // TODO: Borrow more than the available liquidity // +1 Block // PrevBlock = 9, CurrentBlock = 10

//     // DAI balance after borrow
//     daiBalance = await daiContract.balanceOf(s2.address);
//     expect(formatUnits(daiBalance)).to.equals("200.0");

//     // ---------------------------------------------------------------------

//     // Verify borrow, supply and exchange rate before borrow action on CETH
//     exchangeRate = await cEth.callStatic.exchangeRateCurrent(); // +1 Block // PrevBlock = 8, CurrentBlock = 9 // EY
//     expect(formatUnits(exchangeRate)).to.be.equals("0.02");
//     borrowRate = await cEth.getBorrowRate();
//     expect(formatUnits(borrowRate)).to.be.equals("0.02");
//     supplyRate = await cEth.getSupplyRate();
//     expect(formatUnits(supplyRate)).to.be.equals("0.0");

//     // Verify borrow, supply and exchange rate before borrow action on CDAI
//     exchangeRate = await cDai.callStatic.exchangeRateCurrent(); // CY
//     expect(formatUnits(exchangeRate)).to.be.equals("0.020000000047564687");
//     borrowRate = await cDai.getBorrowRate();
//     expect(formatUnits(borrowRate)).to.be.equals("0.080000000570776254");
//     supplyRate = await cDai.getSupplyRate();
//     expect(formatUnits(supplyRate)).to.be.equals("0.012800000213089802");

//     cDaibalanceOfUnderlying = await cDai.callStatic.balanceOfUnderlying(
//       s1.address
//     );
//     expect(formatUnits(cDaibalanceOfUnderlying)).to.be.equal(
//       "1000.00000237823435"
//     );

//     cEthbalanceOfUnderlying = await cEth.callStatic.balanceOfUnderlying(
//       s2.address
//     );
//     expect(formatUnits(cEthbalanceOfUnderlying)).to.be.equal("1.0");

//     // ---------------------------------------------------------------------

//     // Verify borrowed balance with interest if accrued
//     borrowBalanceStored = await cDai.callStatic.borrowBalanceStored(s2.address);
//     expect(formatUnits(borrowBalanceStored)).to.be.equal(
//       "224.999999999211599999"
//     );

//     // await cDai.connect(s1).redeem(parseUnits("100"));
//   });