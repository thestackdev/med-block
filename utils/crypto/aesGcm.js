export async function generateAESKey() {
  return await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function exportKey(key) {
  const exported = await crypto.subtle.exportKey("raw", key);
  return Buffer.from(exported).toString("base64");
}

export async function importKey(keyBase64) {
  const keyBuffer = Buffer.from(keyBase64, "base64");
  return await crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function encrypt(data, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(typeof data === "string" ? data : JSON.stringify(data));

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    dataBuffer
  );

  return {
    ciphertext: Buffer.from(encrypted).toString("base64"),
    iv: Buffer.from(iv).toString("base64")
  };
}

export async function decrypt(ciphertext, key, ivBase64) {
  const iv = Buffer.from(ivBase64, "base64");
  const encryptedData = Buffer.from(ciphertext, "base64");

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encryptedData
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}
