import React, { useEffect, useState } from "react";
import { Menu, Container, Icon } from "semantic-ui-react";
import { useRouter } from "next/router";
import { useWeb3 } from "../context/Web3Context";

export default function DoctorLayout({ children }) {
  const router = useRouter();
  const { account, contracts, isLoading, disconnect } = useWeb3();
  const [doctorName, setDoctorName] = useState("");
  const [doctorDept, setDoctorDept] = useState("");

  useEffect(() => {
    const loadDoctorInfo = async () => {
      if (!account || !contracts.doctorRegistry) return;

      try {
        console.log("Loading info for doctor:", account);
        const doctorData = await contracts.doctorRegistry.getDoctorByAddress(account);
        console.log("Doctor data:", doctorData);

        setDoctorName(doctorData[1]);
        setDoctorDept(doctorData[4]);
      } catch (err) {
        console.error("Error loading doctor info:", err);
      }
    };

    if (!isLoading) {
      loadDoctorInfo();
    }
  }, [account, contracts.doctorRegistry, isLoading]);

  const handleLogout = async () => {
    await disconnect();
    localStorage.removeItem("isDoctor");
    router.push("/");
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      <Menu
        inverted
        color="teal"
        size="large"
        style={{
          borderRadius: 0,
          margin: 0,
          background: "linear-gradient(90deg, #009688 0%, #00796B 100%)",
          fontSize: "1.1em",
        }}
      >
        <Container
          style={{
            display: "flex",
            alignItems: "center",
            minHeight: "60px",
          }}
        >
          <Menu.Item
            header
            onClick={() => router.push("/doctor")}
            style={{
              fontSize: "1.2em",
              padding: "1.2em 1.5em",
              fontWeight: "bold",
            }}
          >
            <Icon name="hospital" /> Doctor Dashboard
          </Menu.Item>

          <Menu.Item
            onClick={() => router.push("/doctor/add-patient")}
            style={{ fontSize: "1.1em", padding: "1.2em 1.5em" }}
          >
            <Icon name="user plus" /> Add Patient
          </Menu.Item>

          <Menu.Item
            onClick={() => router.push("/doctor/view-patients")}
            style={{ fontSize: "1.1em", padding: "1.2em 1.5em" }}
          >
            <Icon name="users" /> View Patients
          </Menu.Item>

          <Menu.Item
            onClick={() => router.push("/doctor/add-record")}
            style={{ fontSize: "1.1em", padding: "1.2em 1.5em" }}
          >
            <Icon name="file alternate" /> Add Record
          </Menu.Item>

          <Menu.Item
            onClick={() => router.push("/doctor/view-record")}
            style={{ fontSize: "1.1em", padding: "1.2em 1.5em" }}
          >
            <Icon name="folder open" /> View Records
          </Menu.Item>

          <Menu.Menu position="right">
            <Menu.Item
              onClick={handleLogout}
              style={{ fontSize: "1.1em", padding: "1.2em 1.5em" }}
            >
              <Icon name="sign-out" /> Logout
            </Menu.Item>
          </Menu.Menu>
        </Container>
      </Menu>

      <Container style={{ marginTop: "2em", marginBottom: "2em" }}>
        {children}
      </Container>
    </div>
  );
}