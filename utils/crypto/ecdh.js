export async function generateKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );
  return keyPair;
}

export async function exportPublicKey(publicKey) {
  const exported = await crypto.subtle.exportKey("spki", publicKey);
  return Buffer.from(exported).toString("base64");
}

export async function importPublicKey(publicKeyBase64) {
  const keyBuffer = Buffer.from(publicKeyBase64, "base64");
  return await crypto.subtle.importKey(
    "spki",
    keyBuffer,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );
}

export async function exportPrivateKey(privateKey) {
  const exported = await crypto.subtle.exportKey("pkcs8", privateKey);
  return Buffer.from(exported).toString("base64");
}

export async function importPrivateKey(privateKeyBase64) {
  const keyBuffer = Buffer.from(privateKeyBase64, "base64");
  return await crypto.subtle.importKey(
    "pkcs8",
    keyBuffer,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );
}

export async function deriveSharedKey(privateKey, publicKey) {
  return await crypto.subtle.deriveKey(
    { name: "ECDH", public: publicKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function encryptForRecipient(data, senderPrivateKey, recipientPublicKey) {
  const sharedKey = await deriveSharedKey(senderPrivateKey, recipientPublicKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(typeof data === "string" ? data : JSON.stringify(data));

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    sharedKey,
    dataBuffer
  );

  return {
    ciphertext: Buffer.from(encrypted).toString("base64"),
    iv: Buffer.from(iv).toString("base64")
  };
}

export async function decryptFromSender(ciphertext, ivBase64, recipientPrivateKey, senderPublicKey) {
  const sharedKey = await deriveSharedKey(recipientPrivateKey, senderPublicKey);
  const iv = Buffer.from(ivBase64, "base64");
  const encryptedData = Buffer.from(ciphertext, "base64");

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    sharedKey,
    encryptedData
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}
