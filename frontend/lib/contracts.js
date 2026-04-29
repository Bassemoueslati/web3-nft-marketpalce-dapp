import SimpleNFTABI from "./abis/SimpleNFT.json";
import SimpleMarketplaceABI from "./abis/SimpleMarketplace.json";
import deployedAddresses from "./deployed-addresses.json";

export function getContractsForChain(chainId) {
  const byChain = deployedAddresses?.[String(chainId)] || null;

  const nftAddress = byChain?.nftAddress || process.env.NEXT_PUBLIC_NFT_ADDRESS || "";
  const marketplaceAddress =
    byChain?.marketplaceAddress || process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || "";

  return {
    nftAddress,
    marketplaceAddress,
  };
}

export { SimpleNFTABI, SimpleMarketplaceABI };
