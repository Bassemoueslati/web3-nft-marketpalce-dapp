# Web3 NFT Marketplace Starter

Projet Web3 complet et simple pour junior avec Hardhat v2.

## Architecture
Frontend (Next.js)
-> Wallet (MetaMask)
-> Backend (Node.js - optionnel)
-> Blockchain (Ethereum / Polygon)
-> Smart Contracts (NFT + Marketplace)
-> Storage (IPFS)

## Structure
- `hardhat/`: smart contracts + tests + scripts de deploiement
- `frontend/`: app Next.js (MetaMask + mint/list/buy)
- `backend/`: API optionnelle pour pin metadata sur IPFS (Pinata)
- `ipfs/`: utilitaire metadata local

## 1) Smart contracts (Hardhat v2)
```bash
cd hardhat
npm install
npm run compile
npm run test
```

### Deployer en local (Hardhat node)
Terminal 1:
```bash
npm run node
```

Terminal 2:
```bash
npm run deploy:local
```

Le script met a jour automatiquement:
- `hardhat/deployments/localhost.json`
- `frontend/lib/deployed-addresses.json`
- ABI frontend dans `frontend/lib/abis/`

### Deployer en testnet (Sepolia / Polygon Amoy)
```bash
cp .env.example .env
# remplir PRIVATE_KEY + RPC URL
npm run deploy:sepolia
# ou
npm run deploy:polygon
```

## 2) Backend IPFS (optionnel)
```bash
cd ../backend
cp .env.example .env
# optionnel: ajouter PINATA_JWT
npm install
npm run dev
```

- Health: `http://localhost:4000/health`
- Endpoint pin metadata: `POST /api/pin-json`

Si `PINATA_JWT` est absent, backend utilise un mode demo local.

## 3) Frontend Next.js
```bash
cd ../frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Ouvrir: `http://localhost:3000`

## 4) Utilitaire IPFS simple
```bash
cd ../ipfs
npm install
npm run upload:sample
```

Ce script cree un metadata JSON exemple. Ensuite, pin ce fichier sur Pinata/Web3.Storage/NFT.Storage et utilise l'URI `ipfs://...`.
