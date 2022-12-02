import { config } from "dotenv";
import { getAccountBySK } from "./account";
config();

export default {
  network: {
    clientEndpoint: process.env.APTOS_REST_ENDPOINT || "",
    faucetEndpoint: process.env.APTOS_FAUCET_REST_ENDPOINT || "",
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
    deployer: {
      instance: getAccountBySK(
        process.env.APTOS_TWT_DEPLOYER_PRIVATE_KEY || ""
      ),
      privateKey: process.env.APTOS_TWT_DEPLOYER_PRIVATE_KEY,
    },
    coolWallet: {
      instance: getAccountBySK(process.env.APTOS_COOL_WALLET_PRIVATE_KEY || ""),
      privateKey: process.env.APTOS_COOL_WALLET_PRIVATE_KEY,
    },
  },
};
