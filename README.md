# Med-Block

A blockchain-based healthcare record management system that leverages Ethereum smart contracts and IPFS for secure, decentralized storage and access control of medical records.

## Features

- **Multi-Role Access Control** - Admin, Doctor, and Patient portals with role-specific functionality
- **Secure Medical Records** - End-to-end encryption using AES-GCM and ECDH key exchange
- **Decentralized Storage** - Medical records stored on IPFS via Pinata
- **Immutable Audit Trail** - All transactions recorded on Ethereum blockchain
- **Web3 Authentication** - Support for MetaMask, Google, and email login via Web3Auth
- **Doctor Management** - Registration, department organization, and credential verification
- **Patient Management** - Registration, doctor assignment, and secure patient transfers

## Tech Stack

| Category | Technologies |
|----------|-------------|
| Frontend | Next.js, React, Tailwind CSS, Semantic UI React |
| Blockchain | Ethereum (Sepolia Testnet), Solidity 0.8.20, Hardhat |
| Storage | IPFS via Pinata API |
| Authentication | Web3Auth Modal |
| Encryption | Web Crypto API (AES-GCM, ECDH), Crypto-JS |

## Prerequisites

- Node.js v16 or higher
- npm or yarn
- MetaMask browser extension (optional - can use Google/email login)
- Sepolia testnet ETH (for contract deployment)

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Web3Auth Configuration
NEXT_PUBLIC_WEB3AUTH_CLIENT_ID=your_web3auth_client_id

# Ethereum Network
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your_api_key
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your_api_key
DEPLOYER_PRIVATE_KEY=your_deployer_wallet_private_key

# Pinata IPFS
NEXT_PUBLIC_PINATA_API_KEY=your_pinata_api_key
NEXT_PUBLIC_PINATA_SECRET_KEY=your_pinata_secret_key
```

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd med-block
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure environment variables**

   Copy the `.env.example` to `.env` and fill in your credentials (see Environment Variables section above).

4. **Deploy smart contracts** (if not already deployed)
   ```bash
   npx hardhat run scripts/deploy-sepolia.js --network sepolia
   ```
   This will deploy the contracts and update `config.js` with the contract addresses.

5. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

6. **Open the application**

   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Admin Portal
- Manage doctor registrations and credentials
- Oversee patient records and assignments
- Activate/deactivate doctors and patients
- View system-wide statistics

### Doctor Portal
- Register new patients
- Add medical records with optional encryption
- Transfer patients to other doctors
- View assigned patients and their history

### Patient Portal
- View personal medical records
- Access complete medical history
- See assigned doctor information

## Project Structure

```
med-block/
├── contracts/              # Solidity smart contracts
│   ├── DoctorRegistry.sol      # Doctor management
│   ├── HealthRecord.sol        # Patient & record management
│   └── AccessPolicyRegistry.sol # Access control policies
├── pages/                  # Next.js pages
│   ├── index.js               # Home/login page
│   ├── admin/                 # Admin dashboard
│   ├── doctor/                # Doctor portal
│   └── patient/               # Patient portal
├── components/             # React components
│   ├── AdminLayout.js
│   ├── DoctorLayout.js
│   ├── PatientLayout.js
│   └── Header.js
├── context/                # React Context
│   └── Web3Context.js         # Web3 state management
├── hooks/                  # Custom React hooks
│   └── useContracts.js
├── lib/                    # Library configurations
│   └── web3auth/              # Web3Auth setup
├── utils/                  # Utility functions
│   ├── encryption.js          # High-level encryption
│   ├── ipfs.js               # IPFS integration
│   ├── contracts.js          # Contract utilities
│   ├── crypto/               # Cryptographic primitives
│   │   ├── aesGcm.js
│   │   ├── ecdh.js
│   │   ├── encryptedPackage.js
│   │   └── keyDerivation.js
│   └── roleCheck.js          # Role verification
├── scripts/                # Deployment scripts
│   └── deploy-sepolia.js
├── config.js               # Contract addresses (auto-generated)
├── hardhat.config.js       # Hardhat configuration
└── package.json
```

## Smart Contracts

### DoctorRegistry.sol
Manages doctor registration, credentials, and department organization. Supports doctor activation/deactivation and public key registration for encryption.

### HealthRecord.sol
Handles patient registration, medical record storage with IPFS hash references, patient-doctor assignments, and transfer tracking with complete audit trails.

### AccessPolicyRegistry.sol
Implements role-based and department-based access control policies for medical records, supporting fine-grained access authorization and verification.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npx hardhat compile` | Compile smart contracts |
| `npx hardhat test` | Run contract tests |

## Network Configuration

- **Network**: Ethereum Sepolia Testnet
- **Chain ID**: 11155111
- **Block Explorer**: [Sepolia Etherscan](https://sepolia.etherscan.io)

## License

MIT
