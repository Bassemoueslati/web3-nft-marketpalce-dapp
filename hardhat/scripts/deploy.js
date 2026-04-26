const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function writeJSON(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const networkName = hre.network.name;
  const network = await hre.ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  console.log("Deploying contracts with:", deployer.address);
  console.log("Network:", networkName, "chainId:", chainId);

  const NFT = await hre.ethers.getContractFactory("SimpleNFT");
  const nft = await NFT.deploy();
  await nft.waitForDeployment();

  const Marketplace = await hre.ethers.getContractFactory("SimpleMarketplace");
  const marketplace = await Marketplace.deploy();
  await marketplace.waitForDeployment();

  const nftAddress = await nft.getAddress();
  const marketplaceAddress = await marketplace.getAddress();

  console.log("SimpleNFT deployed to:", nftAddress);
  console.log("SimpleMarketplace deployed to:", marketplaceAddress);

  const deployment = {
    network: networkName,
    chainId,
    nftAddress,
    marketplaceAddress,
    deployedAt: new Date().toISOString(),
  };

  const hardhatRoot = path.resolve(__dirname, "..");
  await writeJSON(path.join(hardhatRoot, "deployments", `${networkName}.json`), deployment);

  const frontendRoot = path.resolve(hardhatRoot, "..", "frontend");
  if (fs.existsSync(frontendRoot)) {
    const nftArtifactPath = path.join(
      hardhatRoot,
      "artifacts",
      "contracts",
      "SimpleNFT.sol",
      "SimpleNFT.json"
    );
    const marketArtifactPath = path.join(
      hardhatRoot,
      "artifacts",
      "contracts",
      "SimpleMarketplace.sol",
      "SimpleMarketplace.json"
    );

    const nftArtifact = JSON.parse(fs.readFileSync(nftArtifactPath, "utf8"));
    const marketArtifact = JSON.parse(fs.readFileSync(marketArtifactPath, "utf8"));

    const addressesPath = path.join(frontendRoot, "lib", "deployed-addresses.json");
    let addresses = {};
    if (fs.existsSync(addressesPath)) {
      addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
    }

    addresses[String(chainId)] = {
      network: networkName,
      nftAddress,
      marketplaceAddress,
    };

    await writeJSON(addressesPath, addresses);
    await writeJSON(path.join(frontendRoot, "lib", "abis", "SimpleNFT.json"), nftArtifact.abi);
    await writeJSON(
      path.join(frontendRoot, "lib", "abis", "SimpleMarketplace.json"),
      marketArtifact.abi
    );

    console.log("Frontend addresses + ABI updated.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
