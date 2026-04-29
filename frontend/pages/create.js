import { useMemo, useState } from "react";
import { ethers } from "ethers";
import { getContractsForChain } from "../lib/contracts";
import { NFT_EXTENDED_ABI, parseError } from "../lib/dapp";
import { getBrowserProvider, useWallet } from "../context/WalletContext";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export default function CreatePage() {
  const { account, chainId } = useWallet();
  const addresses = useMemo(() => getContractsForChain(chainId), [chainId]);

  const [selectedFile, setSelectedFile] = useState(null);
  const [fileIpfsUri, setFileIpfsUri] = useState("");
  const [fileGatewayUrl, setFileGatewayUrl] = useState("");
  const [uploadTxHash, setUploadTxHash] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const [metaName, setMetaName] = useState("Nexa Genesis NFT");
  const [metaDescription, setMetaDescription] = useState("Premium digital collectible");
  const [metaImageUri, setMetaImageUri] = useState("ipfs://QmImageCID");
  const [tokenURI, setTokenURI] = useState("ipfs://QmMetadataCID");
  const [isPinning, setIsPinning] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [mintTxHash, setMintTxHash] = useState("");
  const [mintedTokenId, setMintedTokenId] = useState("");
  const [status, setStatus] = useState("Ready");

  async function ensureSigner() {
    const provider = getBrowserProvider();
    const accounts = await provider.send("eth_requestAccounts", []);
    if (!accounts?.[0]) {
      throw new Error("Connecte MetaMask avant de continuer.");
    }
    const network = await provider.getNetwork();
    const activeChainId = Number(network.chainId);
    const activeAddresses = getContractsForChain(activeChainId);
    if (!activeAddresses.nftAddress) {
      throw new Error("Adresse NFT manquante sur ce network.");
    }

    const signer = await provider.getSigner();
    return {
      provider,
      signer,
      address: accounts[0],
      chainId: activeChainId,
      addresses: activeAddresses,
    };
  }

  async function uploadFileToIpfs() {
    if (!selectedFile) {
      setStatus("Choisis un fichier avant upload.");
      return;
    }

    setIsUploading(true);
    setUploadTxHash("");
    try {
      const { signer } = await ensureSigner();

      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch(`${backendUrl}/api/pin-file`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.details?.error || data?.error || "Upload file failed");
      }

      const cid = data.cid || data?.ipfsUri?.replace("ipfs://", "");
      if (!cid) {
        throw new Error("CID IPFS manquant apres upload.");
      }

      setFileIpfsUri(data.ipfsUri || "");
      setFileGatewayUrl(data.gatewayUrl || "");
      setMetaImageUri(data.ipfsUri || "");

      // Tx de trace visible dans MetaMask et on-chain activity.
      const txData = ethers.hexlify(ethers.toUtf8Bytes(`IPFS_UPLOAD:${cid}`));
      const signerAddress = await signer.getAddress();
      const tx = await signer.sendTransaction({
        to: signerAddress,
        value: 0n,
        data: txData,
      });
      setUploadTxHash(tx.hash);
      await tx.wait();

      setStatus(`Upload IPFS confirme. Tx: ${tx.hash}`);
    } catch (error) {
      setStatus(parseError(error));
    } finally {
      setIsUploading(false);
    }
  }

  async function pinMetadata() {
    setIsPinning(true);
    try {
      const payload = {
        name: metaName,
        description: metaDescription,
        image: metaImageUri,
      };
      const res = await fetch(`${backendUrl}/api/pin-json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.details?.error || data?.error || "Pin metadata failed");
      }

      if (data.ipfsUri) {
        setTokenURI(data.ipfsUri);
      }
      setStatus(`Metadata pinned: ${data.ipfsUri || "ok"}`);
    } catch (error) {
      setStatus(parseError(error));
    } finally {
      setIsPinning(false);
    }
  }

  async function mintNft() {
    if (!tokenURI) {
      setStatus("Token URI requise.");
      return;
    }

    setIsMinting(true);
    setMintTxHash("");
    setMintedTokenId("");
    try {
      const { signer, addresses } = await ensureSigner();
      const nft = new ethers.Contract(addresses.nftAddress, NFT_EXTENDED_ABI, signer);

      const tx = await nft.mintToken(await signer.getAddress(), tokenURI);
      setMintTxHash(tx.hash);
      await tx.wait();

      try {
        const latestTokenId = await nft.tokenIdCounter();
        setMintedTokenId(String(Number(latestTokenId)));
      } catch {
        setMintedTokenId("-");
      }

      setStatus(`NFT mint avec succes. Tx: ${tx.hash}`);
    } catch (error) {
      setStatus(parseError(error));
    } finally {
      setIsMinting(false);
    }
  }

  return (
    <div className="page">
      <section className="section-header">
        <p className="eyebrow">Create NFT</p>
        <h1>From file to minted token in one guided flow.</h1>
        <p className="hero-text">
          Account: {account || "Not connected"} | Chain: {chainId || "-"} | NFT contract:{" "}
          {addresses.nftAddress || "not configured"}
        </p>
      </section>

      <section className="form-grid">
        <article className="card">
          <h2>Step 1. Upload File to IPFS</h2>
          <input
            className="input"
            type="file"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          />
          <button className="button-primary" onClick={uploadFileToIpfs} disabled={!selectedFile || isUploading}>
            {isUploading ? "Uploading..." : "Upload + MetaMask Trace"}
          </button>
          <p>Selected file: {selectedFile?.name || "-"}</p>
          <p className="mono">IPFS URI: {fileIpfsUri || "-"}</p>
          <p className="mono">Gateway: {fileGatewayUrl || "-"}</p>
          <p className="mono">Trace Tx: {uploadTxHash || "-"}</p>
        </article>

        <article className="card">
          <h2>Step 2. Pin Metadata JSON</h2>
          <input
            className="input"
            value={metaName}
            onChange={(e) => setMetaName(e.target.value)}
            placeholder="NFT name"
          />
          <textarea
            className="textarea"
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            placeholder="Description"
          />
          <input
            className="input"
            value={metaImageUri}
            onChange={(e) => setMetaImageUri(e.target.value)}
            placeholder="ipfs://image-cid"
          />
          <button className="button-secondary" onClick={pinMetadata} disabled={isPinning}>
            {isPinning ? "Pinning..." : "Pin Metadata"}
          </button>
          <input
            className="input"
            value={tokenURI}
            onChange={(e) => setTokenURI(e.target.value)}
            placeholder="ipfs://metadata-cid"
          />
        </article>

        <article className="card">
          <h2>Step 3. Mint NFT On-chain</h2>
          <p className="muted">Token URI sera utilisee pendant le mint.</p>
          <button className="button-primary" onClick={mintNft} disabled={isMinting || !tokenURI}>
            {isMinting ? "Minting..." : "Mint NFT"}
          </button>
          <p className="mono">Mint Tx: {mintTxHash || "-"}</p>
          <p>Last Minted Token ID: {mintedTokenId || "-"}</p>
        </article>
      </section>

      <p className="status-line">Status: {status}</p>
    </div>
  );
}
