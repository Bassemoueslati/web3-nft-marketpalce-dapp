import { ethers } from "ethers";
import { SimpleMarketplaceABI, SimpleNFTABI } from "./contracts";

export const MARKETPLACE_EXTENDED_ABI = [
  ...SimpleMarketplaceABI,
  "function cancelItem(uint256 listingId) external",
  "function getListing(uint256 listingId) view returns ((uint256 id,address nftAddress,uint256 tokenId,address seller,uint256 price,bool isSold))",
  "function getUnsoldListings() view returns ((uint256 id,address nftAddress,uint256 tokenId,address seller,uint256 price,bool isSold)[])",
  "function listingCounter() view returns (uint256)",
];

export const NFT_EXTENDED_ABI = [
  ...SimpleNFTABI,
  "function tokenIdCounter() view returns (uint256)",
];

export function shortenAddress(address) {
  if (!address) return "-";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatEth(value) {
  try {
    return Number(ethers.formatEther(value)).toFixed(4);
  } catch {
    return "0.0000";
  }
}

export function parseError(error) {
  return (
    error?.shortMessage ||
    error?.reason ||
    error?.message ||
    "Transaction failed"
  );
}

export function toListingModel(raw) {
  return {
    id: Number(raw?.id ?? raw?.[0] ?? 0),
    nftAddress: raw?.nftAddress ?? raw?.[1] ?? "",
    tokenId: Number(raw?.tokenId ?? raw?.[2] ?? 0),
    seller: raw?.seller ?? raw?.[3] ?? "",
    price: raw?.price ?? raw?.[4] ?? 0n,
    isSold: Boolean(raw?.isSold ?? raw?.[5] ?? false),
  };
}

export function ipfsToGateway(uri) {
  if (!uri) return "";
  if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;
  if (uri.startsWith("ipfs://")) {
    return `https://gateway.pinata.cloud/ipfs/${uri.replace("ipfs://", "")}`;
  }
  return "";
}
