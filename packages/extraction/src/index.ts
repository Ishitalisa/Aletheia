export {
  computeCheckDigit,
  isMrzField,
  mrzCharValue,
  verifyCheckDigit,
} from "./checkdigit.ts";

export {
  TD3_LINE_LENGTH,
  parseTd3Mrz,
  type MrzSex,
  type ParseTd3Options,
  type Td3CandidateFields,
  type Td3ExtractionResult,
  type Td3Issue,
  type Td3IssueCode,
} from "./mrz.ts";
