import { ethers } from "ethers";
import { CONTRACT_ADDRESS, HEALTH_RECORD_ADDRESS } from "../config";
import DoctorRegistry from "../artifacts/contracts/DoctorRegistry.sol/DoctorRegistry.json";
import HealthRecord from "../artifacts/contracts/HealthRecord.sol/HealthRecord.json";

// ✨ GET CONTRACTS - Call this everywhere instead of duplicating code
export const getContracts = async () => {
  if (!window.ethereum) {
    throw new Error("Please install MetaMask!");
  }

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();

  const doctorContract = new ethers.Contract(
    CONTRACT_ADDRESS,
    DoctorRegistry.abi,
    signer
  );

  const healthContract = new ethers.Contract(
    HEALTH_RECORD_ADDRESS,
    HealthRecord.abi,
    signer
  );

  return { provider, signer, doctorContract, healthContract };
};

// ✨ GET READ-ONLY CONTRACTS (No wallet needed)
export const getReadOnlyContracts = () => {
  const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");

  const doctorContract = new ethers.Contract(
    CONTRACT_ADDRESS,
    DoctorRegistry.abi,
    provider
  );

  const healthContract = new ethers.Contract(
    HEALTH_RECORD_ADDRESS,
    HealthRecord.abi,
    provider
  );

  return { provider, doctorContract, healthContract };
};