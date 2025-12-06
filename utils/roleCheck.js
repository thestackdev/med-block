import { ethers } from "ethers";
import DoctorRegistry from "../artifacts/contracts/DoctorRegistry.sol/DoctorRegistry.json";
import HealthRecord from "../artifacts/contracts/HealthRecord.sol/HealthRecord.json";
import { CONTRACT_ADDRESS, HEALTH_RECORD_ADDRESS } from "../config";

/**
 * Detect the connected wallet's role.
 * Returns: "ADMIN" | "DOCTOR" | "PATIENT" | "UNREGISTERED"
 */
export async function detectUserRole() {
  if (!window.ethereum) throw new Error("MetaMask not detected");

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const address = await signer.getAddress();

  const doctorContract = new ethers.Contract(CONTRACT_ADDRESS, DoctorRegistry.abi, signer);
  const healthContract = new ethers.Contract(HEALTH_RECORD_ADDRESS, HealthRecord.abi, signer);

  try {
    // Admin Check
    const admin = await healthContract.admin();
    if (address.toLowerCase() === admin.toLowerCase()) return "ADMIN";

    // Doctor Check
    const isDoctor = await doctorContract.isDoctor(address);
    if (isDoctor) return "DOCTOR";

    // Patient Check
    const isPatient = await healthContract.isPatient(address);
    if (isPatient) return "PATIENT";

    // Not registered
    return "UNREGISTERED";
  } catch (err) {
    console.error("Role detection error:", err);
    return "ERROR";
  }
}
