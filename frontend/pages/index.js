import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { getContractsForChain } from "../lib/contracts";
import { MARKETPLACE_EXTENDED_ABI, parseError } from "../lib/dapp";
import { useWallet } from "../context/WalletContext";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export default function DashboardPage() {
  const { account, chainId, connect } = useWallet();
  const [backendHealth, setBackendHealth] = useState("loading");
  const [stats, setStats] = useState({
    totalListings: "-",
    unsoldListings: "-",
  });
  const [status, setStatus] = useState("Ready");

  const addresses = useMemo(() => getContractsForChain(chainId), [chainId]);

  useEffect(() => {
    let isMounted = true;
    const loadBackendHealth = async () => {
      try {
        const res = await fetch(`${backendUrl}/health`);
        if (!res.ok) throw new Error("Backend down");
        const data = await res.json();
        if (isMounted) setBackendHealth(data.status === "ok" ? "online" : "offline");
      } catch {
        if (isMounted) setBackendHealth("offline");
      }
    };
    loadBackendHealth();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadMarketplaceStats = async () => {
      if (!chainId || !addresses.marketplaceAddress || typeof window === "undefined" || !window.ethereum) {
        if (isMounted) {
          setStats({ totalListings: "-", unsoldListings: "-" });
        }
        return;
      }

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const marketplace = new ethers.Contract(
          addresses.marketplaceAddress,
          MARKETPLACE_EXTENDED_ABI,
          provider
        );

        const [totalRaw, unsoldRaw] = await Promise.all([
          marketplace.listingCounter(),
          marketplace.getUnsoldListings(),
        ]);

        if (!isMounted) return;
        setStats({
          totalListings: String(Number(totalRaw)),
          unsoldListings: String(unsoldRaw.length),
        });
      } catch (error) {
        if (!isMounted) return;
        setStats({ totalListings: "-", unsoldListings: "-" });
        setStatus(parseError(error));
      }
    };
    loadMarketplaceStats();

    return () => {
      isMounted = false;
    };
  }, [addresses.marketplaceAddress, chainId]);

  return (
    <div className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">NFT Marketplace Suite</p>
          <h1>Build, mint, list and trade NFTs with a production-ready flow.</h1>
          <p className="hero-text">
            This app includes wallet connection, IPFS upload via Pinata, metadata pinning,
            NFT minting, listing, buying and cancellation in a clean marketplace interface.
          </p>
          <div className="hero-actions">
            <Link href="/create" className="button-primary">
              Create & Mint NFT
            </Link>
            <Link href="/marketplace" className="button-secondary">
              Browse Marketplace
            </Link>
            {!account ? (
              <button className="button-ghost" onClick={connect}>
                Connect Wallet
              </button>
            ) : null}
          </div>
        </div>
        <div className="hero-card">
          <h3>System Status</h3>
          <p>
            Backend:{" "}
            <span className={`status-pill ${backendHealth === "online" ? "ok" : "warn"}`}>
              {backendHealth}
            </span>
          </p>
          <p>Account: {account || "Not connected"}</p>
          <p>Chain: {chainId || "-"}</p>
          <p>NFT contract: {addresses.nftAddress || "not configured"}</p>
          <p>Marketplace: {addresses.marketplaceAddress || "not configured"}</p>
        </div>
      </section>

      <section className="grid-3">
        <article className="stat-card">
          <p className="stat-label">Total Listings</p>
          <p className="stat-value">{stats.totalListings}</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Unsold Listings</p>
          <p className="stat-value">{stats.unsoldListings}</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Backend URL</p>
          <p className="stat-value mono">{backendUrl}</p>
        </article>
      </section>

      <section className="section">
        <h2>Workflow</h2>
        <div className="workflow-grid">
          <article className="workflow-step">
            <h3>1. Upload Asset</h3>
            <p>Send image/media to IPFS through Pinata from the Create page.</p>
          </article>
          <article className="workflow-step">
            <h3>2. Pin Metadata</h3>
            <p>Create metadata JSON and pin it from backend endpoint `/api/pin-json`.</p>
          </article>
          <article className="workflow-step">
            <h3>3. Mint + List + Sell</h3>
            <p>Mint NFT, list item on-chain, then buy/cancel directly from marketplace.</p>
          </article>
        </div>
      </section>

      <p className="status-line">Status: {status}</p>
    </div>
  );
}
