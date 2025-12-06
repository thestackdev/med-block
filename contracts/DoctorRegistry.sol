// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DoctorRegistry {
    struct Doctor {
        address walletAddress;
        string fullName;
        uint256 age;
        string specialization;
        string department;
        string licenseId;
        bool exists;
        bool isActive;
        uint256 registeredDate;
        uint256 removedDate;
    }

    struct DoctorCrypto {
        bytes publicKey;
        bytes32 attributeHash;
        uint256 lastUpdated;
    }

    address public admin;
    mapping(address => Doctor) public doctors;
    mapping(address => DoctorCrypto) public doctorCrypto;
    address[] public doctorAddresses;

    event DoctorRegistered(
        address indexed wallet,
        string name,
        string department,
        uint256 timestamp
    );

    event DoctorRemoved(
        address indexed wallet,
        address indexed removedBy,
        uint256 timestamp
    );

    event DoctorReactivated(
        address indexed wallet,
        address indexed reactivatedBy,
        uint256 timestamp
    );

    event PublicKeyUpdated(address indexed wallet, uint256 timestamp);
    event AttributesUpdated(address indexed wallet, bytes32 attributeHash, uint256 timestamp);

    constructor() {
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    // Register a new doctor
    function registerDoctor(
        address wallet,
        string memory fullName,
        uint256 age,
        string memory specialization,
        string memory department,
        string memory licenseId
    ) external onlyAdmin {
        require(wallet != address(0), "Invalid wallet address");
        require(!doctors[wallet].exists, "Doctor already registered");
        require(bytes(fullName).length > 0, "Name cannot be empty");
        require(bytes(licenseId).length > 0, "License ID required");

        doctors[wallet] = Doctor({
            walletAddress: wallet,
            fullName: fullName,
            age: age,
            specialization: specialization,
            department: department,
            licenseId: licenseId,
            exists: true,
            isActive: true,
            registeredDate: block.timestamp,
            removedDate: 0
        });

        doctorAddresses.push(wallet);

        emit DoctorRegistered(wallet, fullName, department, block.timestamp);
    }

    // 🆕 REMOVE DOCTOR (Soft delete)
    function removeDoctor(address wallet) external onlyAdmin {
        require(doctors[wallet].exists, "Doctor not found");
        require(doctors[wallet].isActive, "Doctor already removed");

        doctors[wallet].isActive = false;
        doctors[wallet].removedDate = block.timestamp;

        emit DoctorRemoved(wallet, msg.sender, block.timestamp);
    }

    // 🆕 REACTIVATE DOCTOR
    function reactivateDoctor(address wallet) external onlyAdmin {
        require(doctors[wallet].exists, "Doctor not found");
        require(!doctors[wallet].isActive, "Doctor is already active");

        doctors[wallet].isActive = true;
        doctors[wallet].removedDate = 0;

        emit DoctorReactivated(wallet, msg.sender, block.timestamp);
    }

function permanentlyRemoveDoctor(address wallet) external onlyAdmin {
    require(doctors[wallet].exists, "Doctor not found");
    
    // Mark as non-existent
    doctors[wallet].exists = false;
    
    // Remove from doctorAddresses array
    for (uint256 i = 0; i < doctorAddresses.length; i++) {
        if (doctorAddresses[i] == wallet) {
            // Move last element to this position and pop
            doctorAddresses[i] = doctorAddresses[doctorAddresses.length - 1];
            doctorAddresses.pop();
            break;
        }
    }
    
    emit DoctorRemoved(wallet, msg.sender, block.timestamp);
}
    // Check if an address is a registered and ACTIVE doctor
    function isDoctor(address _addr) external view returns (bool) {
        return doctors[_addr].exists && doctors[_addr].isActive;
    }

    // Check if an address is the admin
    function isAdmin(address _addr) external view returns (bool) {
        return _addr == admin;
    }

    // Get doctor details by wallet address
    function getDoctorByAddress(address _doctor)
        external
        view
        returns (
            address walletAddress,
            string memory fullName,
            uint256 age,
            string memory specialization,
            string memory department,
            string memory licenseId
        )
    {
        require(doctors[_doctor].exists, "Doctor not found");
        Doctor memory d = doctors[_doctor];
        return (
            d.walletAddress,
            d.fullName,
            d.age,
            d.specialization,
            d.department,
            d.licenseId
        );
    }

    // Get full doctor details including status
    function getDoctorFullDetails(address _doctor)
        external
        view
        returns (
            address walletAddress,
            string memory fullName,
            uint256 age,
            string memory specialization,
            string memory department,
            string memory licenseId,
            bool isActive,
            uint256 registeredDate,
            uint256 removedDate
        )
    {
        require(doctors[_doctor].exists, "Doctor not found");
        Doctor memory d = doctors[_doctor];
        return (
            d.walletAddress,
            d.fullName,
            d.age,
            d.specialization,
            d.department,
            d.licenseId,
            d.isActive,
            d.registeredDate,
            d.removedDate
        );
    }

    // Get all ACTIVE doctors
    function getAllDoctors() external view returns (Doctor[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < doctorAddresses.length; i++) {
            if (doctors[doctorAddresses[i]].isActive) {
                activeCount++;
            }
        }

        Doctor[] memory result = new Doctor[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < doctorAddresses.length; i++) {
            if (doctors[doctorAddresses[i]].isActive) {
                result[index] = doctors[doctorAddresses[i]];
                index++;
            }
        }
        return result;
    }

    // Get all doctors by department (active only)
    function getDoctorsByDepartment(string memory department) 
        external 
        view 
        returns (Doctor[] memory) 
    {
        uint256 count = 0;
        for (uint256 i = 0; i < doctorAddresses.length; i++) {
            Doctor storage doc = doctors[doctorAddresses[i]];
            if (doc.isActive && 
                keccak256(bytes(doc.department)) == keccak256(bytes(department))) {
                count++;
            }
        }

        Doctor[] memory result = new Doctor[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < doctorAddresses.length; i++) {
            Doctor storage doc = doctors[doctorAddresses[i]];
            if (doc.isActive && 
                keccak256(bytes(doc.department)) == keccak256(bytes(department))) {
                result[index] = doc;
                index++;
            }
        }
        return result;
    }

    // Get all departments (unique list)
    function getAllDepartments() external view returns (string[] memory) {
        string[] memory tempDepts = new string[](doctorAddresses.length);
        uint256 uniqueCount = 0;

        for (uint256 i = 0; i < doctorAddresses.length; i++) {
            if (!doctors[doctorAddresses[i]].isActive) continue;
            
            string memory dept = doctors[doctorAddresses[i]].department;
            bool exists = false;

            for (uint256 j = 0; j < uniqueCount; j++) {
                if (keccak256(bytes(tempDepts[j])) == keccak256(bytes(dept))) {
                    exists = true;
                    break;
                }
            }

            if (!exists) {
                tempDepts[uniqueCount] = dept;
                uniqueCount++;
            }
        }

        string[] memory result = new string[](uniqueCount);
        for (uint256 i = 0; i < uniqueCount; i++) {
            result[i] = tempDepts[i];
        }

        return result;
    }

    function getAllDoctorsIncludingInactive() external view onlyAdmin returns (Doctor[] memory) {
        Doctor[] memory result = new Doctor[](doctorAddresses.length);
        for (uint256 i = 0; i < doctorAddresses.length; i++) {
            result[i] = doctors[doctorAddresses[i]];
        }
        return result;
    }

    function registerPublicKey(bytes memory publicKey) external {
        require(doctors[msg.sender].exists && doctors[msg.sender].isActive, "Not a valid doctor");
        require(publicKey.length > 0, "Invalid public key");

        doctorCrypto[msg.sender].publicKey = publicKey;
        doctorCrypto[msg.sender].lastUpdated = block.timestamp;
        _updateAttributeHash(msg.sender);

        emit PublicKeyUpdated(msg.sender, block.timestamp);
    }

    function getPublicKey(address _doctor) external view returns (bytes memory) {
        return doctorCrypto[_doctor].publicKey;
    }

    function getAttributeHash(address _doctor) external view returns (bytes32) {
        return doctorCrypto[_doctor].attributeHash;
    }

    function _updateAttributeHash(address _doctor) internal {
        Doctor storage d = doctors[_doctor];
        bytes32 hash = keccak256(abi.encodePacked(
            d.walletAddress,
            d.department,
            d.specialization,
            d.licenseId,
            block.timestamp
        ));
        doctorCrypto[_doctor].attributeHash = hash;
        emit AttributesUpdated(_doctor, hash, block.timestamp);
    }

    function getDoctorCryptoInfo(address _doctor) external view returns (
        bytes memory publicKey,
        bytes32 attributeHash,
        uint256 lastUpdated
    ) {
        DoctorCrypto storage dc = doctorCrypto[_doctor];
        return (dc.publicKey, dc.attributeHash, dc.lastUpdated);
    }
}