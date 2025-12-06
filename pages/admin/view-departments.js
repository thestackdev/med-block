import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import Link from "next/link";
import { useWeb3 } from "../../context/Web3Context";

export default function ViewDepartments() {
  const { contracts, isLoading: web3Loading } = useWeb3();
  const departments = [
    "Cardiology",
    "Neurology",
    "Orthopedics",
    "Dermatology",
    "Pediatrics",
    "Oncology",
    "Gastroenterology",
    "Radiology",
    "Emergency Medicine",
    "General Surgery",
    "Dental",
    "Gynocology"
  ];

  const [doctorCount, setDoctorCount] = useState({});
  const [loading, setLoading] = useState(true);

  const loadDoctorsFromBlockchain = async () => {
    if (!contracts.doctorRegistry) return;

    try {
      const allDocs = await contracts.doctorRegistry.getAllDoctors();

      const countByDept = {};
      departments.forEach((dept) => {
        countByDept[dept] = allDocs.filter(
          (d) => d.department && d.department.toLowerCase() === dept.toLowerCase()
        ).length;
      });

      setDoctorCount(countByDept);
    } catch (err) {
      console.error("Error loading doctor data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!web3Loading && contracts.doctorRegistry) {
      loadDoctorsFromBlockchain();
    }
  }, [contracts, web3Loading]);

  return (
    <AdminLayout>
      <h2 className="text-3xl font-bold mb-8 text-center text-gray-800">
        Department Overview
      </h2>

      {loading ? (
        <p className="text-center text-gray-500">Loading departments...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((dept) => (
            <div
              key={dept}
              className="bg-gray-50 p-6 rounded-lg shadow hover:shadow-lg transition"
            >
              <h3 className="text-lg font-semibold text-gray-700 mb-1">{dept}</h3>
              <p className="text-sm text-gray-600 mb-4">
                Doctors: {doctorCount[dept] || 0}
              </p>
              <Link
                href={`/admin/department/${encodeURIComponent(dept)}`}
                className="inline-block mt-2 bg-cyan-600 hover:bg-black-500 text-white px-4 py-2 rounded"
              >
                View Doctors
              </Link>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
