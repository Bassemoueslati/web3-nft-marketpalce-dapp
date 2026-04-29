import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
import multer from "multer";

dotenv.config();

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "web3-backend" });
});

app.post("/api/pin-json", async (req, res) => {
  try {
    const metadata = req.body || {};
    const jwt = process.env.PINATA_JWT;

    if (!jwt) {
      const fakeCid =
        "bafy" +
        Buffer.from(JSON.stringify(metadata))
          .toString("hex")
          .slice(0, 20);

      return res.json({
        mode: "demo",
        message: "PINATA_JWT absent, fallback local demo",
        cid: fakeCid,
        ipfsUri: `ipfs://${fakeCid}`,
      });
    }

    const pinataRes = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      metadata,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
      }
    );

    const cid = pinataRes.data?.IpfsHash;

    return res.json({
      mode: "pinata",
      cid,
      ipfsUri: `ipfs://${cid}`,
      raw: pinataRes.data,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Pin JSON failed",
      details: error?.response?.data || error.message,
    });
  }
});

app.post("/api/pin-file", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier recu. Utilise le champ 'file'." });
    }

    const jwt = process.env.PINATA_JWT;
    const fileName = req.file.originalname || "upload.bin";

    if (!jwt) {
      const fakeCid =
        "bafy" +
        Buffer.from(`${fileName}:${req.file.size}`)
          .toString("hex")
          .slice(0, 20);

      return res.json({
        mode: "demo",
        message: "PINATA_JWT absent, fallback local demo",
        cid: fakeCid,
        ipfsUri: `ipfs://${fakeCid}`,
        gatewayUrl: `https://gateway.pinata.cloud/ipfs/${fakeCid}`,
        fileName,
        mimetype: req.file.mimetype,
        size: req.file.size,
      });
    }

    const formData = new FormData();
    const blob = new Blob([req.file.buffer], {
      type: req.file.mimetype || "application/octet-stream",
    });

    formData.append("file", blob, fileName);
    formData.append("pinataMetadata", JSON.stringify({ name: fileName }));
    formData.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

    const pinataRes = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      body: formData,
    });

    const pinataData = await pinataRes.json().catch(() => ({}));
    if (!pinataRes.ok) {
      return res.status(500).json({
        error: "Pin file failed",
        details: pinataData || `Pinata HTTP ${pinataRes.status}`,
      });
    }

    const cid = pinataData?.IpfsHash;
    return res.json({
      mode: "pinata",
      cid,
      ipfsUri: `ipfs://${cid}`,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${cid}`,
      fileName,
      mimetype: req.file.mimetype,
      size: req.file.size,
      raw: pinataData,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Pin file failed",
      details: error?.response?.data || error.message,
    });
  }
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
