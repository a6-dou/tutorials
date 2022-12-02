import { AptosAccount, AptosClient } from "aptos";
import config from "../services/config";
import PromptSync from "prompt-sync";
import * as lz from "@layerzerolabs/lz-aptos";
import { Counter } from "@layerzerolabs/lz-aptos/dist/modules/apps/counter";

const prompt = PromptSync();

const deployer = config.accounts.coolWallet.instance;
const layerzeroDeployedAddress =
  "0x1759cc0d3161f1eb79f65847d4feb9d1f74fb79014698a23b16b28b9cd4c37e3";
const coolWalletAddress =
  "0x02a561bd1edff8bf88704d24ec22ae14d979177425eb60e71b2d110fd1c73ce8";

// Create a new instance of the aptos client
const client = new AptosClient(config.network.clientEndpoint);
const sdk = new lz.SDK({
  provider: client,
  accounts: {
    layerzero: layerzeroDeployedAddress,
    msglib_auth: layerzeroDeployedAddress,
    msglib_v1_1: layerzeroDeployedAddress,
    msglib_v2: layerzeroDeployedAddress,
    zro: layerzeroDeployedAddress,
    executor_auth: layerzeroDeployedAddress,
    executor_v2: layerzeroDeployedAddress,
  },
});

const main = async () => {
  console.log("===========================================================");
  const shouldSend = prompt(
    "type (y) to Send 1 OCW from Aptos to binance Smart Chain "
  );
  if (shouldSend !== "y") throw Error("Exiting...");

  const rawTx = await client.generateTransaction(deployer.address(), {
    function: `${deployer.address()}::omnichain_cool_wallet_coin::bridge`,
    type_arguments: [],
    arguments: [10102, 1_000_000, Array.from(Uint8Array.from([]))],
  });

  const signedTx = await client.signTransaction(deployer, rawTx);
  const pendingTx = await client.submitTransaction(signedTx);

  await client.waitForTransaction(pendingTx.hash, { checkSuccess: true });
  console.log(`Bridged! ${pendingTx.hash}`);
};

async function register(account: AptosAccount) {
  const rawTx = await client.generateTransaction(account.address(), {
    function: `${deployer.address()}::omnichain_cool_wallet_coin::register`,
    type_arguments: [],
    arguments: [],
  });

  const signedTx = await client.signTransaction(account, rawTx);
  const pendingTx = await client.submitTransaction(signedTx);
  await client.waitForTransaction(pendingTx.hash, { checkSuccess: true });
  console.log(
    `${account.address().toShortString()} successfully register! ${
      pendingTx.hash
    }`
  );
}

main().catch(console.error);
