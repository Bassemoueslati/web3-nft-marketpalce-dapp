import fs from "fs";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const sample = {
    name: "Starter NFT",
    description: "Simple metadata for junior demo",
    image: "ipfs://REPLACE_WITH_IMAGE_CID",
  };

  const outPath = "./sample-metadata.json";
  fs.writeFileSync(outPath, JSON.stringify(sample, null, 2));
  console.log("sample-metadata.json created.");

  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    console.log("PINATA_JWT absent. Upload manual sur Pinata/NFT.Storage/Web3.Storage.");
    return;
  }

  const data = JSON.parse(fs.readFileSync(outPath, "utf8"));
  const pinataRes = await axios.post(
    "https://api.pinata.cloud/pinning/pinJSONToIPFS",
    data,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
    }
  );

  const cid = pinataRes.data?.IpfsHash;
  console.log("Pinned on IPFS:", `ipfs://${cid}`);
}

main().catch((error) => {
  console.error("uploadMetadata failed:", error?.response?.data || error.message);
  process.exit(1);
});
