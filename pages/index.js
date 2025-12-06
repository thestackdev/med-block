import { useState } from "react";
import { useRouter } from "next/router";
import {
  Container,
  Header,
  Button,
  Grid,
  Segment,
  Icon,
  Message,
  Menu,
  Form,
  Card,
  Input,
} from "semantic-ui-react";
import { useWeb3 } from "../context/Web3Context";

export default function Home() {
  const router = useRouter();
  const {
    account: web3AuthAccount,
    isConnected,
    isLoading: web3AuthLoading,
    contracts,
    networkError,
    connectedChainId,
    expectedChainId,
    connectWithGoogle,
    connectWithEmail,
    connectWithMetaMask,
    switchToSepolia,
  } = useWeb3();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("login");
  const [emailInput, setEmailInput] = useState("");
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [contactSuccess, setContactSuccess] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await connectWithGoogle();
      setError("");
    } catch (err) {
      console.error("Google login error:", err);
      setError("Google login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleMetaMaskLogin = async () => {
    try {
      setLoading(true);
      await connectWithMetaMask();
      setError("");
    } catch (err) {
      console.error("MetaMask login error:", err);
      setError(err.message || "MetaMask login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!emailInput) {
      setError("Please enter your email");
      return;
    }
    try {
      setLoading(true);
      await connectWithEmail(emailInput);
      setError("");
      setShowEmailInput(false);
    } catch (err) {
      console.error("Email login error:", err);
      setError("Email login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (role) => {
    try {
      setLoading(true);
      setError("");

      // Check for Web3Auth connection
      if (!isConnected || !web3AuthAccount) {
        setError("Please login with Google or Email first!");
        setLoading(false);
        return;
      }

      // Check for network errors
      if (networkError) {
        setError(networkError);
        setLoading(false);
        return;
      }

      // Check contracts are initialized
      if (!contracts.doctorRegistry || !contracts.healthRecord) {
        setError("Contracts not initialized. Make sure contracts are deployed on Sepolia testnet.");
        setLoading(false);
        return;
      }

      console.log(`Attempting ${role} login for:`, web3AuthAccount);

      if (role === "admin") {
        const isAdmin = await contracts.doctorRegistry.isAdmin(web3AuthAccount);
        console.log("Is admin?", isAdmin);

        if (isAdmin) {
          localStorage.setItem("isAdmin", "true");
          router.push("/admin");
        } else {
          setError("Access denied. You are not the admin.");
        }
      } else if (role === "doctor") {
        const isDoctor = await contracts.doctorRegistry.isDoctor(web3AuthAccount);
        console.log("Is doctor?", isDoctor);

        if (isDoctor) {
          localStorage.setItem("isDoctor", "true");
          router.push("/doctor");
        } else {
          setError("Access denied. You are not a registered doctor.");
        }
      } else if (role === "patient") {
        const isPatient = await contracts.healthRecord.isPatient(web3AuthAccount);
        console.log("Is patient?", isPatient);

        if (isPatient) {
          localStorage.setItem("isPatient", "true");
          router.push("/patient");
        } else {
          setError(
            "Access denied. You are not a registered patient. Please contact your doctor to register."
          );
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      if (err.message?.includes("CALL_EXCEPTION")) {
        setError("Connection error. Make sure you're connected to Sepolia and contracts are deployed.");
      } else {
        setError(err.reason || err.message || "Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleContactSubmit = () => {
    if (contactForm.name && contactForm.email && contactForm.message) {
      setContactSuccess(true);
      setContactForm({ name: "", email: "", message: "" });
      setTimeout(() => setContactSuccess(false), 5000);
    }
  };

  const scrollToSection = (section) => {
    setActiveSection(section);
    document.getElementById(section)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8f9fa" }}>
      {/* Navigation Bar */}
      <Menu
        fixed="top"
        size="large"
        style={{
          backgroundColor: "white",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        }}
      >
        <Container>
          <Menu.Item header style={{ fontSize: "1.3em", color: "#009688" }}>
            <Icon name="heartbeat" />
            Secure Med-Block
          </Menu.Item>
          <Menu.Menu position="right">
            <Menu.Item
              active={activeSection === "login"}
              onClick={() => scrollToSection("login")}
            >
              Login
            </Menu.Item>
            <Menu.Item
              active={activeSection === "about"}
              onClick={() => scrollToSection("about")}
            >
              About
            </Menu.Item>
            <Menu.Item
              active={activeSection === "features"}
              onClick={() => scrollToSection("features")}
            >
              Features
            </Menu.Item>
            <Menu.Item
              active={activeSection === "contact"}
              onClick={() => scrollToSection("contact")}
            >
              Contact
            </Menu.Item>
          </Menu.Menu>
        </Container>
      </Menu>

      {/* Login Section */}
      <div
        id="login"
        style={{
          padding: "8em 2em 5em 2em",
          marginTop: "3.5em",
          background: "linear-gradient(135deg, #009688 0%, #00bfa5 100%)",
          color: "white",
        }}
      >
        <Container>
          <Header
            as="h1"
            style={{
              fontSize: "3em",
              color: "white",
              marginBottom: "0.2em",
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            <Icon name="heartbeat" />
            Secure Med-Block
          </Header>
          <Header
            as="h2"
            style={{
              fontSize: "1.5em",
              color: "rgba(255,255,255,0.9)",
              fontWeight: "300",
              marginBottom: "2em",
              textAlign: "center",
            }}
          >
            Blockchain-Based Healthcare Record Management System
          </Header>

          {/* Network Error Banner with Clear Session Button */}
          {networkError && (
            <Message negative style={{ maxWidth: "600px", margin: "0 auto 2em auto" }}>
              <Message.Header>Network Error</Message.Header>
              <p>{networkError}</p>
              <div style={{ marginTop: "1em" }}>
                <Button
                  color="red"
                  onClick={() => {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.reload();
                  }}
                >
                  <Icon name="refresh" /> Clear Session & Reload
                </Button>
                <p style={{ marginTop: "0.5em", fontSize: "0.9em", color: "#666" }}>
                  This will log you out and reconnect to the correct network.
                </p>
              </div>
            </Message>
          )}

          {!web3AuthAccount ? (
            <div style={{ textAlign: "center", marginBottom: "3em" }}>
              <Segment
                raised
                style={{
                  padding: "3em",
                  maxWidth: "500px",
                  margin: "0 auto",
                  backgroundColor: "white",
                }}
              >
                <Icon name="user circle" size="huge" color="teal" />
                <Header as="h3" style={{ marginTop: "1em", color: "#2c3e50" }}>
                  Connect to Access
                </Header>
                <p style={{ color: "#666", marginBottom: "2em" }}>
                  Choose your preferred login method
                </p>

                <Button
                  size="large"
                  color="orange"
                  fluid
                  onClick={handleMetaMaskLogin}
                  loading={loading}
                  disabled={loading}
                  style={{ marginBottom: "1em" }}
                >
                  <Icon name="ethereum" /> Connect with MetaMask
                </Button>

                <div style={{ textAlign: "center", color: "#999", margin: "1em 0" }}>
                  — or use social login —
                </div>

                <Button
                  size="large"
                  color="red"
                  fluid
                  onClick={handleGoogleLogin}
                  loading={loading}
                  disabled={loading}
                  style={{ marginBottom: "1em" }}
                >
                  <Icon name="google" /> Continue with Google
                </Button>

                {!showEmailInput ? (
                  <Button
                    size="large"
                    color="blue"
                    fluid
                    onClick={() => setShowEmailInput(true)}
                    style={{ marginBottom: "1em" }}
                  >
                    <Icon name="mail" /> Continue with Email
                  </Button>
                ) : (
                  <div style={{ marginBottom: "1em" }}>
                    <Input
                      fluid
                      placeholder="Enter your email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      style={{ marginBottom: "0.5em" }}
                    />
                    <Button
                      size="large"
                      color="blue"
                      fluid
                      onClick={handleEmailLogin}
                      loading={loading}
                      disabled={loading}
                    >
                      <Icon name="sign in" /> Login with Email
                    </Button>
                  </div>
                )}
              </Segment>
            </div>
          ) : (
            <div style={{ backgroundColor: "white", padding: "3em", borderRadius: "15px" }}>
              {/* Connected Account Display */}
              <div style={{ textAlign: "center", marginBottom: "2em" }}>
                <p style={{ color: "#2c3e50", marginBottom: "0.5em", fontWeight: "500" }}>Connected as:</p>
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  backgroundColor: "#e8f5e9",
                  padding: "0.8em 1.5em",
                  borderRadius: "8px",
                  fontFamily: "monospace",
                  fontSize: "1em",
                  border: "1px solid #4caf50"
                }}>
                  <span style={{ wordBreak: "break-all", color: "#1b5e20" }}>{web3AuthAccount}</span>
                  <Button
                    icon="copy"
                    size="mini"
                    color="green"
                    style={{ marginLeft: "1em" }}
                    title="Copy address"
                    onClick={() => {
                      navigator.clipboard.writeText(web3AuthAccount);
                      alert("Address copied!");
                    }}
                  />
                </div>
              </div>

              <Grid columns={3} stackable divided>
                <Grid.Column textAlign="center">
                  <div
                    style={{
                      padding: "2.5em",
                      borderRadius: "15px",
                      backgroundColor: "#e3f2fd",
                      boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
                    }}
                  >
                    <Icon
                      name="shield alternate"
                      size="huge"
                      color="blue"
                      style={{ marginBottom: "0.5em" }}
                    />
                    <Header as="h3" color="blue">
                      Admin
                    </Header>
                    <p style={{ color: "#666", marginBottom: "1.5em" }}>
                      Manage doctors, patients, and system settings
                    </p>
                    <Button
                      fluid
                      color="blue"
                      size="large"
                      onClick={() => handleLogin("admin")}
                      loading={loading}
                      disabled={loading}
                    >
                      Login as Admin
                    </Button>
                  </div>
                </Grid.Column>

                <Grid.Column textAlign="center">
                  <div
                    style={{
                      padding: "2.5em",
                      borderRadius: "15px",
                      backgroundColor: "#e0f2f1",
                      boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
                    }}
                  >
                    <Icon
                      name="user md"
                      size="huge"
                      color="teal"
                      style={{ marginBottom: "0.5em" }}
                    />
                    <Header as="h3" color="teal">
                      Doctor
                    </Header>
                    <p style={{ color: "#666", marginBottom: "1.5em" }}>
                      Register patients and manage health records
                    </p>
                    <Button
                      fluid
                      color="teal"
                      size="large"
                      onClick={() => handleLogin("doctor")}
                      loading={loading}
                      disabled={loading}
                    >
                      Login as Doctor
                    </Button>
                  </div>
                </Grid.Column>

                <Grid.Column textAlign="center">
                  <div
                    style={{
                      padding: "2.5em",
                      borderRadius: "15px",
                      backgroundColor: "#fce4ec",
                      boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
                    }}
                  >
                    <Icon
                      name="user"
                      size="huge"
                      color="pink"
                      style={{ marginBottom: "0.5em" }}
                    />
                    <Header as="h3" color="pink">
                      Patient
                    </Header>
                    <p style={{ color: "#666", marginBottom: "1.5em" }}>
                      View your medical records and history
                    </p>
                    <Button
                      fluid
                      color="pink"
                      size="large"
                      onClick={() => handleLogin("patient")}
                      loading={loading}
                      disabled={loading}
                    >
                      Login as Patient
                    </Button>
                  </div>
                </Grid.Column>
              </Grid>

              {error && (
                <Message
                  negative
                  style={{ marginTop: "2em" }}
                  onDismiss={() => setError("")}
                >
                  <Message.Header>Login Error</Message.Header>
                  <p>{error}</p>
                </Message>
              )}
            </div>
          )}
        </Container>
      </div>

      {/* About Section */}
      <div
        id="about"
        style={{
          padding: "5em 2em",
          backgroundColor: "white",
        }}
      >
        <Container>
          <Header
            as="h2"
            textAlign="center"
            style={{
              fontSize: "2.5em",
              color: "#2c3e50",
              marginBottom: "0.5em",
            }}
          >
            About Secure Med-Block
          </Header>
          <p
            style={{
              textAlign: "center",
              fontSize: "1.1em",
              color: "#666",
              marginBottom: "3em",
              maxWidth: "800px",
              margin: "0 auto 3em auto",
            }}
          >
          </p>

          <Grid columns={2} stackable style={{ marginTop: "3em" }}>
            <Grid.Column>
              <Segment
                raised
                style={{ padding: "2em", minHeight: "250px", border: "none" }}
              >
                <Header as="h3" style={{ color: "#009688" }}>
                  <Icon name="shield alternate" />
                  Our Mission
                </Header>
                <p style={{ fontSize: "1.05em", lineHeight: "1.8", color: "#555" }}>
                  To provide a secure, transparent, and patient-centric
                  healthcare record management system powered by blockchain
                  technology. We aim to give patients full control over their
                  medical data while ensuring healthcare providers have seamless
                  access when needed.
                </p>
              </Segment>
            </Grid.Column>

            <Grid.Column>
              <Segment
                raised
                style={{ padding: "2em", minHeight: "250px", border: "none" }}
              >
                <Header as="h3" style={{ color: "#009688" }}>
                  <Icon name="certificate" />
                  Why Blockchain?
                </Header>
                <p style={{ fontSize: "1.05em", lineHeight: "1.8", color: "#555" }}>
                  Blockchain technology ensures that health records are
                  immutable, transparent, and secure. Every transaction is
                  recorded on the Ethereum blockchain, preventing unauthorized
                  modifications and ensuring complete audit trails of all medical
                  data access.
                </p>
              </Segment>
            </Grid.Column>
          </Grid>
        </Container>
      </div>

      {/* Features Section */}
      <div
        id="features"
        style={{
          padding: "5em 2em",
          backgroundColor: "#f8f9fa"
        }}
      >
        <Container>
          <Header
            as="h2"
            textAlign="center"
            style={{
              fontSize: "2.5em",
              color: "#2c3e50",
              marginBottom: "0.5em",
            }}
          >
            Key Features
          </Header>
          <p
            style={{
              textAlign: "center",
              fontSize: "1.1em",
              color: "#666",
              marginBottom: "3em",
            }}
          >
            Discover what makes our platform unique
          </p>

          <Grid columns={3} stackable>
            <Grid.Column>
              <Card
                fluid
                style={{
                  textAlign: "center",
                  padding: "2em",
                  border: "none",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
                }}
              >
                <Icon
                  name="lock"
                  size="huge"
                  color="teal"
                  style={{ marginBottom: "0.5em" }}
                />
                <Card.Content>
                  <Card.Header>Secure and Encrypted</Card.Header>
                  <Card.Description style={{ marginTop: "1em" }}>
                    All medical records are encrypted and stored securely on IPFS
                    with blockchain verification
                  </Card.Description>
                </Card.Content>
              </Card>
            </Grid.Column>

            <Grid.Column>
              <Card
                fluid
                style={{
                  textAlign: "center",
                  padding: "2em",
                  border: "none",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
                }}
              >
                <Icon
                  name="exchange"
                  size="huge"
                  color="blue"
                  style={{ marginBottom: "0.5em" }}
                />
                <Card.Content>
                  <Card.Header>Patient Control</Card.Header>
                  <Card.Description style={{ marginTop: "1em" }}>
                    Patients have full ownership and control over who can access
                    their health data
                  </Card.Description>
                </Card.Content>
              </Card>
            </Grid.Column>

            <Grid.Column>
              <Card
                fluid
                style={{
                  textAlign: "center",
                  padding: "2em",
                  border: "none",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
                }}
              >
                <Icon
                  name="history"
                  size="huge"
                  color="orange"
                  style={{ marginBottom: "0.5em" }}
                />
                <Card.Content>
                  <Card.Header>Complete Audit Trail</Card.Header>
                  <Card.Description style={{ marginTop: "1em" }}>
                    Every access and modification is permanently recorded on the
                    blockchain
                  </Card.Description>
                </Card.Content>
              </Card>
            </Grid.Column>

            <Grid.Column>
              <Card
                fluid
                style={{
                  textAlign: "center",
                  padding: "2em",
                  border: "none",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
                }}
              >
                <Icon
                  name="doctor"
                  size="huge"
                  color="pink"
                  style={{ marginBottom: "0.5em" }}
                />
                <Card.Content>
                  <Card.Header>Doctor Management</Card.Header>
                  <Card.Description style={{ marginTop: "1em" }}>
                    Verified healthcare providers can register and manage patient
                    records securely
                  </Card.Description>
                </Card.Content>
              </Card>
            </Grid.Column>

            <Grid.Column>
              <Card
                fluid
                style={{
                  textAlign: "center",
                  padding: "2em",
                  border: "none",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
                }}
              >
                <Icon
                  name="ethereum"
                  size="huge"
                  color="violet"
                  style={{ marginBottom: "0.5em" }}
                />
                <Card.Content>
                  <Card.Header>Blockchain Powered</Card.Header>
                  <Card.Description style={{ marginTop: "1em" }}>
                    Built on Ethereum blockchain ensuring transparency and
                    immutability
                  </Card.Description>
                </Card.Content>
              </Card>
            </Grid.Column>

            <Grid.Column>
              <Card
                fluid
                style={{
                  textAlign: "center",
                  padding: "2em",
                  border: "none",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
                }}
              >
                <Icon
                  name="cloud upload"
                  size="huge"
                  color="green"
                  style={{ marginBottom: "0.5em" }}
                />
                <Card.Content>
                  <Card.Header>IPFS Storage</Card.Header>
                  <Card.Description style={{ marginTop: "1em" }}>
                    Decentralized storage ensures data availability and
                    redundancy
                  </Card.Description>
                </Card.Content>
              </Card>
            </Grid.Column>
          </Grid>
        </Container>
      </div>

      {/* Contact Section */}
      <div
        id="contact"
        style={{
          padding: "5em 2em",
          backgroundColor: "white",
        }}
      >
        <Container>
          <Header
            as="h2"
            textAlign="center"
            style={{
              fontSize: "2.5em",
              color: "#2c3e50",
              marginBottom: "0.5em",
            }}
          >
            Contact Us
          </Header>
          <p
            style={{
              textAlign: "center",
              fontSize: "1.1em",
              color: "#666",
              marginBottom: "3em",
            }}
          >
            Have questions? We would love to hear from you
          </p>
          <Grid stackable centered>
          <Grid.Column width={10}>
            <Segment
              raised
              style={{ padding: "2em", border: "none" }}
            >
              <Header as="h3" style={{ color: "#009688", textAlign: "center" }}>
                <Icon name="send" />
                Send us a Message
              </Header>
              <Form style={{ marginTop: "2em" }}>
                <Form.Input
                  label="Name"
                  placeholder="Your name"
                  value={contactForm.name}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, name: e.target.value })
                  }
                />
                <Form.Input
                  label="Email"
                  placeholder="your.email@example.com"
                  type="email"
                  value={contactForm.email}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, email: e.target.value })
                  }
                />
                <Form.TextArea
                  label="Message"
                  placeholder="How can we help you?"
                  rows={4}
                  value={contactForm.message}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, message: e.target.value })
                  }
                />
                <div style={{ textAlign: "center" }}>
                  <Button
                    color="teal"
                    size="large"
                    onClick={handleContactSubmit}
                  >
                    <Icon name="paper plane" /> Send Message
                  </Button>
                </div>
              </Form>
              {contactSuccess && (
                <Message positive style={{ marginTop: "1em" }}>
                  <Icon name="check" /> Thank you! We will get back to you soon.
                </Message>
              )}
            </Segment>
          </Grid.Column>
        </Grid>
        </Container>
      </div>

      {/* Footer */}
      <div
        style={{
          backgroundColor: "#2c3e50",
          color: "white",
          padding: "3em 2em",
          textAlign: "center",
        }}
      >
        <Container>
          <Grid columns={3} stackable divided inverted>
            <Grid.Column>
              <Header as="h4" inverted>
                About
              </Header>
              <p style={{ opacity: 0.8 }}>
                Secure Med-Block is a revolutionary healthcare management system
                leveraging blockchain technology for secure medical records.
              </p>
            </Grid.Column>

            <Grid.Column>
              <Header as="h4" inverted>
                Quick Links
              </Header>
              <p>
                <a href="#login"
                  style={{ color: "white", opacity: 0.8, display: "block", marginBottom: "0.5em" }}
                >
                  Login
                </a>
                <a href="#about"
                  style={{ color: "white", opacity: 0.8, display: "block", marginBottom: "0.5em" }}
                >
                  About
                </a>
                <a href="#features"
                  style={{ color: "white", opacity: 0.8, display: "block", marginBottom: "0.5em" }}
                >
                  Features
                </a>
                <a href="#contact"
                  style={{ color: "white", opacity: 0.8, display: "block" }}
                >
                  Contact
                </a>
              </p>
            </Grid.Column>

            <Grid.Column>
              <Header as="h4" inverted>
                Technology
              </Header>
              <p style={{ opacity: 0.8 }}>
                <Icon name="ethereum" /> Ethereum Blockchain
                <br />
                <Icon name="shield" /> Smart Contracts
                <br />
                <Icon name="database" /> IPFS Storage
              </p>
            </Grid.Column>
          </Grid>

          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.2)",
              marginTop: "2em",
              paddingTop: "2em",
              opacity: 0.7,
            }}
          >
            <p>
              2025 Secure Med-Block. All rights reserved. Powered by Ethereum Blockchain
            </p>
          </div>
        </Container>
      </div>
    </div>
  );
}
