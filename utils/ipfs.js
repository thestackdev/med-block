const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY || process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY || process.env.PINATA_SECRET_KEY;
const IPFS_GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs";

export async function uploadToIPFS(data) {
  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
  const formData = new FormData();
  formData.append("file", blob, "record.json");

  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      pinata_api_key: PINATA_API_KEY,
      pinata_secret_api_key: PINATA_SECRET_KEY
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error(`IPFS upload failed: ${response.statusText}`);
  }

  const result = await response.json();
  return result.IpfsHash;
}

export async function uploadFileToIPFS(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      pinata_api_key: PINATA_API_KEY,
      pinata_secret_api_key: PINATA_SECRET_KEY
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error(`IPFS upload failed: ${response.statusText}`);
  }

  const result = await response.json();
  return {
    cid: result.IpfsHash,
    url: `${IPFS_GATEWAY}/${result.IpfsHash}`
  };
}

export async function uploadEncryptedPackage(encryptedPackage) {
  return await uploadToIPFS(encryptedPackage);
}

export async function fetchFromIPFS(cid) {
  const response = await fetch(`${IPFS_GATEWAY}/${cid}`);

  if (!response.ok) {
    throw new Error(`IPFS fetch failed: ${response.statusText}`);
  }

  return await response.json();
}

export async function fetchFileFromIPFS(cid) {
  const response = await fetch(`${IPFS_GATEWAY}/${cid}`);

  if (!response.ok) {
    throw new Error(`IPFS fetch failed: ${response.statusText}`);
  }

  return await response.blob();
}

export async function uploadEncryptedRecord(secureRecord) {
  const mainCid = await uploadToIPFS({
    recordData: secureRecord.recordData,
    files: secureRecord.files,
    senderPublicKey: secureRecord.senderPublicKey,
    version: secureRecord.version,
    timestamp: secureRecord.timestamp
  });

  const keysCid = await uploadToIPFS({
    encryptedKeys: secureRecord.encryptedKeys
  });

  return { mainCid, keysCid };
}

export async function downloadEncryptedRecord(mainCid, keysCid) {
  const [mainData, keysData] = await Promise.all([
    fetchFromIPFS(mainCid),
    fetchFromIPFS(keysCid)
  ]);

  return {
    ...mainData,
    encryptedKeys: keysData.encryptedKeys
  };
}

export function getIPFSUrl(cid) {
  return `${IPFS_GATEWAY}/${cid}`;
}
