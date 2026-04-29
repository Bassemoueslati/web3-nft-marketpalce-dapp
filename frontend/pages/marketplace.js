import { useMemo, useState } from "react";
import { ethers } from "ethers";
import { getContractsForChain, SimpleMarketplaceABI } from "../lib/contracts";
import {
  MARKETPLACE_EXTENDED_ABI,
  formatEth,
  parseError,
  toListingModel,
} from "../lib/dapp";
import { getBrowserProvider, useWallet } from "../context/WalletContext";

export default function MarketplacePage() {
  const { account, chainId } = useWallet();
  const addresses = useMemo(() => getContractsForChain(chainId), [chainId]);

  const [tokenId, setTokenId] = useState("");
  const [priceEth, setPriceEth] = useState("0.01");
  const [listingId, setListingId] = useState("1");
  const [listingPreview, setListingPreview] = useState(null);
  const [unsoldListings, setUnsoldListings] = useState([]);
  const [txHash, setTxHash] = useState("");
  const [status, setStatus] = useState("Ready");
  const [isProcessing, setIsProcessing] = useState(false);

  async function ensureSignerAndAddresses() {
    const provider = getBrowserProvider();
    const requestedAccounts = await provider.send("eth_requestAccounts", []);
    if (!requestedAccounts?.[0]) {
      throw new Error("Connecte MetaMask avant transaction.");
    }

    const network = await provider.getNetwork();
    const activeChainId = Number(network.chainId);
    const activeAddresses = getContractsForChain(activeChainId);
    if (!activeAddresses.nftAddress || !activeAddresses.marketplaceAddress) {
      throw new Error("Adresses des contrats manquantes pour cette chain.");
    }

    const signer = await provider.getSigner();
    return { provider, signer, addresses: activeAddresses };
  }

  async function ensureProviderAndAddresses() {
    const provider = getBrowserProvider();
    const network = await provider.getNetwork();
    const activeChainId = Number(network.chainId);
    const activeAddresses = getContractsForChain(activeChainId);
    if (!activeAddresses.marketplaceAddress) {
      throw new Error("Adresse marketplace manquante.");
    }
    return { provider, addresses: activeAddresses };
  }

  async function listNft() {
    if (!tokenId || Number(tokenId) <= 0) {
      setStatus("Token ID invalide.");
      return;
    }
    if (!priceEth || Number(priceEth) <= 0) {
      setStatus("Price invalide.");
      return;
    }

    setIsProcessing(true);
    setTxHash("");
    try {
      const { signer, addresses: activeAddresses } = await ensureSignerAndAddresses();
      const nft = new ethers.Contract(activeAddresses.nftAddress, ["function approve(address to, uint256 tokenId) external"], signer);
      const market = new ethers.Contract(
        activeAddresses.marketplaceAddress,
        SimpleMarketplaceABI,
        signer
      );

      setStatus("Approval NFT en cours...");
      const approveTx = await nft.approve(activeAddresses.marketplaceAddress, Number(tokenId));
      await approveTx.wait();

      setStatus("Listing transaction en cours...");
      const listTx = await market.listItem(
        activeAddresses.nftAddress,
        Number(tokenId),
        ethers.parseEther(priceEth)
      );
      setTxHash(listTx.hash);
      await listTx.wait();

      setStatus(`NFT liste avec succes. Tx: ${listTx.hash}`);
      await loadUnsoldListings();
    } catch (error) {
      setStatus(parseError(error));
    } finally {
      setIsProcessing(false);
    }
  }

  async function buyListing(targetId, targetPriceWei) {
    setIsProcessing(true);
    setTxHash("");
    try {
      const { signer, addresses: activeAddresses } = await ensureSignerAndAddresses();
      const market = new ethers.Contract(
        activeAddresses.marketplaceAddress,
        SimpleMarketplaceABI,
        signer
      );

      const tx = await market.buyItem(Number(targetId), { value: targetPriceWei });
      setTxHash(tx.hash);
      await tx.wait();

      setStatus(`Achat confirme. Tx: ${tx.hash}`);
      await loadUnsoldListings();
      if (String(Number(listingId)) === String(Number(targetId))) {
        await readListing();
      }
    } catch (error) {
      setStatus(parseError(error));
    } finally {
      setIsProcessing(false);
    }
  }

  async function cancelListing(targetId) {
    setIsProcessing(true);
    setTxHash("");
    try {
      const { signer, addresses: activeAddresses } = await ensureSignerAndAddresses();
      const market = new ethers.Contract(
        activeAddresses.marketplaceAddress,
        MARKETPLACE_EXTENDED_ABI,
        signer
      );

      const tx = await market.cancelItem(Number(targetId));
      setTxHash(tx.hash);
      await tx.wait();

      setStatus(`Listing annulee. Tx: ${tx.hash}`);
      await loadUnsoldListings();
      if (String(Number(listingId)) === String(Number(targetId))) {
        await readListing();
      }
    } catch (error) {
      setStatus(parseError(error));
    } finally {
      setIsProcessing(false);
    }
  }

  async function readListing() {
    if (!listingId || Number(listingId) <= 0) {
      setStatus("Listing ID invalide.");
      return;
    }
    try {
      const { provider, addresses: activeAddresses } = await ensureProviderAndAddresses();
      const market = new ethers.Contract(
        activeAddresses.marketplaceAddress,
        MARKETPLACE_EXTENDED_ABI,
        provider
      );
      const raw = await market.getListing(Number(listingId));
      const item = toListingModel(raw);
      setListingPreview(item);
      setStatus("Listing charge.");
    } catch (error) {
      setStatus(parseError(error));
    }
  }

  async function loadUnsoldListings() {
    try {
      const { provider, addresses: activeAddresses } = await ensureProviderAndAddresses();
      const market = new ethers.Contract(
        activeAddresses.marketplaceAddress,
        MARKETPLACE_EXTENDED_ABI,
        provider
      );
      const rawItems = await market.getUnsoldListings();
      setUnsoldListings(rawItems.map((item) => toListingModel(item)));
      setStatus("Market data updated.");
    } catch (error) {
      setStatus(parseError(error));
    }
  }

  return (
    <div className="page">
      <section className="section-header">
        <p className="eyebrow">Marketplace Operations</p>
        <h1>List, buy and manage NFTs with live on-chain data.</h1>
        <p className="hero-text">
          Account: {account || "Not connected"} | Chain: {chainId || "-"} | Marketplace:{" "}
          {addresses.marketplaceAddress || "not configured"}
        </p>
      </section>

      <section className="form-grid">
        <article className="card">
          <h2>List NFT</h2>
          <input
            className="input"
            placeholder="Token ID"
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
          />
          <input
            className="input"
            placeholder="Price (ETH)"
            value={priceEth}
            onChange={(e) => setPriceEth(e.target.value)}
          />
          <button className="button-primary" disabled={isProcessing} onClick={listNft}>
            {isProcessing ? "Processing..." : "Approve + List NFT"}
          </button>
          <p className="mono">Last Tx: {txHash || "-"}</p>
        </article>

        <article className="card">
          <h2>Read Listing by ID</h2>
          <div className="inline-row">
            <input
              className="input"
              placeholder="Listing ID"
              value={listingId}
              onChange={(e) => setListingId(e.target.value)}
            />
            <button className="button-secondary" onClick={readListing}>
              Read
            </button>
          </div>

          {listingPreview ? (
            <div className="listing-preview">
              <p>ID: {listingPreview.id}</p>
              <p>Token: #{listingPreview.tokenId}</p>
              <p>Seller: {listingPreview.seller}</p>
              <p>Price: {formatEth(listingPreview.price)} ETH</p>
              <p>Status: {listingPreview.isSold ? "Sold/Closed" : "Open"}</p>
            </div>
          ) : (
            <p className="muted">No listing loaded yet.</p>
          )}
        </article>
      </section>

      <section className="section">
        <div className="section-row">
          <h2>Unsold Listings</h2>
          <button className="button-secondary" onClick={loadUnsoldListings}>
            Refresh Market
          </button>
        </div>

        {unsoldListings.length === 0 ? (
          <p className="muted">No unsold listings found. Click refresh or create a new listing.</p>
        ) : (
          <div className="listings-grid">
            {unsoldListings.map((item) => {
              const isSeller =
                account && item.seller && account.toLowerCase() === item.seller.toLowerCase();

              return (
                <article key={item.id} className="listing-card">
                  <p className="listing-id">Listing #{item.id}</p>
                  <p>Token #{item.tokenId}</p>
                  <p className="mono small">{item.nftAddress}</p>
                  <p className="mono small">Seller: {item.seller}</p>
                  <p className="price">{formatEth(item.price)} ETH</p>

                  <div className="inline-row">
                    <button
                      className="button-primary"
                      onClick={() => buyListing(item.id, item.price)}
                      disabled={isProcessing || isSeller}
                    >
                      Buy
                    </button>
                    <button
                      className="button-danger"
                      onClick={() => cancelListing(item.id)}
                      disabled={isProcessing || !isSeller}
                    >
                      Cancel
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <p className="status-line">Status: {status}</p>
    </div>
  );
}
