import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";
import { useWeb3Auth } from "../lib/web3auth/hooks";
import { generateKeyPair, exportPublicKey, exportPrivateKey } from "../utils/encryption";
import DoctorRegistry from "../artifacts/contracts/DoctorRegistry.sol/DoctorRegistry.json";
import HealthRecord from "../artifacts/contracts/HealthRecord.sol/HealthRecord.json";
import AccessPolicyRegistry from "../artifacts/contracts/AccessPolicyRegistry.sol/AccessPolicyRegistry.json";
import {
  CONTRACT_ADDRESS,
  HEALTH_RECORD_ADDRESS,
  POLICY_REGISTRY_ADDRESS,
  CHAIN_ID,
  RPC_URL,
  validateContractsDeployed,
  isCorrectNetwork
} from "../config";

const Web3Context = createContext();

export function Web3Provider({ children }) {
  const {
    provider,
    signer,
    account,
    userInfo,
    isConnected,
    isLoading,
    loginMethod,
    connect,
    connectWithGoogle,
    connectWithEmail,
    connectWithMetaMask,
    disconnect
  } = useWeb3Auth();

  const [contracts, setContracts] = useState({
    doctorRegistry: null,
    healthRecord: null,
    policyRegistry: null
  });

  const [userKeyPair, setUserKeyPair] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [networkError, setNetworkError] = useState(null);
  const [connectedChainId, setConnectedChainId] = useState(null);

  // Switch to Sepolia network
  const switchToSepolia = useCallback(async () => {
    if (!provider) return false;

    const chainIdHex = "0xaa36a7"; // 11155111 in hex (Sepolia)

    try {
      // Try to switch to Sepolia
      await provider.send("wallet_switchEthereumChain", [{ chainId: chainIdHex }]);
      window.location.reload();
      return true;
    } catch (switchError) {
      // If Sepolia doesn't exist in wallet, add it
      if (switchError.code === 4902 || switchError.message?.includes("Unrecognized chain")) {
        try {
          await provider.send("wallet_addEthereumChain", [{
            chainId: chainIdHex,
            chainName: "Ethereum Sepolia",
            nativeCurrency: {
              name: "Sepolia ETH",
              symbol: "ETH",
              decimals: 18
            },
            rpcUrls: [RPC_URL],
            blockExplorerUrls: ["https://sepolia.etherscan.io"]
          }]);
          window.location.reload();
          return true;
        } catch (addError) {
          console.error("Failed to add Sepolia network:", addError);
          setNetworkError("Failed to add Sepolia network. Please add it manually in your wallet.");
          return false;
        }
      }
      console.error("Failed to switch network:", switchError);
      setNetworkError("Failed to switch network. Please switch manually in your wallet to Sepolia (Chain ID: 11155111).");
      return false;
    }
  }, [provider]);

  // Validate network and initialize contracts
  const initContracts = useCallback(async () => {
    console.log("Web3Context: initContracts called", { hasSigner: !!signer, hasProvider: !!provider });
    if (!signer || !provider) return;

    try {
      // Check network
      const network = await provider.getNetwork();
      console.log("Web3Context: network detected", { chainId: network.chainId, expectedChainId: CHAIN_ID });
      setConnectedChainId(network.chainId);

      if (!isCorrectNetwork(network.chainId)) {
        console.log("Web3Context: WRONG NETWORK!");
        setNetworkError(`Wrong network. Please connect to Sepolia Testnet (Chain ID: ${CHAIN_ID}). Currently on Chain ID: ${network.chainId}`);
        setContracts({ doctorRegistry: null, healthRecord: null, policyRegistry: null });
        return;
      }

      // Check contracts are deployed
      const validation = validateContractsDeployed();
      if (!validation.valid) {
        setNetworkError(validation.message);
        setContracts({ doctorRegistry: null, healthRecord: null, policyRegistry: null });
        return;
      }

      // Initialize contracts
      const doctorRegistry = new ethers.Contract(
        CONTRACT_ADDRESS,
        DoctorRegistry.abi,
        signer
      );

      const healthRecord = new ethers.Contract(
        HEALTH_RECORD_ADDRESS,
        HealthRecord.abi,
        signer
      );

      const policyRegistry = new ethers.Contract(
        POLICY_REGISTRY_ADDRESS,
        AccessPolicyRegistry.abi,
        signer
      );

      console.log("Web3Context: contracts initialized successfully!");
      setContracts({ doctorRegistry, healthRecord, policyRegistry });
      setNetworkError(null);
    } catch (err) {
      console.error("Web3Context: Failed to initialize contracts:", err);
      setNetworkError(`Connection failed: ${err.message}. Make sure you're connected to Sepolia testnet.`);
    }
  }, [signer, provider]);

  const initUserKeyPair = useCallback(async () => {
    if (!account) return;

    const storedKeys = localStorage.getItem(`medblock_keys_${account}`);
    if (storedKeys) {
      setUserKeyPair(JSON.parse(storedKeys));
      return;
    }

    const keyPair = await generateKeyPair();
    const publicKey = await exportPublicKey(keyPair.publicKey);
    const privateKey = await exportPrivateKey(keyPair.privateKey);

    const keys = { publicKey, privateKey, raw: keyPair };
    localStorage.setItem(`medblock_keys_${account}`, JSON.stringify({ publicKey, privateKey }));
    setUserKeyPair(keys);
  }, [account]);

  const detectUserRole = useCallback(async () => {
    if (!contracts.doctorRegistry || !contracts.healthRecord || !account) return;

    try {
      const admin = await contracts.healthRecord.admin();
      if (account.toLowerCase() === admin.toLowerCase()) {
        setUserRole("ADMIN");
        return;
      }

      const isDoctor = await contracts.doctorRegistry.isDoctor(account);
      if (isDoctor) {
        setUserRole("DOCTOR");
        return;
      }

      const isPatient = await contracts.healthRecord.isPatient(account);
      if (isPatient) {
        setUserRole("PATIENT");
        return;
      }

      setUserRole("UNREGISTERED");
    } catch (err) {
      console.error("Role detection failed:", err);
      setUserRole("UNREGISTERED");
    }
  }, [contracts, account]);

  useEffect(() => {
    console.log("Web3Context: signer useEffect triggered", { hasSigner: !!signer, hasProvider: !!provider });
    if (signer) initContracts();
  }, [signer, initContracts]);

  useEffect(() => {
    if (account) initUserKeyPair();
  }, [account, initUserKeyPair]);

  useEffect(() => {
    if (contracts.doctorRegistry && account) detectUserRole();
  }, [contracts, account, detectUserRole]);

  const registerPublicKeyOnChain = useCallback(async () => {
    if (!contracts.doctorRegistry || !userKeyPair) return;

    try {
      const publicKeyBytes = ethers.utils.toUtf8Bytes(userKeyPair.publicKey);
      const tx = await contracts.doctorRegistry.registerPublicKey(publicKeyBytes);
      await tx.wait();
      return true;
    } catch (err) {
      console.error("Failed to register public key:", err);
      return false;
    }
  }, [contracts, userKeyPair]);

  const value = {
    provider,
    signer,
    account,
    userInfo,
    isConnected,
    isLoading,
    loginMethod,
    contracts,
    userKeyPair,
    userRole,
    networkError,
    connectedChainId,
    expectedChainId: CHAIN_ID,
    connect,
    connectWithGoogle,
    connectWithEmail,
    connectWithMetaMask,
    disconnect,
    registerPublicKeyOnChain,
    detectUserRole,
    switchToSepolia
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error("useWeb3 must be used within Web3Provider");
  }
  return context;
}

export { Web3Context };
