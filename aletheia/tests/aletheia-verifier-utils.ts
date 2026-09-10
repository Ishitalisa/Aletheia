import { newMockEvent } from "matchstick-as"
import { ethereum, Bytes, Address, BigInt } from "@graphprotocol/graph-ts"
import {
  ClaimVerified,
  ClaimVerifierSet,
  OwnershipTransferStarted,
  OwnershipTransferred
} from "../generated/AletheiaVerifier/AletheiaVerifier"

export function createClaimVerifiedEvent(
  verificationId: Bytes,
  subject: Address,
  claimType: i32,
  issuerId: Bytes,
  claimParameter: BigInt,
  credentialValidOn: BigInt,
  contextId: Bytes,
  nullifier: Bytes,
  identityNullifier: Bytes,
  verifiedAt: BigInt
): ClaimVerified {
  let claimVerifiedEvent = changetype<ClaimVerified>(newMockEvent())

  claimVerifiedEvent.parameters = new Array()

  claimVerifiedEvent.parameters.push(
    new ethereum.EventParam(
      "verificationId",
      ethereum.Value.fromFixedBytes(verificationId)
    )
  )
  claimVerifiedEvent.parameters.push(
    new ethereum.EventParam("subject", ethereum.Value.fromAddress(subject))
  )
  claimVerifiedEvent.parameters.push(
    new ethereum.EventParam(
      "claimType",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(claimType))
    )
  )
  claimVerifiedEvent.parameters.push(
    new ethereum.EventParam("issuerId", ethereum.Value.fromFixedBytes(issuerId))
  )
  claimVerifiedEvent.parameters.push(
    new ethereum.EventParam(
      "claimParameter",
      ethereum.Value.fromUnsignedBigInt(claimParameter)
    )
  )
  claimVerifiedEvent.parameters.push(
    new ethereum.EventParam(
      "credentialValidOn",
      ethereum.Value.fromUnsignedBigInt(credentialValidOn)
    )
  )
  claimVerifiedEvent.parameters.push(
    new ethereum.EventParam(
      "contextId",
      ethereum.Value.fromFixedBytes(contextId)
    )
  )
  claimVerifiedEvent.parameters.push(
    new ethereum.EventParam(
      "nullifier",
      ethereum.Value.fromFixedBytes(nullifier)
    )
  )
  claimVerifiedEvent.parameters.push(
    new ethereum.EventParam(
      "identityNullifier",
      ethereum.Value.fromFixedBytes(identityNullifier)
    )
  )
  claimVerifiedEvent.parameters.push(
    new ethereum.EventParam(
      "verifiedAt",
      ethereum.Value.fromUnsignedBigInt(verifiedAt)
    )
  )

  return claimVerifiedEvent
}

export function createClaimVerifierSetEvent(
  claimType: i32,
  verifier: Address
): ClaimVerifierSet {
  let claimVerifierSetEvent = changetype<ClaimVerifierSet>(newMockEvent())

  claimVerifierSetEvent.parameters = new Array()

  claimVerifierSetEvent.parameters.push(
    new ethereum.EventParam(
      "claimType",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(claimType))
    )
  )
  claimVerifierSetEvent.parameters.push(
    new ethereum.EventParam("verifier", ethereum.Value.fromAddress(verifier))
  )

  return claimVerifierSetEvent
}

export function createOwnershipTransferStartedEvent(
  previousOwner: Address,
  newOwner: Address
): OwnershipTransferStarted {
  let ownershipTransferStartedEvent =
    changetype<OwnershipTransferStarted>(newMockEvent())

  ownershipTransferStartedEvent.parameters = new Array()

  ownershipTransferStartedEvent.parameters.push(
    new ethereum.EventParam(
      "previousOwner",
      ethereum.Value.fromAddress(previousOwner)
    )
  )
  ownershipTransferStartedEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return ownershipTransferStartedEvent
}

export function createOwnershipTransferredEvent(
  previousOwner: Address,
  newOwner: Address
): OwnershipTransferred {
  let ownershipTransferredEvent =
    changetype<OwnershipTransferred>(newMockEvent())

  ownershipTransferredEvent.parameters = new Array()

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam(
      "previousOwner",
      ethereum.Value.fromAddress(previousOwner)
    )
  )
  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return ownershipTransferredEvent
}
