/**
 * Minimal ambient types for `snarkjs@0.7.6`, which ships none.
 *
 * Only the surface Aletheia uses is declared. Extend it as later stages need more
 * (trusted setup, proving, verification, Solidity verifier export).
 */
declare module "snarkjs" {
  export type CircuitInput = Record<string, string | number | bigint>;

  export interface Logger {
    debug?(message: string): void;
    info?(message: string): void;
    warn?(message: string): void;
    error?(message: string): void;
  }

  export namespace wtns {
    /** Compute a witness from an input object and a compiled circuit wasm. */
    function calculate(
      input: CircuitInput,
      wasmFileName: string,
      wtnsFileName: string,
    ): Promise<void>;

    /** Verify that a witness satisfies every constraint in the r1cs. */
    function check(
      r1csFileName: string,
      wtnsFileName: string,
      logger?: Logger,
    ): Promise<boolean>;

    /** Witness values in circuit order: [1, ...outputs, ...publicInputs, ...rest]. */
    function exportJson(wtnsFileName: string): Promise<bigint[]>;
  }

  export namespace r1cs {
    function info(r1csFileName: string, logger?: Logger): Promise<unknown>;
  }
}
