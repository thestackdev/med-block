import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import DoctorLayout from "../../components/DoctorLayout";
import { useWeb3 } from "../../context/Web3Context";

export default function DoctorDashboard() {
  const router = useRouter();
  const { account, contracts, isLoading: web3Loading } = useWeb3();
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [totalPatients, setTotalPatients] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDoctorData = async () => {
      if (!account || !contracts.doctorRegistry || !contracts.healthRecord) return;

      try {
        const isDoctor = await contracts.doctorRegistry.isDoctor(account);
        if (!isDoctor) {
          setError("Access denied. Only registered doctors can access this dashboard.");
          return;
        }

        const doctorData = await contracts.doctorRegistry.getDoctorByAddress(account);
        setDoctorInfo({
          wallet: doctorData[0],
          fullName: doctorData[1],
          age: doctorData[2].toString(),
          specialization: doctorData[3],
          department: doctorData[4],
          licenseId: doctorData[5],
        });

        const patients = await contracts.healthRecord.getMyPatients();
        setTotalPatients(patients.length);
      } catch (err) {
        console.error("Error loading doctor data:", err);
        setError(err.reason || err.message);
      } finally {
        setLoading(false);
      }
    };

    if (!web3Loading) {
      loadDoctorData();
    }
  }, [account, contracts, web3Loading]);

  if (loading) {
    return (
      <DoctorLayout>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "70vh",
          }}
        >
          <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-teal-600"></div>
        </div>
      </DoctorLayout>
    );
  }

  if (error) {
    return (
      <DoctorLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="bg-white rounded-2xl p-10 shadow-2xl text-center max-w-md">
            <h2 className="text-3xl font-bold text-red-600 mb-4">Access Denied</h2>
            <p className="text-gray-700 mb-6">{error}</p>
            <button
              onClick={() => router.push("/")}
              className="bg-gradient-to-r from-teal-500 to-green-500 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg transition"
            >
              Go to Home
            </button>
          </div>
        </div>
      </DoctorLayout>
    );
  }

  return (
    <DoctorLayout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Welcome Header */}
        <h1 className="text-4xl font-bold mb-8">
          Welcome, Dr. {doctorInfo?.fullName}
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card - Takes 2 columns */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-teal-600 to-teal-500 p-6 text-white">
                <h2 className="text-2xl font-bold mb-1">Your Profile</h2>
                <p className="text-teal-100">Doctor Information</p>
              </div>

              {/* Body */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-sm">
                    <p className="text-gray-600 font-semibold text-sm uppercase mb-2">
                      Full Name
                    </p>
                    <p className="text-xl font-bold text-gray-800">
                      Dr. {doctorInfo?.fullName}
                    </p>
                  </div>

                  {/* Age */}
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-sm">
                    <p className="text-gray-600 font-semibold text-sm uppercase mb-2">
                      Age
                    </p>
                    <p className="text-xl font-bold text-gray-800">
                      {doctorInfo?.age} years
                    </p>
                  </div>

                  {/* Specialization */}
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-sm">
                    <p className="text-gray-600 font-semibold text-sm uppercase mb-2">
                      Specialization
                    </p>
                    <p className="text-xl font-bold text-gray-800">
                      {doctorInfo?.specialization}
                    </p>
                  </div>

                  {/* Department */}
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-sm">
                    <p className="text-gray-600 font-semibold text-sm uppercase mb-2">
                      Department
                    </p>
                    <p className="text-xl font-bold text-gray-800">
                      {doctorInfo?.department}
                    </p>
                  </div>

                  {/* License ID */}
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-sm md:col-span-2">
                    <p className="text-gray-600 font-semibold text-sm uppercase mb-2">
                      License ID
                    </p>
                    <p className="text-xl font-bold text-gray-800">
                      {doctorInfo?.licenseId}
                    </p>
                  </div>

                  {/* Wallet Address */}
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-sm md:col-span-2">
                    <p className="text-gray-600 font-semibold text-sm uppercase mb-2">
                      Wallet Address
                    </p>
                    <p className="text-sm font-mono text-gray-700 break-all">
                      {doctorInfo?.wallet}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics Card - Takes 1 column */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 overflow-hidden h-full">
              {/* Header */}
              <div className="bg-gradient-to-r from-teal-600 to-teal-500 p-6 text-white">
                <h2 className="text-2xl font-bold mb-1">Statistics</h2>
                <p className="text-teal-100">Patient Overview</p>
              </div>

              {/* Body */}
              <div className="p-6 flex flex-col justify-up items-center h-full">
                <div className="text-center">
                  <div className="bg-teal-50 rounded-2xl p-8 border-2 border-teal-200 mb-4">
                    <p className="text-8xl font-bold text-teal-600 mb-4">
                      {totalPatients}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mb-2">
                      TOTAL PATIENTS
                    </p>
                    <p className="text-teal-800 text-lg">
                      Active under your care
                    </p>
                  </div>

                  <button
                    onClick={() => router.push("/doctor/view-patients")}
                    className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white px-6 py-3 rounded-xl font-bold text-lg transition duration-200 shadow-md"
                  >
                    View All Patients
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DoctorLayout>
  );
}