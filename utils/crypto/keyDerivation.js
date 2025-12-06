import { ethers } from "ethers";

const DERIVATION_MESSAGE = "MedBlock Key Derivation v1.0";

export async function deriveKeyFromSignature(signer) {
  const signature = await signer.signMessage(DERIVATION_MESSAGE);
  const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(signature));
  const keyMaterial = Buffer.from(hash.slice(2), "hex");

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  return cryptoKey;
}

export async function deriveECDHKeysFromSignature(signer) {
  const signature = await signer.signMessage(DERIVATION_MESSAGE + ":ECDH");
  const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(signature));
  const seed = Buffer.from(hash.slice(2), "hex");

  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );

  return keyPair;
}

export function hashData(data) {
  const dataString = typeof data === "string" ? data : JSON.stringify(data);
  return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(dataString));
}
