// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";

import {AletheiaIssuerRegistry} from "./AletheiaIssuerRegistry.sol";
import {DateLib} from "./lib/DateLib.sol";

/// @dev The snarkjs-generated verifier for a 7-signal circuit (see AgeClaim).
interface IGroth16Verifier7 {
    function verifyProof(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[7] calldata publicSignals
    ) external view returns (bool);
}

/**
 * @title AletheiaVerifier
 * @notice The only place in Aletheia where a claim becomes true.
 *
 * A Groth16 proof establishes exactly one thing: that someone knows a witness satisfying
 * the circuit. Everything else a verifier cares about — that the issuer is one we
 * recognise, that the prover is the wallet submitting the transaction, that the date is
 * current, that the threshold is in range, that this credential has not already been used
 * for this question — is checked here, because a proof cannot check any of it.
 *
 * There is deliberately no `bool result` anywhere in this contract. An invalid proof
 * reverts, so no record can exist that says a claim failed or that a claim is unverified.
 * Every `ClaimVerified` event is a claim that was actually proven.
 *
 * Nothing private is accepted or stored. The inputs are the proof and its public
 * signals, and the public signals contain no credential field — see
 * `docs/public-signals.md`.
 */
contract AletheiaVerifier is Ownable2Step {
    uint8 public constant CLAIM_TYPE_AGE = 1;

    /// @dev Matches `MAX_MINIMUM_AGE` in packages/credential and the circuit's range check.
    uint256 public constant MAX_MINIMUM_AGE = 120;

    AletheiaIssuerRegistry public immutable issuerRegistry;

    /// @notice Claim type to the Groth16 verifier that decides it.
    mapping(uint8 claimType => address verifier) public claimVerifier;

    /**
     * @notice Verification ids already used.
     * @dev Keyed by `keccak256(claimType, contextId, nullifier)`: the same credential can
     * answer the same question for two different verifiers, but not twice for one.
     */
    mapping(bytes32 verificationId => bool) public verificationUsed;

    /**
     * @notice A claim that was proven on-chain.
     * @param verificationId `keccak256(claimType, contextId, nullifier)`, unique per record
     * @param subject the wallet that proved it, which is always `msg.sender`
     * @param claimType 1 age (2 nationality and 3 expiry follow in later stages)
     * @param issuerId the registry id of the issuer whose signature the proof used
     * @param claimParameter the question's parameter, e.g. the age threshold
     * @param credentialValidOn the date the credential was proven unexpired on, YYYYMMDD
     * @param contextId the verifier scope the proof was bound to
     * @param nullifier per credential, claim type and context; makes replay detectable
     */
    event ClaimVerified(
        bytes32 indexed verificationId,
        address indexed subject,
        uint8 indexed claimType,
        bytes32 issuerId,
        uint256 claimParameter,
        uint32 credentialValidOn,
        bytes32 contextId,
        bytes32 nullifier,
        uint64 verifiedAt
    );

    event ClaimVerifierSet(uint8 indexed claimType, address indexed verifier);

    error NoVerifierForClaim(uint8 claimType);
    error SubjectIsNotSender(address subject, address sender);
    error DateNotCurrent(uint32 submitted, uint32 today);
    error ClaimParameterOutOfRange(uint256 parameter, uint256 maximum);
    error VerificationAlreadyRecorded(bytes32 verificationId);
    error InvalidProof();
    error InvalidVerifierAddress();

    constructor(address initialOwner, AletheiaIssuerRegistry registry) Ownable(initialOwner) {
        issuerRegistry = registry;
    }

    /**
     * @notice Point a claim type at its Groth16 verifier.
     * @dev Needed because a new trusted setup produces a new verifier contract. This is
     * real authority: whoever owns this contract chooses what "verified" means, which is
     * why it is `Ownable2Step` and why every change is an indexed event.
     */
    function setClaimVerifier(uint8 claimType, address verifier) external onlyOwner {
        if (verifier == address(0)) revert InvalidVerifierAddress();
        claimVerifier[claimType] = verifier;
        emit ClaimVerifierSet(claimType, verifier);
    }

    /**
     * @notice Prove an age claim: the holder of an issuer-signed, unexpired credential is
     * at least `publicSignals[4]` years old.
     *
     * Public signals, in the order frozen in `docs/public-signals.md`:
     * `[nullifier, issuerAx, issuerAy, currentDate, minimumAge, contextId, subject]`.
     *
     * Reverts unless everything holds. There is no partial success.
     */
    function submitAgeClaim(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[7] calldata publicSignals
    ) external returns (bytes32 verificationId) {
        address verifier = claimVerifier[CLAIM_TYPE_AGE];
        if (verifier == address(0)) revert NoVerifierForClaim(CLAIM_TYPE_AGE);

        // The proof binds the holder's address into both the signed credential and the
        // nullifier. Requiring it to equal msg.sender is what makes a stolen proof
        // useless to anyone else.
        if (publicSignals[6] != uint256(uint160(msg.sender))) {
            revert SubjectIsNotSender(address(uint160(publicSignals[6])), msg.sender);
        }

        // Checked here as well as in the circuit. The circuit's range check stops field
        // wraparound from forging a threshold; this stops a nonsensical parameter being
        // recorded even if a future circuit forgot to.
        if (publicSignals[4] > MAX_MINIMUM_AGE) {
            revert ClaimParameterOutOfRange(publicSignals[4], MAX_MINIMUM_AGE);
        }

        uint32 credentialValidOn = _requireCurrentDate(publicSignals[3]);
        bytes32 issuerId = issuerRegistry.requireActive(publicSignals[1], publicSignals[2]);

        verificationId = _reserve(CLAIM_TYPE_AGE, publicSignals[5], publicSignals[0]);

        if (!IGroth16Verifier7(verifier).verifyProof(a, b, c, publicSignals)) {
            revert InvalidProof();
        }

        emit ClaimVerified(
            verificationId,
            msg.sender,
            CLAIM_TYPE_AGE,
            issuerId,
            publicSignals[4],
            credentialValidOn,
            bytes32(publicSignals[5]),
            bytes32(publicSignals[0]),
            uint64(block.timestamp)
        );
    }

    function verificationIdFor(uint8 claimType, uint256 contextId, uint256 nullifier)
        public
        pure
        returns (bytes32)
    {
        return keccak256(abi.encode(claimType, contextId, nullifier));
    }

    /// @notice Today's date in UTC, as the contract sees it.
    function today() public view returns (uint32) {
        return DateLib.toYyyymmdd(block.timestamp);
    }

    /**
     * @dev Accept only today or yesterday in UTC.
     *
     * `block.timestamp` is the one clock a holder cannot choose, so this is what stops a
     * proof built against a date that suits the prover. Yesterday is allowed because a
     * proof takes time to generate and can be submitted across midnight; a wider window
     * would let a revoked or expired credential keep working.
     */
    function _requireCurrentDate(uint256 submitted) private view returns (uint32) {
        uint32 currentDate = uint32(submitted);
        // Reject before truncation loses information, rather than after.
        if (submitted != uint256(currentDate)) revert DateNotCurrent(0, today());

        uint32 todayUtc = DateLib.toYyyymmdd(block.timestamp);
        uint32 yesterdayUtc = DateLib.toYyyymmdd(block.timestamp - 1 days);
        if (currentDate != todayUtc && currentDate != yesterdayUtc) {
            revert DateNotCurrent(currentDate, todayUtc);
        }
        return currentDate;
    }

    /**
     * @dev Claim the verification id before verifying the proof.
     *
     * Ordering is deliberate: the verifier is an external contract set by the owner, and
     * marking the id used first means it cannot re-enter this function and record the
     * same verification twice. A failed proof reverts, so nothing is burned.
     */
    function _reserve(uint8 claimType, uint256 contextId, uint256 nullifier)
        private
        returns (bytes32 verificationId)
    {
        verificationId = verificationIdFor(claimType, contextId, nullifier);
        if (verificationUsed[verificationId]) {
            revert VerificationAlreadyRecorded(verificationId);
        }
        verificationUsed[verificationId] = true;
    }
}
