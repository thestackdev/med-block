import {
  generateAESKey,
  encrypt as aesEncrypt,
  decrypt as aesDecrypt,
  exportKey,
  importKey
} from "./crypto/aesGcm";
import {
  generateKeyPair,
  exportPublicKey,
  exportPrivateKey,
  importPublicKey,
  encryptForRecipient,
  decryptFromSender
} from "./crypto/ecdh";
import { createEncryptedPackage, decryptPackage } from "./crypto/encryptedPackage";

export async function encryptEHRData(data, senderKeyPair, recipientPublicKeys) {
  return await createEncryptedPackage(data, senderKeyPair, recipientPublicKeys);
}

export async function decryptEHRData(encryptedPackage, userAddress, userPrivateKey) {
  const senderPublicKey = await importPublicKey(encryptedPackage.senderPublicKey);
  return await decryptPackage(encryptedPackage, userAddress, userPrivateKey, senderPublicKey);
}

export async function encryptFile(file, aesKey) {
  const arrayBuffer = await file.arrayBuffer();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    arrayBuffer
  );

  return {
    encryptedData: Buffer.from(encrypted).toString("base64"),
    iv: Buffer.from(iv).toString("base64"),
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size
  };
}

export async function decryptFile(encryptedFile, aesKey) {
  const iv = Buffer.from(encryptedFile.iv, "base64");
  const encryptedData = Buffer.from(encryptedFile.encryptedData, "base64");

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    aesKey,
    encryptedData
  );

  return new Blob([decrypted], { type: encryptedFile.fileType });
}

export async function createSecureRecord(recordData, files, senderKeyPair, authorizedUsers) {
  const aesKey = await generateAESKey();
  const aesKeyExported = await exportKey(aesKey);

  const encryptedRecordData = await aesEncrypt(recordData, aesKey);

  const encryptedFiles = [];
  for (const file of files || []) {
    const encryptedFile = await encryptFile(file, aesKey);
    encryptedFiles.push(encryptedFile);
  }

  const encryptedKeys = {};
  for (const [address, publicKey] of Object.entries(authorizedUsers)) {
    const encrypted = await encryptForRecipient(
      aesKeyExported,
      senderKeyPair.privateKey,
      publicKey
    );
    encryptedKeys[address] = encrypted;
  }

  return {
    version: "2.0",
    recordData: encryptedRecordData,
    files: encryptedFiles,
    encryptedKeys,
    senderPublicKey: await exportPublicKey(senderKeyPair.publicKey),
    timestamp: Date.now()
  };
}

export async function decryptSecureRecord(secureRecord, userAddress, userPrivateKey) {
  const userEncryptedKey = secureRecord.encryptedKeys[userAddress];
  if (!userEncryptedKey) {
    throw new Error("Access denied: No key available for this user");
  }

  const senderPublicKey = await importPublicKey(secureRecord.senderPublicKey);

  const aesKeyBase64 = await decryptFromSender(
    userEncryptedKey.ciphertext,
    userEncryptedKey.iv,
    userPrivateKey,
    senderPublicKey
  );

  const aesKey = await importKey(aesKeyBase64);

  const decryptedData = await aesDecrypt(
    secureRecord.recordData.ciphertext,
    aesKey,
    secureRecord.recordData.iv
  );

  const decryptedFiles = [];
  for (const encryptedFile of secureRecord.files || []) {
    const decrypted = await decryptFile(encryptedFile, aesKey);
    decryptedFiles.push({
      blob: decrypted,
      fileName: encryptedFile.fileName,
      fileType: encryptedFile.fileType
    });
  }

  return {
    data: JSON.parse(decryptedData),
    files: decryptedFiles
  };
}

export { generateKeyPair, exportPublicKey, exportPrivateKey, importPublicKey, generateAESKey };
