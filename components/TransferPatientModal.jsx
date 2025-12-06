import React, { useState, useEffect } from "react";
import {
  Modal,
  Button,
  Form,
  Dropdown,
  Message,
  Header,
  Icon,
  Divider,
  Loader,
} from "semantic-ui-react";
import { useWeb3 } from "../context/Web3Context";

export default function TransferPatientModal({ patient, open, onClose, onSuccess }) {
  const { account, contracts } = useWeb3();
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    if (open) {
      initializeModal();
    } else {
      // Reset when modal closes
      resetModal();
    }
  }, [open]);

  useEffect(() => {
    if (selectedDepartment && !initializing) {
      loadDoctorsByDepartment(selectedDepartment);
    }
  }, [selectedDepartment]);

  const resetModal = () => {
    setSelectedDepartment("");
    setSelectedDoctor("");
    setDoctors([]);
    setReason("");
    setError("");
    setDepartments([]);
    setInitializing(true);
  };

  const initializeModal = async () => {
    try {
      setInitializing(true);
      setError("");

      if (!account || !contracts.doctorRegistry) {
        throw new Error("Wallet not connected");
      }

      console.log("Current doctor address:", account);

      const allDoctors = await contracts.doctorRegistry.getAllDoctors();
      console.log("Total doctors in system:", allDoctors.length);
      
      // Filter out current doctor
      const otherDoctors = allDoctors.filter(
        (d) => d.walletAddress.toLowerCase() !== account.toLowerCase()
      );
      
      console.log("Other doctors available:", otherDoctors.length);
      
      if (otherDoctors.length === 0) {
        setError("Cannot transfer: No other doctors registered in the system. Please ask admin to register more doctors.");
        setDepartments([]);
        setInitializing(false);
        return;
      }
      
      // Get unique departments from other doctors
      const deptSet = new Set();
      otherDoctors.forEach((d) => {
        if (d.department && d.department.trim() !== "") {
          deptSet.add(d.department);
        }
      });
      
      const uniqueDepts = Array.from(deptSet);
      console.log("Available departments for transfer:", uniqueDepts);

      if (uniqueDepts.length === 0) {
        setError("No departments available for transfer.");
        setDepartments([]);
        setInitializing(false);
        return;
      }

      const departmentOptions = uniqueDepts.map((dept) => ({
        key: dept,
        text: dept,
        value: dept,
      }));

      setDepartments(departmentOptions);
      console.log("Department options set:", departmentOptions);
      
    } catch (err) {
      console.error("Error initializing modal:", err);
      setError("Failed to load: " + (err.reason || err.message));
    } finally {
      setInitializing(false);
    }
  };

  const loadDoctorsByDepartment = async (department) => {
    try {
      setLoadingDoctors(true);
      setError("");

      if (!account || !contracts.doctorRegistry) throw new Error("Wallet not connected");

      const allDoctors = await contracts.doctorRegistry.getAllDoctors();

      // Filter: same department AND not current doctor
      const filteredDoctors = allDoctors.filter(
        (d) =>
          d.department === department &&
          d.walletAddress.toLowerCase() !== account.toLowerCase()
      );

      console.log(`Doctors in ${department} (excluding current):`, filteredDoctors.length);

      if (filteredDoctors.length === 0) {
        setError(`No other doctors available in ${department} department. Try selecting a different department.`);
        setDoctors([]);
        setSelectedDoctor("");
        return;
      }

      const doctorOptions = filteredDoctors.map((d) => ({
        key: d.walletAddress,
        text: `Dr. ${d.fullName} - ${d.specialization}`,
        value: d.walletAddress,
        description: `License: ${d.licenseId}`,
      }));

      setDoctors(doctorOptions);
      console.log("Doctor options loaded:", doctorOptions.length);
      
    } catch (err) {
      console.error("Error loading doctors:", err);
      setError("Failed to load doctors: " + (err.reason || err.message));
      setDoctors([]);
    } finally {
      setLoadingDoctors(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedDoctor || !reason.trim()) {
      setError("Please select a doctor and provide a reason for transfer");
      return;
    }

    try {
      setLoading(true);
      setError("");

      if (!contracts.healthRecord) throw new Error("Wallet not connected");

      const patientWallet = patient.walletAddress || patient.wallet;

      console.log("=== Transfer Details ===");
      console.log("Patient:", patientWallet);
      console.log("To Doctor:", selectedDoctor);
      console.log("Reason:", reason);

      const tx = await contracts.healthRecord.transferPatient(
        patientWallet,
        selectedDoctor,
        reason
      );

      console.log("Transaction hash:", tx.hash);
      await tx.wait();
      console.log("Transfer successful!");

      if (onSuccess) onSuccess();
      handleClose();
      
    } catch (err) {
      console.error("Transfer error:", err);
      setError(err.reason || err.message || "Transfer failed");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} size="small">
      <Modal.Header>
        <Icon name="exchange" color="teal" />
        Transfer Patient: {patient && (patient.fullName || patient.name)}
      </Modal.Header>

      <Modal.Content>
        {initializing ? (
          <div style={{ textAlign: "center", padding: "2em" }}>
            <Loader active inline="centered" content="Loading available doctors..." />
          </div>
        ) : (
          <Form error={!!error}>
            <Header as="h4" color="teal">
              <Icon name="info circle" />
              Patient Information
            </Header>
            <p>
              <strong>Name:</strong> {patient && (patient.fullName || patient.name)}
            </p>
            <p>
              <strong>Wallet:</strong>{" "}
              {patient && (patient.walletAddress || patient.wallet) && 
                (patient.walletAddress || patient.wallet).slice(0, 20) + "..."}
            </p>

            <Divider />

            <Form.Field required>
              <label>
                <Icon name="building" /> Select Department
              </label>
              <Dropdown
                placeholder="Choose Department"
                fluid
                selection
                search
                options={departments}
                value={selectedDepartment}
                onChange={(e, { value }) => {
                  console.log("Department selected:", value);
                  setSelectedDepartment(value);
                  setSelectedDoctor("");
                  setError("");
                }}
                disabled={departments.length === 0}
                noResultsMessage="No departments available"
              />
            </Form.Field>

            {selectedDepartment && (
              <Form.Field required>
                <label>
                  <Icon name="user md" /> Select Doctor
                </label>
                <Dropdown
                  placeholder={loadingDoctors ? "Loading doctors..." : "Choose Doctor"}
                  fluid
                  selection
                  search
                  options={doctors}
                  value={selectedDoctor}
                  onChange={(e, { value }) => {
                    console.log("Doctor selected:", value);
                    setSelectedDoctor(value);
                  }}
                  disabled={loadingDoctors || doctors.length === 0}
                  loading={loadingDoctors}
                  noResultsMessage="No doctors available in this department"
                />
              </Form.Field>
            )}

            <Form.TextArea
              label="Reason for Transfer"
              placeholder="e.g., Specialist consultation required, Patient request, Second opinion needed, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={3}
            />

            {error && <Message error header="Transfer Error" content={error} />}
          </Form>
        )}
      </Modal.Content>

      <Modal.Actions>
        <Button onClick={handleClose} disabled={loading}>
          <Icon name="cancel" /> Cancel
        </Button>
        <Button
          color="teal"
          onClick={handleTransfer}
          loading={loading}
          disabled={loading || initializing || !selectedDoctor || !reason.trim()}
        >
          <Icon name="exchange" /> Transfer Patient
        </Button>
      </Modal.Actions>
    </Modal>
  );
}