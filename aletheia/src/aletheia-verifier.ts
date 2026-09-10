import {
  ClaimVerified as ClaimVerifiedEvent,
  ClaimVerifierSet as ClaimVerifierSetEvent,
  OwnershipTransferStarted as OwnershipTransferStartedEvent,
  OwnershipTransferred as OwnershipTransferredEvent
} from "../generated/AletheiaVerifier/AletheiaVerifier"
import {
  ClaimVerified,
  ClaimVerifierSet,
  OwnershipTransferStarted,
  OwnershipTransferred
} from "../generated/schema"

export function handleClaimVerified(event: ClaimVerifiedEvent): void {
  let entity = new ClaimVerified(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.verificationId = event.params.verificationId
  entity.subject = event.params.subject
  entity.claimType = event.params.claimType
  entity.issuerId = event.params.issuerId
  entity.claimParameter = event.params.claimParameter
  entity.credentialValidOn = event.params.credentialValidOn
  entity.contextId = event.params.contextId
  entity.nullifier = event.params.nullifier
  entity.identityNullifier = event.params.identityNullifier
  entity.verifiedAt = event.params.verifiedAt

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleClaimVerifierSet(event: ClaimVerifierSetEvent): void {
  let entity = new ClaimVerifierSet(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.claimType = event.params.claimType
  entity.verifier = event.params.verifier

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleOwnershipTransferStarted(
  event: OwnershipTransferStartedEvent
): void {
  let entity = new OwnershipTransferStarted(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.previousOwner = event.params.previousOwner
  entity.newOwner = event.params.newOwner

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  let entity = new OwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.previousOwner = event.params.previousOwner
  entity.newOwner = event.params.newOwner

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
