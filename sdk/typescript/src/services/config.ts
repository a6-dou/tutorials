import { config } from "dotenv";
import { getAccountBySK } from "./account";
config();

export default {
  network: {
    clientEndpoint:
      process.env.APTOS_REST_ENDPOINT ||
      "https://fullnode.devnet.aptoslabs.com",
    faucetEndpoint:
      process.env.APTOS_FAUCET_REST_ENDPOINT ||
      "https://faucet.devnet.aptoslabs.com",
  },
  accounts: {
    bob: {
      instance: getAccountBySK(process.env.APTOS_BOB_PRIVATE_KEY || ""),
      privateKey: process.env.APTOS_BOB_PRIVATE_KEY,
    },
    alice: {
      instance: getAccountBySK(process.env.APTOS_ALICE_PRIVATE_KEY || ""),
      privateKey: process.env.APTOS_ALICE_PRIVATE_KEY,
    },
  },
};
