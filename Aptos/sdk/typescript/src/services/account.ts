import { AptosAccount } from "aptos";

export const getAccountBySK = (sk: string) => {
  if (!sk) throw new Error("private key missing");

  // serialize the private key
  const rawSk = Uint8Array.from(
    // remove the 0x prefix if it exists
    Buffer.from(sk.replace("0x", ""), "hex")
  );

  return new AptosAccount(rawSk);
};
