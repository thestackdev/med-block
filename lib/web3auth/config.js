import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK } from "@web3auth/modal";

export const WEB3AUTH_CLIENT_ID = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID;

// Sepolia Testnet chain config
export const SEPOLIA_CHAIN_CONFIG = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: "0xaa36a7", // 11155111 in hex
  rpcTarget: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://eth-sepolia.g.alchemy.com/v2/demo",
  displayName: "Ethereum Sepolia",
  ticker: "ETH",
  tickerName: "Ethereum",
  logo: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
  blockExplorerUrl: "https://sepolia.etherscan.io"
};

export const getChainConfig = () => {
  return SEPOLIA_CHAIN_CONFIG;
};

// Use SAPPHIRE_MAINNET for production, SAPPHIRE_DEVNET for testing
export const WEB3AUTH_NETWORK_CONFIG = WEB3AUTH_NETWORK.SAPPHIRE_DEVNET;
