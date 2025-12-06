import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import PatientLayout from "../../components/PatientLayout";
import { useWeb3 } from "../../context/Web3Context";
import { fetchFromIPFS } from "../../utils/ipfs";
import CryptoJS from "crypto-js";

export default function ViewRecords() {
  const { account, contracts, isLoading: web3Loading } = useWeb3();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

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

  const loadRecords = async () => {
    if (!account || !contracts.healthRecord || !contracts.doctorRegistry) return;

    try {
      setLoading(true);

      console.log("Fetching records for patient:", account);
      const recs = await contracts.healthRecord.getPatientRecords(account);
      console.log("Raw records:", recs);

      const enrichedRecords = await Promise.all(
        recs.map(async (rec) => {
          let doctorName = "Unknown Doctor";
          let doctorSpecialization = "";
          let notes = "No additional notes";
          let fileName = "";
          let fileUrl = "";

          try {
            const doctorData = await contracts.doctorRegistry.getDoctorByAddress(
              rec.addedBy
            );
            doctorName = doctorData[1] || "Unknown Doctor";
            doctorSpecialization = doctorData[3] || "";
          } catch (err) {
            console.log("Could not fetch doctor name:", err);
          }

          // Try to decrypt IPFS data to get notes and fileName
          try {
            const data = await fetchFromIPFS(rec.ipfsHash);
            const decrypted = decryptData(data.encrypted || JSON.stringify(data));
            notes = decrypted.notes || notes;
            fileName = decrypted.fileName || "";
            fileUrl = decrypted.fileUrl || "";
          } catch (ipfsErr) {
            console.log("Could not fetch IPFS data:", ipfsErr);
          }

          return {
            id: rec.id ? rec.id.toString() : "N/A",
            description: rec.description || "No description",
            ipfsHash: rec.ipfsHash || "",
            date: rec.date ? rec.date.toNumber() : Date.now() / 1000,
            addedBy: rec.addedBy || "",
            doctorName: doctorName,
            doctorSpecialization: doctorSpecialization,
            notes: notes,
            fileName: fileName,
            fileUrl: fileUrl,
          };
        })
      );

      console.log("Enriched records:", enrichedRecords);
      setRecords(enrichedRecords);
    } catch (err) {
      console.error("Error loading records:", err);
      setError(err.reason || err.message || "Failed to load records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!web3Loading && account && contracts.healthRecord) {
      loadRecords();
    }
  }, [account, contracts, web3Loading]);

  // Generate health tip based on record description
  const getHealthTip = (description) => {
    const desc = description.toLowerCase();
    if (desc.includes("fever") || desc.includes("temperature")) {
      return "Stay hydrated, get plenty of rest, and monitor your temperature regularly. Contact your doctor if fever persists beyond 3 days.";
    } else if (desc.includes("blood") || desc.includes("test")) {
      return "Follow your doctor's recommendations and maintain a healthy diet. Keep track of your results and attend follow-up appointments as scheduled.";
    } else if (desc.includes("pressure") || desc.includes("bp")) {
      return "Monitor your blood pressure regularly, reduce salt intake, exercise moderately, and manage stress effectively.";
    } else if (desc.includes("diabetes") || desc.includes("sugar")) {
      return "Maintain a balanced diet, exercise regularly, monitor blood sugar levels, and take medications as prescribed by your doctor.";
    } else if (desc.includes("cold") || desc.includes("cough")) {
      return "Rest well, drink warm fluids, avoid cold beverages, and complete the prescribed medication course.";
    } else {
      return "Follow your doctor's instructions carefully, take medications as prescribed, and attend all follow-up appointments. Maintain a healthy lifestyle with proper diet and exercise.";
    }
  };

  if (web3Loading || loading) {
    return (
      <PatientLayout activeTab="records" account={account}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            height: "70vh",
          }}
        >
          <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-teal-600"></div>
          <p style={{ marginTop: "1em", color: "#666" }}>
            {web3Loading ? "Connecting to Web3..." : "Loading records..."}
          </p>
        </div>
      </PatientLayout>
    );
  }

  return (
    <PatientLayout activeTab="records" account={account}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2em" }}>
        <h1
          style={{
            fontSize: "2.5em",
            fontWeight: "bold",
            marginBottom: "1em",
            textAlign: "center",
          }}
        >
          My Health Records
        </h1>

        {error && (
          <div
            style={{
              backgroundColor: "#fee",
              borderLeft: "4px solid #f44",
              padding: "1.5em",
              borderRadius: "8px",
              marginBottom: "2em",
            }}
          >
            <p style={{ color: "#c00", fontSize: "1.1em", margin: 0 }}>
              {error}
            </p>
          </div>
        )}

        {records.length === 0 ? (
          <div
            style={{
              backgroundColor: "#e3f2fd",
              borderLeft: "4px solid #2196F3",
              padding: "3em",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            <h3
              style={{
                fontSize: "2em",
                fontWeight: "bold",
                color: "#1565C0",
                marginBottom: "0.5em",
              }}
            >
              No Medical Records
            </h3>
            <p style={{ color: "#1976D2", fontSize: "1.2em", margin: 0 }}>
              You don't have any medical records yet. Your doctor will add
              records during consultations.
            </p>
          </div>
        ) : (
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
                }}
              >
                {/* HEADER */}
                <div
                  style={{
                    background:
                      "linear-gradient(135deg, #009688 0%, #00bfa5 100%)",
                    padding: "1.5em",
                    color: "white",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "start",
                      justifyContent: "space-between",
                      marginBottom: "0.8em",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "1.6em",
                        fontWeight: "bold",
                        margin: 0,
                        flex: 1,
                      }}
                    >
                      {rec.description}
                    </h3>
                    <span
                      style={{
                        backgroundColor: "white",
                        color: "#009688",
                        padding: "0.4em 0.9em",
                        borderRadius: "20px",
                        fontWeight: "bold",
                        fontSize: "0.95em",
                      }}
                    >
                      ID: {rec.id}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      color: "#b2dfdb",
                      fontSize: "1.05em",
                    }}
                  >
                    Prescribed on{" "}
                    {new Date(rec.date * 1000).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}{" "}
                    at{" "}
                    {new Date(rec.date * 1000).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {/* BODY */}
                <div style={{ padding: "1.5em" }}>
                  <div style={{ fontSize: "1.15em" }}>
                    {/* Doctor Info */}
                    <div style={{ marginBottom: "1.2em" }}>
                      <p
                        style={{
                          fontWeight: "600",
                          color: "#555",
                          fontSize: "0.95em",
                          marginBottom: "0.4em",
                        }}
                      >
                        PRESCRIBED BY
                      </p>
                      <p
                        style={{
                          color: "#2c3e50",
                          fontWeight: "bold",
                          fontSize: "1.3em",
                          margin: 0,
                          marginBottom: "0.2em",
                        }}
                      >
                        Dr. {rec.doctorName}
                      </p>
                      {rec.doctorSpecialization && (
                        <p
                          style={{
                            color: "#666",
                            fontSize: "0.95em",
                            margin: 0,
                            fontStyle: "italic",
                          }}
                        >
                          {rec.doctorSpecialization}
                        </p>
                      )}
                    </div>

                    {/* Date Added */}
                    <div style={{ marginBottom: "1.2em" }}>
                      <p
                        style={{
                          fontWeight: "600",
                          color: "#555",
                          fontSize: "0.95em",
                          marginBottom: "0.4em",
                        }}
                      >
                        RECORD CREATED
                      </p>
                      <p
                        style={{
                          color: "#2c3e50",
                          fontSize: "1.1em",
                          margin: 0,
                        }}
                      >
                        {new Date(rec.date * 1000).toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>

                    {/* Medical Notes */}
                    <div style={{ marginBottom: "1.2em" }}>
                      <p
                        style={{
                          color: "#555",
                          fontWeight: "600",
                          fontSize: "0.95em",
                          marginBottom: "0.5em",
                        }}
                      >
                        MEDICAL NOTES
                      </p>
                      <div
                        style={{
                          backgroundColor: "#f5f5f5",
                          padding: "1em",
                          borderRadius: "8px",
                          border: "1px solid #e0e0e0",
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            color: "#2c3e50",
                            fontSize: "1.05em",
                            lineHeight: "1.6",
                          }}
                        >
                          {rec.notes}
                        </p>
                      </div>
                    </div>

                    {/* Health Tip */}
                    <div style={{ marginBottom: "1.2em" }}>
                      <p
                        style={{
                          color: "#555",
                          fontWeight: "600",
                          fontSize: "0.95em",
                          marginBottom: "0.5em",
                        }}
                      >
                        HEALTH TIP
                      </p>
                      <div
                        style={{
                          backgroundColor: "#e8f5e9",
                          padding: "1em",
                          borderRadius: "8px",
                          border: "1px solid #c8e6c9",
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            color: "#2e7d32",
                            fontSize: "1.05em",
                            lineHeight: "1.6",
                          }}
                        >
                          {getHealthTip(rec.description)}
                        </p>
                      </div>
                    </div>

                    {/* File Name (if exists) */}
                    {rec.fileName && (
                      <div style={{ marginBottom: "1.2em" }}>
                        <p
                          style={{
                            color: "#555",
                            fontWeight: "600",
                            fontSize: "0.95em",
                            marginBottom: "0.5em",
                          }}
                        >
                          ATTACHED DOCUMENT
                        </p>
                        <p
                          style={{
                            margin: 0,
                            color: "#2c3e50",
                            fontSize: "1.05em",
                            backgroundColor: "#f5f5f5",
                            padding: "0.8em",
                            borderRadius: "8px",
                            border: "1px solid #e0e0e0",
                          }}
                        >
                          {rec.fileName}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div
                    style={{ display: "flex", gap: "1em", marginTop: "1.5em" }}
                  >
                    {/* Preview Button */}
                    
                      <a href={
                        rec.fileUrl || `https://ipfs.io/ipfs/${rec.ipfsHash}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        flex: 1,
                        backgroundColor: "#009688",
                        color: "white",
                        padding: "0.9em",
                        borderRadius: "10px",
                        fontWeight: "bold",
                        textAlign: "center",
                        textDecoration: "none",
                        fontSize: "1.1em",
                        transition: "background-color 0.2s",
                        boxShadow: "0 3px 10px rgba(0,150,136,0.3)",
                      }}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.backgroundColor = "#00796b")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.backgroundColor = "#009688")
                      }
                    >
                      Preview Document
                    </a>

                    {/* View Button */}
                    
                     <a href={
                        rec.fileUrl || `https://ipfs.io/ipfs/${rec.ipfsHash}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      download
                      style={{
                        flex: 1,
                        backgroundColor: "#009688",
                        color: "white",
                        padding: "0.9em",
                        borderRadius: "10px",
                        fontWeight: "bold",
                        textAlign: "center",
                        textDecoration: "none",
                        fontSize: "1.1em",
                        transition: "background-color 0.2s",
                        boxShadow: "0 3px 10px rgba(0,150,136,0.3)",
                      }}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.backgroundColor = "#00796b")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.backgroundColor = "#009688")
                      }
                    >
                      Download
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PatientLayout>
  );
}