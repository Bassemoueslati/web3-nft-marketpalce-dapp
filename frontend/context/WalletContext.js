import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";

const WalletContext = createContext(null);

function safeParseChainId(chainHex) {
  if (!chainHex) return 0;
  return Number.parseInt(chainHex, 16);
}

export function getBrowserProvider() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask non trouve");
  }
  return new ethers.BrowserProvider(window.ethereum);
}

export function WalletProvider({ children }) {
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasMetaMask, setHasMetaMask] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const { ethereum } = window;
    if (!ethereum || !ethereum.isMetaMask) {
      setHasMetaMask(false);
      return;
    }

    setHasMetaMask(true);

    const syncWalletState = async () => {
      try {
        const accounts = await ethereum.request({ method: "eth_accounts" });
        const chainHex = await ethereum.request({ method: "eth_chainId" });
        setAccount(accounts?.[0] || "");
        setChainId(safeParseChainId(chainHex));
      } catch {
        setAccount("");
        setChainId(0);
      }
    };

    const onAccountsChanged = (accounts) => {
      setAccount(accounts?.[0] || "");
    };

    const onChainChanged = (chainHex) => {
      setChainId(safeParseChainId(chainHex));
    };

    syncWalletState();
    ethereum.on?.("accountsChanged", onAccountsChanged);
    ethereum.on?.("chainChanged", onChainChanged);

    return () => {
      ethereum.removeListener?.("accountsChanged", onAccountsChanged);
      ethereum.removeListener?.("chainChanged", onChainChanged);
    };
  }, []);

  const connect = async () => {
    if (typeof window === "undefined") return;

    const { ethereum } = window;
    if (!ethereum || !ethereum.isMetaMask) {
      window.open("https://metamask.io/download/", "_blank", "noopener,noreferrer");
      return;
    }

    setIsConnecting(true);
    try {
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      const chainHex = await ethereum.request({ method: "eth_chainId" });
      setAccount(accounts?.[0] || "");
      setChainId(safeParseChainId(chainHex));
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAccount("");
  };

  const value = useMemo(
    () => ({
      account,
      chainId,
      isConnecting,
      hasMetaMask,
      connect,
      disconnect,
    }),
    [account, chainId, hasMetaMask, isConnecting]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet doit etre utilise dans WalletProvider");
  }
  return context;
}
