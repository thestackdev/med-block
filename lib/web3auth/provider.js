import { Web3Auth, WALLET_CONNECTORS, AUTH_CONNECTION } from "@web3auth/modal";
import { WEB3AUTH_CLIENT_ID, getChainConfig, WEB3AUTH_NETWORK_CONFIG } from "./config";

let web3authInstance = null;

export async function initWeb3Auth() {
  if (web3authInstance) return web3authInstance;

  const chainConfig = getChainConfig();

  web3authInstance = new Web3Auth({
    clientId: WEB3AUTH_CLIENT_ID,
    web3AuthNetwork: WEB3AUTH_NETWORK_CONFIG,
    chainConfig,
    uiConfig: {
      appName: "Secure MedBlock",
      mode: "light",
      loginMethodsOrder: ["google", "email_passwordless"],
      defaultLanguage: "en",
      theme: {
        primary: "#3b82f6"
      }
    }
  });

  await web3authInstance.init();
  return web3authInstance;
}

export async function connectWeb3Auth() {
  const web3auth = await initWeb3Auth();
  const provider = await web3auth.connect();
  return provider;
}

export async function loginWithGoogle() {
  const web3auth = await initWeb3Auth();
  const provider = await web3auth.connectTo(WALLET_CONNECTORS.AUTH, {
    authConnection: AUTH_CONNECTION.GOOGLE
  });
  return provider;
}

export async function loginWithEmail(email) {
  const web3auth = await initWeb3Auth();
  const provider = await web3auth.connectTo(WALLET_CONNECTORS.AUTH, {
    authConnection: AUTH_CONNECTION.EMAIL_PASSWORDLESS,
    extraLoginOptions: {
      login_hint: email
    }
  });
  return provider;
}

export async function logout() {
  const web3auth = await initWeb3Auth();
  await web3auth.logout();
}

export async function getUserInfo() {
  const web3auth = await initWeb3Auth();
  if (!web3auth.connected) return null;
  return await web3auth.getUserInfo();
}

export async function getWeb3AuthProvider() {
  const web3auth = await initWeb3Auth();
  return web3auth.provider;
}

export function isWeb3AuthConnected() {
  return web3authInstance?.connected || false;
}
