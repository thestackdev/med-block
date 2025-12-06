import React, { useEffect, useState } from "react";
import {
  Form,
  Button,
  Message,
  Dropdown,
  Header,
  Icon,
  TextArea,
} from "semantic-ui-react";
import DoctorLayout from "../../components/DoctorLayout";
import { useWeb3 } from "../../context/Web3Context";
import { uploadToIPFS, uploadFileToIPFS } from "../../utils/ipfs";
import CryptoJS from "crypto-js";

export default function AddRecord() {
  const { contracts, isLoading: web3Loading } = useWeb3();
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const loadPatients = async () => {
      if (!contracts.healthRecord) return;

      try {
        console.log("Fetching patients...");
        const allPatients = await contracts.healthRecord.getMyPatients();
        console.log("Patients found:", allPatients);

        const formatted = allPatients
          .filter((p) => p.isActive)
          .map((p) => ({
            key: p.walletAddress,
            text: p.fullName + " (" + p.walletAddress.slice(0, 10) + "...)",
            value: p.walletAddress,
          }));

        setPatients(formatted);

        if (formatted.length === 0) {
          setError("No active patients found. Please register patients first.");
        }
      } catch (err) {
        console.error("Error loading patients:", err);
        setError("Failed to load patients. " + (err.reason || err.message));
      }
    };

    if (!web3Loading) {
      loadPatients();
    }
  }, [contracts, web3Loading]);

  const encryptAndUpload = async (data) => {
    const secretKey = "medblock-key";
    const encrypted = CryptoJS.AES.encrypt(
      JSON.stringify(data),
      secretKey
    ).toString();
    const cid = await uploadToIPFS({ encrypted });
    return cid;
  };

  const handleAddRecord = async () => {
    if (!selectedPatient || !description) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const recordData = {
        description,
        notes,
        timestamp: new Date().toISOString(),
      };

      if (file) {
        const { cid, url } = await uploadFileToIPFS(file);
        recordData.fileCid = cid;
        recordData.fileName = file.name;
        recordData.fileUrl = url;
      }

      const metadataCid = await encryptAndUpload(recordData);

      const tx = await contracts.healthRecord.addRecord(
        selectedPatient,
        description,
        metadataCid
      );
      await tx.wait();

      setSuccess("Record added successfully! Metadata CID: " + metadataCid);
      setDescription("");
      setNotes("");
      setFile(null);
      setSelectedPatient("");
    } catch (err) {
      console.error("Error adding record:", err);
      setError(err.reason || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DoctorLayout>
      <Header as="h2" color="black">
        <Icon name="plus square" /> Add Medical Record
      </Header>

      <Form loading={loading} success={!!success} error={!!error}>
        <Form.Field required>
          <label>Patient</label>
          <Dropdown
            placeholder="Select Patient"
            fluid
            search
            selection
            options={patients}
            value={selectedPatient}
            onChange={(e, { value }) => setSelectedPatient(value)}
            disabled={patients.length === 0}
            noResultsMessage="No patients available. Please register patients first."
          />
          {patients.length === 0 && (
            <Message warning>
              <Icon name="warning sign" />
              No patients registered yet. Please register patients before adding records.
            </Message>
          )}
        </Form.Field>

        <Form.Field required>
          <label>Description</label>
          <input
            placeholder="Diagnosis / Summary"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Form.Field>

        <Form.Field>
          <label>Notes / Report Data</label>
          <TextArea
            placeholder="Prescription, comments, test results..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Form.Field>

        <Form.Field>
          <label>Upload Prescription / Report</label>
          <input type="file" onChange={(e) => setFile(e.target.files[0])} />
        </Form.Field>

        <Message success header="Success!" content={success} />
        <Message error header="Error" content={error} />

        <Button 
          color="teal" 
          onClick={handleAddRecord} 
          disabled={loading || patients.length === 0}
        >
          <Icon name="save" /> Add Record
        </Button>
      </Form>
    </DoctorLayout>
  );
}