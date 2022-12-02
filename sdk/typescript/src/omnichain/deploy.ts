import { AptosAccount, AptosClient, HexString, TxnBuilderTypes } from "aptos";
import config from "../services/config";
import PromptSync from "prompt-sync";
import fs from "fs";
import path from "path";
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
  const counterModule = new Counter(sdk, coolWalletAddress);
  console.log("===========================================================");
  const shouldDeploy = prompt("type (y) to Deploy omnichain cool wallet ");
  if (shouldDeploy === "y") {
    await publishCoin(deployer);
    console.log("module created");

    const tx = await counterModule.setRemote(
      deployer,
      10102,
      Uint8Array.from(
        Buffer.from("3E04bd40C3319de19286846c6fC2df0dce2eb84B", "hex")
      )
    );

    await client.waitForTransaction(tx.hash, { checkSuccess: true });
    console.log(`remote added ${tx.hash}`);
    console.log("Registering user...");
    await register(deployer).catch(() => console.log("Already registered!"));
  }
};

async function publishCoin(account: AptosAccount) {
  console.log("Reading module and metadata...");
  const packageMetadata = fs.readFileSync(
    path.join(
      "/Users/user/dev/aptos/tutorials/move/omnichain_cool_wallet_coin",
      "build",
      "omnichain_cool_wallet_coin",
      "package-metadata.bcs"
    )
  );

  const moduleData = fs.readFileSync(
    path.join(
      "/Users/user/dev/aptos/tutorials/move/omnichain_cool_wallet_coin",
      "build",
      "omnichain_cool_wallet_coin",
      "bytecode_modules",
      "omnichain_cool_wallet_coin.mv"
    )
  );

  console.log("Publishing...");

  const module = new TxnBuilderTypes.Module(
    new HexString(moduleData.toString("hex")).toUint8Array()
  );

  const publishTxHash = await client.publishPackage(
    account,
    new HexString(packageMetadata.toString("hex")).toUint8Array(),
    [module]
  );

  await client.waitForTransaction(publishTxHash, { checkSuccess: true });
  console.log(`Deployed ${publishTxHash}`);
}

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
