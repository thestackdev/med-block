import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import {
  initWeb3Auth,
  connectWeb3Auth,
  loginWithGoogle,
  loginWithEmail,
  logout as web3authLogout,
  getUserInfo,
  isWeb3AuthConnected
} from "./provider";

export function useWeb3Auth() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState("");
  const [userInfo, setUserInfo] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loginMethod, setLoginMethod] = useState("");

  const setupProvider = useCallback(async (web3Provider, method) => {
    const ethersProvider = new ethers.providers.Web3Provider(web3Provider);

    // Request accounts first to ensure they're available
    const accounts = await ethersProvider.send("eth_accounts", []);
    if (!accounts || accounts.length === 0) {
      // If no accounts, request them
      await ethersProvider.send("eth_requestAccounts", []);
    }

    const ethersSigner = ethersProvider.getSigner();
    const address = await ethersSigner.getAddress();

    setProvider(ethersProvider);
    setSigner(ethersSigner);
    setAccount(address);
    setLoginMethod(method);
    setIsConnected(true);

    const info = await getUserInfo();
    setUserInfo(info);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const web3auth = await initWeb3Auth();
        if (isWeb3AuthConnected() && web3auth.provider) {
          await setupProvider(web3auth.provider, "web3auth");
        }
      } catch (err) {
        console.error("Web3Auth init error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [setupProvider]);

  const connectWithGoogle = useCallback(async () => {
    setIsLoading(true);
    try {
      // Check if already connected
      if (isWeb3AuthConnected()) {
        const web3auth = await initWeb3Auth();
        if (web3auth.provider) {
          await setupProvider(web3auth.provider, "google");
          return;
        }
      }
      const web3Provider = await loginWithGoogle();
      await setupProvider(web3Provider, "google");
    } finally {
      setIsLoading(false);
    }
  }, [setupProvider]);

  const connectWithEmail = useCallback(async (email) => {
    setIsLoading(true);
    try {
      // Check if already connected
      if (isWeb3AuthConnected()) {
        const web3auth = await initWeb3Auth();
        if (web3auth.provider) {
          await setupProvider(web3auth.provider, "email");
          return;
        }
      }
      const web3Provider = await loginWithEmail(email);
      await setupProvider(web3Provider, "email");
    } finally {
      setIsLoading(false);
    }
  }, [setupProvider]);

  const connect = useCallback(async () => {
    setIsLoading(true);
    try {
      // Check if already connected
      if (isWeb3AuthConnected()) {
        const web3auth = await initWeb3Auth();
        if (web3auth.provider) {
          await setupProvider(web3auth.provider, "web3auth");
          return;
        }
      }
      const web3Provider = await connectWeb3Auth();
      await setupProvider(web3Provider, "web3auth");
    } finally {
      setIsLoading(false);
    }
  }, [setupProvider]);

  const connectWithMetaMask = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!window.ethereum) {
        throw new Error("MetaMask not installed. Please install MetaMask extension.");
      }

      const ethersProvider = new ethers.providers.Web3Provider(window.ethereum);

      // Request account access
      await ethersProvider.send("eth_requestAccounts", []);

      const ethersSigner = ethersProvider.getSigner();
      const address = await ethersSigner.getAddress();

      setProvider(ethersProvider);
      setSigner(ethersSigner);
      setAccount(address);
      setLoginMethod("metamask");
      setIsConnected(true);
      setUserInfo({ name: "MetaMask User" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await web3authLogout();
      setProvider(null);
      setSigner(null);
      setAccount("");
      setUserInfo(null);
      setIsConnected(false);
      setLoginMethod("");
    } catch (err) {
      console.error("Disconnect error:", err);
    }
  }, []);

  return {
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
  };
}
