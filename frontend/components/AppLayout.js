import Link from "next/link";
import { useRouter } from "next/router";
import { shortenAddress } from "../lib/dapp";
import { useWallet } from "../context/WalletContext";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/create", label: "Create NFT" },
  { href: "/marketplace", label: "Marketplace" },
];

export default function AppLayout({ children }) {
  const router = useRouter();
  const { account, chainId, connect, isConnecting, hasMetaMask } = useWallet();

  return (
    <div className="app-root">
      <header className="topbar">
        <div className="brand-wrap">
          <span className="brand-badge">W3</span>
          <div>
            <p className="brand-title">NexaNFT Market</p>
            <p className="brand-subtitle">Professional Web3 NFT Marketplace</p>
          </div>
        </div>

        <nav className="nav-links" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${router.pathname === item.href ? "active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="wallet-wrap">
          {chainId ? <span className="chain-chip">Chain {chainId}</span> : null}
          <button className="wallet-btn" onClick={connect} disabled={isConnecting}>
            {account
              ? shortenAddress(account)
              : isConnecting
                ? "Connexion..."
                : hasMetaMask
                  ? "Connect Wallet"
                  : "Install MetaMask"}
          </button>
        </div>
      </header>

      <main className="page-content">{children}</main>
    </div>
  );
}
