import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Bytes, Address, BigInt } from "@graphprotocol/graph-ts"
import { ClaimVerified } from "../generated/schema"
import { ClaimVerified as ClaimVerifiedEvent } from "../generated/AletheiaVerifier/AletheiaVerifier"
import { handleClaimVerified } from "../src/aletheia-verifier"
import { createClaimVerifiedEvent } from "./aletheia-verifier-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#tests-structure

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let verificationId = Bytes.fromI32(1234567890)
    let subject = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let claimType = 123
    let issuerId = Bytes.fromI32(1234567890)
    let claimParameter = BigInt.fromI32(234)
    let credentialValidOn = BigInt.fromI32(234)
    let contextId = Bytes.fromI32(1234567890)
    let nullifier = Bytes.fromI32(1234567890)
    let identityNullifier = Bytes.fromI32(1234567890)
    let verifiedAt = BigInt.fromI32(234)
    let newClaimVerifiedEvent = createClaimVerifiedEvent(
      verificationId,
      subject,
      claimType,
      issuerId,
      claimParameter,
      credentialValidOn,
      contextId,
      nullifier,
      identityNullifier,
      verifiedAt
    )
    handleClaimVerified(newClaimVerifiedEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#write-a-unit-test

  test("ClaimVerified created and stored", () => {
    assert.entityCount("ClaimVerified", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "ClaimVerified",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "verificationId",
      "1234567890"
    )
    assert.fieldEquals(
      "ClaimVerified",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "subject",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "ClaimVerified",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "claimType",
      "123"
    )
    assert.fieldEquals(
      "ClaimVerified",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "issuerId",
      "1234567890"
    )
    assert.fieldEquals(
      "ClaimVerified",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "claimParameter",
      "234"
    )
    assert.fieldEquals(
      "ClaimVerified",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "credentialValidOn",
      "234"
    )
    assert.fieldEquals(
      "ClaimVerified",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "contextId",
      "1234567890"
    )
    assert.fieldEquals(
      "ClaimVerified",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "nullifier",
      "1234567890"
    )
    assert.fieldEquals(
      "ClaimVerified",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "identityNullifier",
      "1234567890"
    )
    assert.fieldEquals(
      "ClaimVerified",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "verifiedAt",
      "234"
    )

    // More assert options:
    // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#asserts
  })
})
