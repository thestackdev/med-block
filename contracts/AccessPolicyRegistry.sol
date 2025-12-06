// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IDoctorRegistry {
    function isDoctor(address _addr) external view returns (bool);
    function getDoctorByAddress(address _doctor) external view returns (
        address walletAddress,
        string memory fullName,
        uint256 age,
        string memory specialization,
        string memory department,
        string memory licenseId
    );
}

contract AccessPolicyRegistry {
    struct AccessPolicy {
        bytes32 policyHash;
        address creator;
        uint256 createdAt;
        bool isActive;
        address[] authorizedAddresses;
        string[] authorizedRoles;
        string[] authorizedDepartments;
    }

    struct UserAttributes {
        string role;
        string department;
        bytes publicKey;
        bool isValid;
        uint256 issuedAt;
    }

    address public admin;
    IDoctorRegistry public doctorRegistry;

    mapping(bytes32 => AccessPolicy) public policies;
    mapping(address => UserAttributes) public userAttributes;
    mapping(address => bytes32[]) public userPolicies;

    bytes32[] public allPolicyHashes;

    event PolicyCreated(bytes32 indexed policyHash, address indexed creator, uint256 timestamp);
    event PolicyRevoked(bytes32 indexed policyHash, address indexed revokedBy, uint256 timestamp);
    event AttributesIssued(address indexed user, string role, string department, uint256 timestamp);
    event PublicKeyRegistered(address indexed user, uint256 timestamp);
    event AccessGranted(bytes32 indexed policyHash, address indexed user, uint256 timestamp);

    constructor(address _doctorRegistry) {
        require(_doctorRegistry != address(0), "Invalid DoctorRegistry");
        admin = msg.sender;
        doctorRegistry = IDoctorRegistry(_doctorRegistry);
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    modifier onlyDoctor() {
        require(doctorRegistry.isDoctor(msg.sender), "Only doctor");
        _;
    }

    function registerPublicKey(bytes memory publicKey) external {
        require(publicKey.length > 0, "Invalid public key");
        userAttributes[msg.sender].publicKey = publicKey;
        emit PublicKeyRegistered(msg.sender, block.timestamp);
    }

    function issueAttributes(
        address user,
        string memory role,
        string memory department
    ) external onlyAdmin {
        userAttributes[user] = UserAttributes({
            role: role,
            department: department,
            publicKey: userAttributes[user].publicKey,
            isValid: true,
            issuedAt: block.timestamp
        });
        emit AttributesIssued(user, role, department, block.timestamp);
    }

    function createPolicy(
        address[] memory authorizedAddresses,
        string[] memory authorizedRoles,
        string[] memory authorizedDepartments
    ) external onlyDoctor returns (bytes32) {
        bytes32 policyHash = keccak256(abi.encodePacked(
            msg.sender,
            block.timestamp,
            authorizedAddresses.length,
            authorizedRoles.length
        ));

        policies[policyHash] = AccessPolicy({
            policyHash: policyHash,
            creator: msg.sender,
            createdAt: block.timestamp,
            isActive: true,
            authorizedAddresses: authorizedAddresses,
            authorizedRoles: authorizedRoles,
            authorizedDepartments: authorizedDepartments
        });

        allPolicyHashes.push(policyHash);
        userPolicies[msg.sender].push(policyHash);

        emit PolicyCreated(policyHash, msg.sender, block.timestamp);
        return policyHash;
    }

    function verifyAccess(bytes32 policyHash, address user) external view returns (bool) {
        AccessPolicy storage policy = policies[policyHash];
        if (!policy.isActive) return false;

        for (uint256 i = 0; i < policy.authorizedAddresses.length; i++) {
            if (policy.authorizedAddresses[i] == user) return true;
        }

        UserAttributes storage attrs = userAttributes[user];
        if (!attrs.isValid) return false;

        for (uint256 i = 0; i < policy.authorizedRoles.length; i++) {
            if (keccak256(bytes(policy.authorizedRoles[i])) == keccak256(bytes(attrs.role))) {
                if (policy.authorizedDepartments.length == 0) return true;

                for (uint256 j = 0; j < policy.authorizedDepartments.length; j++) {
                    if (keccak256(bytes(policy.authorizedDepartments[j])) == keccak256(bytes(attrs.department))) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    function revokePolicy(bytes32 policyHash) external {
        require(policies[policyHash].creator == msg.sender || msg.sender == admin, "Not authorized");
        policies[policyHash].isActive = false;
        emit PolicyRevoked(policyHash, msg.sender, block.timestamp);
    }

    function getPolicy(bytes32 policyHash) external view returns (
        address creator,
        uint256 createdAt,
        bool isActive,
        address[] memory authorizedAddresses,
        string[] memory authorizedRoles,
        string[] memory authorizedDepartments
    ) {
        AccessPolicy storage p = policies[policyHash];
        return (
            p.creator,
            p.createdAt,
            p.isActive,
            p.authorizedAddresses,
            p.authorizedRoles,
            p.authorizedDepartments
        );
    }

    function getUserPublicKey(address user) external view returns (bytes memory) {
        return userAttributes[user].publicKey;
    }

    function getUserAttributes(address user) external view returns (
        string memory role,
        string memory department,
        bool isValid
    ) {
        UserAttributes storage a = userAttributes[user];
        return (a.role, a.department, a.isValid);
    }

    function getPoliciesByCreator(address creator) external view returns (bytes32[] memory) {
        return userPolicies[creator];
    }
}
