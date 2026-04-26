const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SimpleNFT + SimpleMarketplace", function () {
  it("mints, lists and buys an NFT", async function () {
    const [seller, buyer] = await ethers.getSigners();

    const NFT = await ethers.getContractFactory("SimpleNFT");
    const nft = await NFT.deploy();
    await nft.waitForDeployment();

    const Marketplace = await ethers.getContractFactory("SimpleMarketplace");
    const market = await Marketplace.deploy();
    await market.waitForDeployment();

    await nft.connect(seller).mintToken(seller.address, "ipfs://sample-metadata");
    await nft.connect(seller).approve(await market.getAddress(), 1);

    const price = ethers.parseEther("0.1");
    await market.connect(seller).listItem(await nft.getAddress(), 1, price);
    await market.connect(buyer).buyItem(1, { value: price });

    expect(await nft.ownerOf(1)).to.equal(buyer.address);
  });
});
