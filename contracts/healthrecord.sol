// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IDoctorRegistry {
    function isDoctor(address _addr) external view returns (bool);
    function removeDoctor(address _doctor) external;
    function getDoctorByAddress(address _doctor) external view returns (
        address walletAddress,
        string memory fullName,
        uint256 age,
        string memory specialization,
        string memory department,
        string memory licenseId
    );
    function getPublicKey(address _doctor) external view returns (bytes memory);
}

interface IAccessPolicyRegistry {
    function verifyAccess(bytes32 policyHash, address user) external view returns (bool);
    function getUserPublicKey(address user) external view returns (bytes memory);
}

contract HealthRecord {
    struct Patient {
        uint256 patientId;
        address walletAddress;
        string fullName;
        uint256 age;
        string bloodGroup;
        string phone;
        address currentDoctor;
        bool exists;
        bool isActive;
    }

    struct Record {
        uint256 id;
        string description;
        string ipfsHash;
        string encryptedKeysCid;
        bytes32 policyHash;
        uint256 date;
        address addedBy;
    }

    struct DoctorAssignment {
        address doctor;
        uint256 assignedDate;
        uint256 transferredDate;
        string reason;
    }

    address public admin;
    IDoctorRegistry public doctorRegistry;
    IAccessPolicyRegistry public policyRegistry;
    uint256 private nextPatientId = 1;

    mapping(address => Patient) public patients;
    mapping(uint256 => address) public patientIdToWallet;
    mapping(address => Record[]) private patientRecords;
    mapping(address => DoctorAssignment[]) private patientDoctorHistory;
    address[] public patientAddresses;

    event PatientRegistered(
        uint256 indexed patientId,
        address indexed wallet,
        string name,
        address doctor
    );

    event RecordAdded(address indexed patient, uint256 recordId, address addedBy, bytes32 policyHash);
    
    event PatientTransferred(
        address indexed patient,
        address indexed fromDoctor,
        address indexed toDoctor,
        string reason,
        uint256 timestamp
    );

    event PatientRemoved(
        address indexed patient,
        address indexed removedBy,
        uint256 timestamp
    );

    constructor(address _doctorRegistry, address _policyRegistry) {
        require(_doctorRegistry != address(0), "Invalid DoctorRegistry address");
        require(_policyRegistry != address(0), "Invalid PolicyRegistry address");
        admin = msg.sender;
        doctorRegistry = IDoctorRegistry(_doctorRegistry);
        policyRegistry = IAccessPolicyRegistry(_policyRegistry);
    }

    modifier onlyDoctor() {
        require(doctorRegistry.isDoctor(msg.sender), "Only registered doctors allowed");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin allowed");
        _;
    }

    function registerPatient(
        address walletAddress,
        string memory fullName,
        uint256 age,
        string memory bloodGroup,
        string memory phone
    ) external onlyDoctor {
        require(walletAddress != address(0), "Invalid wallet address");
        require(!patients[walletAddress].exists, "Patient already exists");
        require(!doctorRegistry.isDoctor(walletAddress), "Doctor cannot be registered as a patient");
        require(walletAddress != admin, "Admin cannot be registered as a patient");

        uint256 newId = nextPatientId++;

        patients[walletAddress] = Patient({
            patientId: newId,
            walletAddress: walletAddress,
            fullName: fullName,
            age: age,
            bloodGroup: bloodGroup,
            phone: phone,
            currentDoctor: msg.sender,
            exists: true,
            isActive: true
        });

        patientIdToWallet[newId] = walletAddress;
        patientAddresses.push(walletAddress);

        patientDoctorHistory[walletAddress].push(DoctorAssignment({
            doctor: msg.sender,
            assignedDate: block.timestamp,
            transferredDate: 0,
            reason: "Initial Registration"
        }));

        emit PatientRegistered(newId, walletAddress, fullName, msg.sender);
    }

    function transferPatient(
        address patientWallet,
        address newDoctor,
        string memory reason
    ) external onlyDoctor {
        require(patients[patientWallet].exists, "Patient not registered");
        require(patients[patientWallet].isActive, "Patient is not active");
        require(patients[patientWallet].currentDoctor == msg.sender, "You are not the assigned doctor");
        require(doctorRegistry.isDoctor(newDoctor), "New doctor not registered");
        require(newDoctor != msg.sender, "Cannot transfer to yourself");

        DoctorAssignment[] storage history = patientDoctorHistory[patientWallet];
        if (history.length > 0) {
            history[history.length - 1].transferredDate = block.timestamp;
        }

        history.push(DoctorAssignment({
            doctor: newDoctor,
            assignedDate: block.timestamp,
            transferredDate: 0,
            reason: reason
        }));

        address oldDoctor = patients[patientWallet].currentDoctor;
        patients[patientWallet].currentDoctor = newDoctor;

        emit PatientTransferred(patientWallet, oldDoctor, newDoctor, reason, block.timestamp);
    }

    function removePatient(address patientWallet) external onlyDoctor {
        require(patients[patientWallet].exists, "Patient not registered");
        require(patients[patientWallet].currentDoctor == msg.sender, "You are not the assigned doctor");
        require(patients[patientWallet].isActive, "Patient already removed");

        patients[patientWallet].isActive = false;

        DoctorAssignment[] storage history = patientDoctorHistory[patientWallet];
        if (history.length > 0) {
            history[history.length - 1].transferredDate = block.timestamp;
        }

        emit PatientRemoved(patientWallet, msg.sender, block.timestamp);
    }

// NEW VERSION (Doctor can reactivate their own patients):
function reactivatePatient(address patientWallet, address assignedDoctor) external {
    require(patients[patientWallet].exists, "Patient not registered");
    require(!patients[patientWallet].isActive, "Patient is already active");
    
    // Allow admin to reactivate and assign to any doctor
    // OR allow the doctor who last had the patient to reactivate
    require(
        msg.sender == admin || 
        patients[patientWallet].currentDoctor == msg.sender,
        "Only admin or the patient's doctor can reactivate"
    );
    
    require(doctorRegistry.isDoctor(assignedDoctor), "Invalid doctor");

    patients[patientWallet].isActive = true;
    patients[patientWallet].currentDoctor = assignedDoctor;

    patientDoctorHistory[patientWallet].push(DoctorAssignment({
        doctor: assignedDoctor,
        assignedDate: block.timestamp,
        transferredDate: 0,
        reason: msg.sender == admin ? "Reactivated by Admin" : "Reactivated by Doctor"
    }));
}

    function getPatientDoctorHistory(address patientWallet) 
        external 
        view 
        returns (DoctorAssignment[] memory) 
    {
        require(patients[patientWallet].exists, "Patient not registered");
        require(
            msg.sender == patientWallet || 
            doctorRegistry.isDoctor(msg.sender) || 
            msg.sender == admin,
            "Access denied"
        );
        return patientDoctorHistory[patientWallet];
    }

    function getPatientWalletById(uint256 id) public view returns (address) {
        address wallet = patientIdToWallet[id];
        require(wallet != address(0), "Invalid patient ID");
        return wallet;
    }

    function isPatient(address _addr) external view returns (bool) {
        return patients[_addr].exists && patients[_addr].isActive;
    }

    function addRecord(
        address patientWallet,
        string memory description,
        string memory ipfsHash
    ) external onlyDoctor {
        _addRecordInternal(patientWallet, description, ipfsHash, "", bytes32(0));
    }

    function addRecordWithPolicy(
        address patientWallet,
        string memory description,
        string memory ipfsHash,
        string memory encryptedKeysCid,
        bytes32 policyHash
    ) external onlyDoctor {
        _addRecordInternal(patientWallet, description, ipfsHash, encryptedKeysCid, policyHash);
    }

    function _addRecordInternal(
        address patientWallet,
        string memory description,
        string memory ipfsHash,
        string memory encryptedKeysCid,
        bytes32 policyHash
    ) internal {
        require(patients[patientWallet].exists, "Patient not registered");
        require(patients[patientWallet].isActive, "Patient is not active");
        require(bytes(ipfsHash).length > 0, "Invalid IPFS hash");

        uint256 recordId = patientRecords[patientWallet].length + 1;
        Record memory newRecord = Record({
            id: recordId,
            description: description,
            ipfsHash: ipfsHash,
            encryptedKeysCid: encryptedKeysCid,
            policyHash: policyHash,
            date: block.timestamp,
            addedBy: msg.sender
        });

        patientRecords[patientWallet].push(newRecord);
        emit RecordAdded(patientWallet, recordId, msg.sender, policyHash);
    }

    function verifyRecordAccess(address patientWallet, uint256 recordId, address user) external view returns (bool) {
        require(patients[patientWallet].exists, "Patient not found");
        require(recordId > 0 && recordId <= patientRecords[patientWallet].length, "Invalid record");

        if (user == patientWallet || user == admin) return true;

        Record storage record = patientRecords[patientWallet][recordId - 1];
        if (record.policyHash == bytes32(0)) {
            return doctorRegistry.isDoctor(user);
        }

        return policyRegistry.verifyAccess(record.policyHash, user);
    }

    function getPatient(address _patient)
        external
        view
        returns (
            string memory fullName,
            uint256 age,
            string memory bloodGroup,
            string memory phone,
            address currentDoctor
        )
    {
        require(patients[_patient].exists, "Patient not found");
        Patient memory p = patients[_patient];
        return (p.fullName, p.age, p.bloodGroup, p.phone, p.currentDoctor);
    }

    function getPatientDetails(address _patient)
        external
        view
        returns (
            uint256 patientId,
            string memory fullName,
            uint256 age,
            string memory bloodGroup,
            string memory phone,
            address currentDoctor,
            bool isActive
        )
    {
        require(patients[_patient].exists, "Patient not found");
        Patient memory p = patients[_patient];
        return (p.patientId, p.fullName, p.age, p.bloodGroup, p.phone, p.currentDoctor, p.isActive);
    }

    function getPatientRecords(address _patient)
        public
        view
        returns (Record[] memory)
    {
        require(patients[_patient].exists, "Patient not found");
        require(
            msg.sender == _patient || doctorRegistry.isDoctor(msg.sender) || msg.sender == admin,
            "Access denied"
        );
        return patientRecords[_patient];
    }

    function getNextPatientId() external view returns (uint256) {
        return nextPatientId;
    }

    function getMyPatients() external view returns (Patient[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < patientAddresses.length; i++) {
            if (patients[patientAddresses[i]].currentDoctor == msg.sender && 
                patients[patientAddresses[i]].isActive) {
                count++;
            }
        }

        Patient[] memory result = new Patient[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < patientAddresses.length; i++) {
            if (patients[patientAddresses[i]].currentDoctor == msg.sender && 
                patients[patientAddresses[i]].isActive) {
                result[index] = patients[patientAddresses[i]];
                index++;
            }
        }
        return result;
    }

    function getAllPatientsHistory() external view returns (Patient[] memory) {
        address doctor = msg.sender;
        uint256 count = 0;

        for (uint256 i = 0; i < patientAddresses.length; i++) {
            address patientAddr = patientAddresses[i];
            DoctorAssignment[] storage history = patientDoctorHistory[patientAddr];
            
            for (uint256 j = 0; j < history.length; j++) {
                if (history[j].doctor == doctor) {
                    count++;
                    break;
                }
            }
        }

        Patient[] memory result = new Patient[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < patientAddresses.length; i++) {
            address patientAddr = patientAddresses[i];
            DoctorAssignment[] storage history = patientDoctorHistory[patientAddr];
            
            for (uint256 j = 0; j < history.length; j++) {
                if (history[j].doctor == doctor) {
                    result[index] = patients[patientAddr];
                    index++;
                    break;
                }
            }
        }

        return result;
    }

  function getAllPatients() external view returns (Patient[] memory) {
    // Remove onlyAdmin modifier to allow admin to view
    require(msg.sender == admin, "Only admin can view all patients");
    
    Patient[] memory result = new Patient[](patientAddresses.length);
    for (uint256 i = 0; i < patientAddresses.length; i++) {
        result[i] = patients[patientAddresses[i]];
    }
    return result;
}
function adminTransferPatient(address patientWallet, address newDoctor) external onlyAdmin {
    require(patients[patientWallet].exists, "Patient not registered");
    require(patients[patientWallet].isActive, "Patient is not active");
    require(doctorRegistry.isDoctor(newDoctor), "New doctor not registered");

    // Update doctor history
    DoctorAssignment[] storage history = patientDoctorHistory[patientWallet];
    if (history.length > 0) {
        history[history.length - 1].transferredDate = block.timestamp;
    }

    history.push(DoctorAssignment({
        doctor: newDoctor,
        assignedDate: block.timestamp,
        transferredDate: 0,
        reason: "Admin Transfer - Previous Doctor Removed"
    }));

    address oldDoctor = patients[patientWallet].currentDoctor;
    patients[patientWallet].currentDoctor = newDoctor;

    emit PatientTransferred(patientWallet, oldDoctor, newDoctor, "Admin Transfer", block.timestamp);
}
}