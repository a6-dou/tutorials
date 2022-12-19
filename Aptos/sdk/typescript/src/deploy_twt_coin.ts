import {
  AptosAccount,
  AptosClient,
  CoinClient,
  FaucetClient,
  HexString,
  TxnBuilderTypes,
} from "aptos";
import config from "./services/config";
import PromptSync from "prompt-sync";
import fs from "fs";
import path from "path";

const prompt = PromptSync();

// Create a new instance of the aptos client
const client = new AptosClient(config.network.clientEndpoint);

type CoinStruct = {
  coin: {
    value: number;
  };
};

const bob = config.accounts.bob.instance;
const deployer = config.accounts.deployer.instance;
const COIN_ADDRESS = `${deployer.address()}::twt_coin::TwtCoinOne`;
const MINT_FUNCTION = "0x1::managed_coin::mint";
const DENOMINATOR = 10 ** 6; // 6 Decimals

const main = async () => {
  // Fund accounts with Aptos test coin
  await _faucetFund();

  console.log("===========================================================");
  const shouldDeploy = prompt("type (y) to Deploy twt_coin ");
  if (shouldDeploy === "y") {
    await publishCoin(deployer);
  }

  console.log("===========================================================");
  const shouldRegister = prompt("type (y) to Register twt_coin for Bob ");
  if (shouldRegister === "y") {
    console.log("Registering Bob...");
    await register(bob);
  }

  console.log("===========================================================");
  const amount = Number((Math.random() * 10).toFixed(6));
  console.log(`Sending Bob ${amount} TWT...`);
  await mint(deployer, bob.address(), Math.ceil(amount * DENOMINATOR));

  console.log("===========================================================");
  const bobBalance = await getTwtBalance(bob.address());
  console.log(`Bob balance: ${bobBalance}`);
};

async function _faucetFund() {
  try {
    if (!config.network.faucetEndpoint) return;
    console.log("===========================================================");
    // Create a new instance of the aptos faucet client
    const faucet = new FaucetClient(
      config.network.clientEndpoint,
      config.network.faucetEndpoint
    );
    console.log(`Deployer Account: ${deployer.address()}`);
    console.log(`Bob Account:   ${bob.address()}`);
    console.log(`Funding Accounts from faucet...`);
    await faucet.fundAccount(deployer.address(), 100_000_000);
    await faucet.fundAccount(bob.address(), 100_000_000);
  } catch (error) {
    console.log("Faucet available only for DevNet");
    console.error(error);
  }
  console.log("===========================================================");
}

async function publishCoin(account: AptosAccount) {
  console.log("Reading module and metadata...");
  const packageMetadata = fs.readFileSync(
    path.join(
      "/Users/user/dev/aptos/tutorials/move/twt_coin",
      "build",
      "twt",
      "package-metadata.bcs"
    )
  );

  const moduleData = fs.readFileSync(
    path.join(
      "/Users/user/dev/aptos/tutorials/move/twt_coin",
      "build",
      "twt",
      "bytecode_modules",
      "twt_coin.mv"
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
    function: "0x1::managed_coin::register",
    type_arguments: [COIN_ADDRESS],
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

async function mint(minter: AptosAccount, to: HexString, amount: number) {
  const rawTx = await client.generateTransaction(minter.address(), {
    function: MINT_FUNCTION,
    type_arguments: [COIN_ADDRESS],
    arguments: [to, amount],
  });
  const signedTx = await client.signTransaction(minter, rawTx);
  const pendingTx = await client.submitTransaction(signedTx);
  await client.waitForTransaction(pendingTx.hash, { checkSuccess: true });
  console.log(`${amount / DENOMINATOR} TWT sent to ${to.toShortString()}`);
}

async function getTwtBalance(account: HexString) {
  try {
    const resource = await client.getAccountResource(
      account,
      `0x1::coin::CoinStore<${COIN_ADDRESS}>`
    );
    return Number(
      (resource.data as CoinStruct)?.coin?.value / DENOMINATOR
    ).toFixed(6);
  } catch (error) {
    return 0;
  }
}

main().catch(console.error);
