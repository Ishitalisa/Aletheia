pragma circom 2.0.0;

include "poseidon.circom";
include "eddsaposeidon.circom";
include "comparators.circom";
include "bitify.circom";

/*
 * CredentialClaimBase — everything every Aletheia claim must prove, in one place.
 *
 * A claim circuit instantiates this and adds only its own statement. That way the parts
 * that make a proof mean anything cannot be forgotten by a new claim:
 *
 *   1. every date and code is range-checked, so a comparison cannot be faked by
 *      finite-field wraparound
 *   2. the credential hash is recomputed from the private fields, so the signature
 *      covers exactly the values the claim is evaluated against
 *   3. the issuer's EdDSA signature over that hash is verified in-circuit
 *   4. the credential is not expired as of currentDate
 *   5. a nullifier is derived, binding the proof to one credential, claim type,
 *      verifier context and wallet
 *
 * Parameters:
 *   schemaVersion  first input to the signed hash; see docs/credential-schema.md
 *   claimTypeId    1 age, 2 nationality, 3 expiry; bound into the nullifier
 *
 * Field encodings: dates are YYYYMMDD (docs/date-format.md), nationality is ISO 3166-1
 * numeric, subject is an Ethereum address as a uint160.
 */
template CredentialClaimBase(schemaVersion, claimTypeId) {
    // --- private: the credential itself ---
    signal input credentialId;
    signal input dateOfBirth;
    signal input nationality;
    signal input expiryDate;
    signal input issuedAt;

    // --- private: the issuer's signature over the credential ---
    signal input sigR8x;
    signal input sigR8y;
    signal input sigS;

    // --- public ---
    signal input issuerAx;
    signal input issuerAy;
    signal input currentDate;
    signal input contextId;
    signal input subject;

    signal output nullifier;

    // 1. Range checks.
    //
    // The comparators below are only sound for inputs under 2^32, and a value at or
    // above the field modulus would wrap. These checks are what stop a prover choosing
    // a "date" that satisfies a comparison it should fail.
    //
    // subject is deliberately not range-checked here: AletheiaVerifier compares it
    // against uint160(msg.sender), which rejects any value that is not that address.
    // The bit decompositions themselves are the check; the individual bits are not
    // needed downstream, and `_ <==` is how circom is told that is deliberate rather
    // than an unconstrained-signal bug.
    component dobBits = Num2Bits(32);
    dobBits.in <== dateOfBirth;
    _ <== dobBits.out;

    component expiryBits = Num2Bits(32);
    expiryBits.in <== expiryDate;
    _ <== expiryBits.out;

    component issuedAtBits = Num2Bits(32);
    issuedAtBits.in <== issuedAt;
    _ <== issuedAtBits.out;

    component currentDateBits = Num2Bits(32);
    currentDateBits.in <== currentDate;
    _ <== currentDateBits.out;

    component nationalityBits = Num2Bits(16);
    nationalityBits.in <== nationality;
    _ <== nationalityBits.out;

    // currentDate must be a plausible calendar date. The contract additionally pins it
    // to today or yesterday in UTC; this only rules out absurd values.
    component currentDateAtLeastMin = GreaterEqThan(32);
    currentDateAtLeastMin.in[0] <== currentDate;
    currentDateAtLeastMin.in[1] <== 19000101;
    currentDateAtLeastMin.out === 1;

    component currentDateAtMostMax = LessEqThan(32);
    currentDateAtMostMax.in[0] <== currentDate;
    currentDateAtMostMax.in[1] <== 21001231;
    currentDateAtMostMax.out === 1;

    // 2. Recompute the signed message from the private fields.
    //
    // Poseidon([schemaVersion, credentialId, subject, dateOfBirth, nationality,
    //           expiryDate, issuedAt]) — the layout in docs/credential-schema.md.
    component message = Poseidon(7);
    message.inputs[0] <== schemaVersion;
    message.inputs[1] <== credentialId;
    message.inputs[2] <== subject;
    message.inputs[3] <== dateOfBirth;
    message.inputs[4] <== nationality;
    message.inputs[5] <== expiryDate;
    message.inputs[6] <== issuedAt;

    // 3. Verify the issuer signature over that message.
    //
    // This is the constraint that separates a credential from a claim someone typed in.
    // The issuer key is public, and the contract checks it against its registry, so a
    // proof under an unknown or revoked key is rejected on-chain.
    component signature = EdDSAPoseidonVerifier();
    signature.enabled <== 1;
    signature.Ax <== issuerAx;
    signature.Ay <== issuerAy;
    signature.S <== sigS;
    signature.R8x <== sigR8x;
    signature.R8y <== sigR8y;
    signature.M <== message.out;

    // 4. The credential must not be expired. Every claim inherits this, so a stale
    //    credential cannot satisfy an age or nationality question either.
    component unexpired = GreaterEqThan(32);
    unexpired.in[0] <== expiryDate;
    unexpired.in[1] <== currentDate;
    unexpired.out === 1;

    // 5. Nullifier: Poseidon([credentialId, claimTypeId, contextId, subject]).
    //
    // Also the only place subject and contextId are constrained, which is deliberate:
    // it makes them load-bearing rather than decorative pass-through signals.
    component tag = Poseidon(4);
    tag.inputs[0] <== credentialId;
    tag.inputs[1] <== claimTypeId;
    tag.inputs[2] <== contextId;
    tag.inputs[3] <== subject;

    nullifier <== tag.out;
}
