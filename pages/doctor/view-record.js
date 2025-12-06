import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import {
  Header,
  Icon,
  Message,
  Dropdown,
  Button,
} from "semantic-ui-react";
import DoctorLayout from "../../components/DoctorLayout";
import { useWeb3 } from "../../context/Web3Context";
import { fetchFromIPFS } from "../../utils/ipfs";
import CryptoJS from "crypto-js";

export default function ViewRecords() {
  const { contracts, isLoading: web3Loading } = useWeb3();
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [patientInfo, setPatientInfo] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const clearAllData = () => {
    setPatients([]);
    setSelectedPatient("");
    setPatientInfo(null);
    setRecords([]);
    setError("");

    if (typeof window !== "undefined") {
      localStorage.removeItem("cachedPatients");
      localStorage.removeItem("selectedPatient");
      sessionStorage.clear();
    }
  };

  const loadPatients = async () => {
    if (!contracts.healthRecord) return;

    try {
      console.log("Loading patients...");
      const allPatients = await contracts.healthRecord.getMyPatients();
      console.log("Raw patients from contract:", allPatients);

      const formatted = allPatients
        .filter((p) => {
          const isActive = p.isActive !== undefined ? p.isActive : true;
          console.log(`Patient ${p.fullName || p[2]}: isActive = ${isActive}`);
          return isActive;
        })
        .map((p) => {
          const wallet = p.walletAddress || p[1] || (Array.isArray(p) ? p[1] : undefined);
          const name = p.fullName || p[2] || "Unknown";
          const id = p.patientId || p[0];
          return {
            key: wallet,
            text: `${name} (${wallet?.slice(0, 10)}...)`,
            value: wallet,
            details: { id, wallet, name },
          };
        });

      console.log("Filtered ACTIVE patients:", formatted);
      setPatients(formatted);

      if (typeof window !== "undefined") {
        sessionStorage.setItem("cachedPatients", JSON.stringify(formatted));
      }
    } catch (err) {
      console.error("Error loading patients:", err);
      setError("Failed to load patients. Please reconnect wallet.");
    }
  };

  useEffect(() => {
    if (!web3Loading && contracts.healthRecord) {
      loadPatients();
    }
  }, [contracts, web3Loading]);

  const decryptData = (encryptedText) => {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedText, "medblock-key");
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      return JSON.parse(decrypted);
    } catch (e) {
      console.error("Decryption failed:", e);
      return {};
    }
  };

  const handleLoadRecords = async () => {
    if (!selectedPatient) {
      setError("Please select a patient first.");
      return;
    }

    if (!ethers.utils.isAddress(selectedPatient)) {
      setError("Invalid patient address selected.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setRecords([]);
      setPatientInfo(null);

      const patientDetails = await contracts.healthRecord.getPatientDetails(selectedPatient);
      const isActive = patientDetails[6] !== undefined ? patientDetails[6] : true;

      console.log("Patient details:", patientDetails);
      console.log("Is patient active?", isActive);

      if (!isActive) {
        setError("This patient has been removed and is no longer active.");
        setLoading(false);
        return;
      }

      const [name, age, blood, phone, doctor] = await contracts.healthRecord.getPatient(
        selectedPatient
      );

      setPatientInfo({ name, age, blood, phone, doctor });

      let recordsList;
      try {
        recordsList = await contracts.healthRecord.getPatientRecords(selectedPatient);
      } catch (err1) {
        console.warn("getPatientRecords() failed, trying fallback...", err1);
        const selected = patients.find((p) => p.value === selectedPatient);
        const patientId = selected?.details?.id;
        if (patientId) {
          recordsList = await contracts.healthRecord.getPatientRecordsByDoctor(patientId);
        } else {
          throw new Error("Could not resolve patient ID");
        }
      }

      console.log("Records fetched:", recordsList);

      const decryptedRecords = await Promise.all(
        recordsList.map(async (r) => {
          try {
            const data = await fetchFromIPFS(r.ipfsHash);
            const decrypted = decryptData(data.encrypted || JSON.stringify(data));
            return { ...r, ...decrypted };
          } catch (ipfsErr) {
            console.error("Error loading IPFS data:", ipfsErr);
            return { ...r, notes: "Unable to fetch data" };
          }
        })
      );

      setRecords(decryptedRecords);
    } catch (err) {
      console.error("Error loading records:", err);
      setError(err.reason || err.message || "Failed to load records");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    clearAllData();
    loadPatients();
  };

  return (
    <DoctorLayout>
      {/* Fixed Width Container */}
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2em" }}>
        <Header
          as="h1"
          style={{
            fontSize: "2.5em",
            marginBottom: "1em",
            textAlign: "center",
          }}
        >
          <Icon name="file alternate" /> View Medical Records
        </Header>

        {/* Controls Card */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "18px",
            boxShadow: "0 6px 25px rgba(0,0,0,0.12)",
            border: "2px solid #e8e8e8",
            padding: "2em",
            marginBottom: "2em",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.5em",
            }}
          >
            <h2 style={{ fontSize: "1.5em", fontWeight: "bold", margin: 0 }}>
              Select Patient
            </h2>
            <Button
              icon
              labelPosition="left"
              onClick={handleRefresh}
              size="medium"
              color="grey"
            >
              <Icon name="refresh" />
              Refresh List
            </Button>
          </div>

          <Dropdown
            placeholder="Select Patient"
            fluid
            selection
            search
            options={patients}
            value={selectedPatient}
            onChange={(e, { value }) => setSelectedPatient(value)}
            style={{ marginBottom: "1.5em", fontSize: "1.1em" }}
          />

          <Button
            color="teal"
            icon
            labelPosition="left"
            onClick={handleLoadRecords}
            loading={loading}
            size="large"
            fluid
          >
            <Icon name="search" /> Load Medical Records
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <Message
            negative
            size="large"
            style={{ fontSize: "1.1em", marginBottom: "2em" }}
          >
            {error}
          </Message>
        )}

        {/* Patient Info Card */}
        {patientInfo && (
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "18px",
              boxShadow: "0 6px 25px rgba(0,0,0,0.12)",
              border: "2px solid #e8e8e8",
              overflow: "hidden",
              marginBottom: "2em",
            }}
          >
            {/* Header */}
            <div
              style={{
                background: "linear-gradient(135deg, #009688 0%, #00bfa5 100%)",
                padding: "2em",
                color: "white",
              }}
            >
              <h2 style={{ fontSize: "1.8em", fontWeight: "bold", margin: 0, marginBottom: "0.3em" }}>
                Patient Information
              </h2>
              <p style={{ margin: 0, color: "#b2dfdb" }}>
                Current patient details
              </p>
            </div>

            {/* Body */}
            <div style={{ padding: "2em" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1.5em",
                  fontSize: "1.15em",
                }}
              >
                <div style={{ display: "flex" }}>
                  <span
                    style={{
                      fontWeight: "600",
                      minWidth: "140px",
                      color: "#555",
                    }}
                  >
                    Patient Name:
                  </span>
                  <span style={{ color: "#2c3e50", fontWeight: "bold" }}>
                    {patientInfo.name}
                  </span>
                </div>

                <div style={{ display: "flex" }}>
                  <span
                    style={{
                      fontWeight: "600",
                      minWidth: "140px",
                      color: "#555",
                    }}
                  >
                    Age:
                  </span>
                  <span style={{ color: "#2c3e50" }}>
                    {patientInfo.age.toString()} years
                  </span>
                </div>

                <div style={{ display: "flex" }}>
                  <span
                    style={{
                      fontWeight: "600",
                      minWidth: "140px",
                      color: "#555",
                    }}
                  >
                    Blood Group:
                  </span>
                  <span
                    style={{
                      color: "#d32f2f",
                      fontWeight: "bold",
                      fontSize: "1.1em",
                    }}
                  >
                    {patientInfo.blood}
                  </span>
                </div>

                <div style={{ display: "flex" }}>
                  <span
                    style={{
                      fontWeight: "600",
                      minWidth: "140px",
                      color: "#555",
                    }}
                  >
                    Phone:
                  </span>
                  <span style={{ color: "#2c3e50" }}>{patientInfo.phone}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Records Section */}
        {records.length > 0 && (
          <div>
            <h2
              style={{
                fontSize: "1.8em",
                fontWeight: "bold",
                marginBottom: "1em",
              }}
            >
              Medical Records ({records.length})
            </h2>

            {/* Records Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(550px, 1fr))",
                gap: "2em",
              }}
            >
              {records.map((rec, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: "white",
                    borderRadius: "18px",
                    boxShadow: "0 6px 25px rgba(0,0,0,0.12)",
                    border: "2px solid #e8e8e8",
                    overflow: "hidden",
                    minHeight: "320px",
                  }}
                >
                  {/* Header */}
                  <div
                    style={{
                      background:
                        "linear-gradient(135deg, #009688 0%, #00bfa5 100%)",
                      padding: "1.5em",
                      color: "white",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "1.5em",
                        fontWeight: "bold",
                        margin: 0,
                        marginBottom: "0.5em",
                      }}
                    >
                      {rec.description}
                    </h3>
                    <p style={{ margin: 0, color: "#b2dfdb", fontSize: "0.9em" }}>
                      {new Date(Number(rec.date) * 1000).toLocaleString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </p>
                  </div>

                  {/* Body */}
                  <div style={{ padding: "1.5em" }}>
                    <div style={{ fontSize: "1.05em" }}>
                      {/* Record ID */}
                      <div
                        style={{
                          display: "flex",
                          marginBottom: "1em",
                          lineHeight: "1.6",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: "600",
                            minWidth: "120px",
                            color: "#555",
                          }}
                        >
                          Record ID:
                        </span>
                        <span style={{ color: "#2c3e50" }}>
                          {rec.id ? rec.id.toString() : "N/A"}
                        </span>
                      </div>

                      {/* Notes */}
                      <div style={{ marginBottom: "1em" }}>
                        <p
                          style={{
                            fontWeight: "600",
                            color: "#555",
                            marginBottom: "0.5em",
                          }}
                        >
                          Notes:
                        </p>
                        <div
                          style={{
                            backgroundColor: "#f5f5f5",
                            border: "2px solid #e0e0e0",
                            borderRadius: "8px",
                            padding: "1em",
                          }}
                        >
                          <p style={{ margin: 0, color: "#2c3e50" }}>
                            {rec.notes || "No additional notes"}
                          </p>
                        </div>
                      </div>

                      {/* File */}
                      {rec.fileName && (
                        <div style={{ marginBottom: "1em" }}>
                          <p
                            style={{
                              fontWeight: "600",
                              color: "#555",
                              marginBottom: "0.5em",
                            }}
                          >
                            Attached File:
                          </p>
                          
                            <a href={
                              rec.fileUrl ||
                              `https://ipfs.io/ipfs/${rec.ipfsHash}`
                            }
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.5em",
                              backgroundColor: "#2196F3",
                              color: "white",
                              padding: "0.7em 1.2em",
                              borderRadius: "8px",
                              fontWeight: "600",
                              textDecoration: "none",
                              transition: "background-color 0.2s",
                            }}
                            onMouseOver={(e) =>
                              (e.target.style.backgroundColor = "#1976D2")
                            }
                            onMouseOut={(e) =>
                              (e.target.style.backgroundColor = "#2196F3")
                            }
                          >
                            <Icon name="file" />
                            {rec.fileName}
                          </a>
                        </div>
                      )}

                      {/* IPFS Hash */}
                      <div style={{ marginBottom: "1em" }}>
                        <p
                          style={{
                            fontWeight: "600",
                            color: "#555",
                            marginBottom: "0.5em",
                            fontSize: "0.95em",
                          }}
                        >
                          IPFS Hash:
                        </p>
                        <div
                          style={{
                            backgroundColor: "#f5f5f5",
                            border: "2px solid #e0e0e0",
                            borderRadius: "8px",
                            padding: "0.8em",
                          }}
                        >
                          <p
                            style={{
                              margin: 0,
                              fontFamily: "monospace",
                              fontSize: "0.8em",
                              color: "#555",
                              wordBreak: "break-all",
                            }}
                          >
                            {rec.ipfsHash}
                          </p>
                        </div>
                      </div>

                      {/* Added By */}
                      {rec.addedBy && (
                        <div>
                          <p
                            style={{
                              fontWeight: "600",
                              color: "#555",
                              marginBottom: "0.5em",
                              fontSize: "0.95em",
                            }}
                          >
                            Added By:
                          </p>
                          <div
                            style={{
                              backgroundColor: "#f5f5f5",
                              border: "2px solid #e0e0e0",
                              borderRadius: "8px",
                              padding: "0.8em",
                            }}
                          >
                            <p
                              style={{
                                margin: 0,
                                fontFamily: "monospace",
                                fontSize: "0.8em",
                                color: "#555",
                                wordBreak: "break-all",
                              }}
                            >
                              {rec.addedBy}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Records Message */}
        {!loading && !error && records.length === 0 && patientInfo && (
          <div
            style={{
              backgroundColor: "#e3f2fd",
              borderLeft: "4px solid #2196F3",
              padding: "2em",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            <Icon name="inbox" size="huge" style={{ color: "#2196F3" }} />
            <h3
              style={{
                fontSize: "1.8em",
                fontWeight: "bold",
                color: "#1565C0",
                marginTop: "1em",
                marginBottom: "0.5em",
              }}
            >
              No Records Found
            </h3>
            <p style={{ color: "#1976D2", fontSize: "1.1em", margin: 0 }}>
              This patient doesn't have any medical records yet.
            </p>
          </div>
        )}
      </div>
    </DoctorLayout>
  );
}