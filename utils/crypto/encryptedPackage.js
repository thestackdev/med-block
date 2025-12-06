import { generateAESKey, encrypt as aesEncrypt, decrypt as aesDecrypt, exportKey, importKey } from "./aesGcm";
import { encryptForRecipient, decryptFromSender, exportPublicKey } from "./ecdh";

export async function createEncryptedPackage(data, senderKeyPair, recipientPublicKeys) {
  const aesKey = await generateAESKey();
  const { ciphertext, iv } = await aesEncrypt(data, aesKey);
  const aesKeyExported = await exportKey(aesKey);

  const encryptedKeys = {};
  for (const [address, publicKey] of Object.entries(recipientPublicKeys)) {
    const encrypted = await encryptForRecipient(
      aesKeyExported,
      senderKeyPair.privateKey,
      publicKey
    );
    encryptedKeys[address] = encrypted;
  }

  return {
    version: "2.0",
    ciphertext,
    iv,
    encryptedKeys,
    senderPublicKey: await exportPublicKey(senderKeyPair.publicKey),
    timestamp: Date.now()
  };
}

export async function decryptPackage(encryptedPackage, userAddress, userPrivateKey, senderPublicKey) {
  const userEncryptedKey = encryptedPackage.encryptedKeys[userAddress];
  if (!userEncryptedKey) {
    throw new Error("No access key available for this user");
  }

  const aesKeyBase64 = await decryptFromSender(
    userEncryptedKey.ciphertext,
    userEncryptedKey.iv,
    userPrivateKey,
    senderPublicKey
  );

  const aesKey = await importKey(aesKeyBase64);
  const decrypted = await aesDecrypt(encryptedPackage.ciphertext, aesKey, encryptedPackage.iv);

  return JSON.parse(decrypted);
}

export function createPackageMetadata(policyHash, authorizedAddresses) {
  return {
    policyHash,
    authorizedAddresses,
    createdAt: Date.now()
  };
}
