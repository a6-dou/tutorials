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
import * as lz from "@layerzerolabs/lz-aptos";
import { Counter } from "@layerzerolabs/lz-aptos/dist/modules/apps/counter";
import {
  rebuildPacketFromEvent,
  hashPacket,
  encodePacket,
} from "@layerzerolabs/lz-aptos/dist/utils";
import * as nacl from "tweetnacl";

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
const COIN_ADDRESS = `${deployer.address()}::counter`;
const MINT_FUNCTION = "0x1::managed_coin::mint";
const CREATE_COUNTER_FUNCTION = "";
const DENOMINATOR = 10 ** 6; // 6 Decimals
const layerzeroDeployedAddress =
  "0x1759cc0d3161f1eb79f65847d4feb9d1f74fb79014698a23b16b28b9cd4c37e3";
const counterDeployedAddress =
  "0x29e1ff547bfe2ed43de22a1628d728d3d8062fa4c3e9f061ec88bd6c120350da";

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

async function createCounter(owner: AptosAccount) {
  const rawTx = await client.generateTransaction(owner.address(), {
    function: `${COIN_ADDRESS}::create_counter`,
    type_arguments: [],
    arguments: [1993],
  });
  const signedTx = await client.signTransaction(owner, rawTx);
  const pendingTx = await client.submitTransaction(signedTx);
  await client.waitForTransaction(pendingTx.hash, { checkSuccess: true });
  console.log(`create counter ${pendingTx.hash}`);
}
const main = async () => {
  // Fund accounts with Aptos test coin
  await _faucetFund();

  console.log("===========================================================");
  const shouldDeploy = prompt("type (y) to Deploy counter ");
  if (shouldDeploy === "y") {
    await publishCoin(deployer);
  }

  const counterModule = new Counter(sdk, counterDeployedAddress);

  console.log("module created");

  // const tx = await counterModule.setRemote(
  //   deployer,
  //   10102,
  //   Uint8Array.from(
  //     Buffer.from("917663ED66A6EE96ee084eFa4Ff7FE9f6bb19621", "hex")
  //   )
  // );

  // await client.waitForTransaction(tx.hash, { checkSuccess: true });
  // console.log(`remote added ${tx.hash}`);

  // const sendTx = await counterModule.sendToRemote(
  //   deployer,
  //   10102,
  //   10_00_000,
  //   Uint8Array.from([])
  // );

  // await client.waitForTransaction(sendTx.hash, { checkSuccess: true });
  // console.log(`sent ${sendTx.hash}`);

  const events = await sdk.LayerzeroModule.Uln.PacketEvent.getOutboundEvents(
    BigInt(0),
    1
  );
  console.log(`send events: ${JSON.stringify(events)}`);
  const eventCount =
    await sdk.LayerzeroModule.Uln.PacketEvent.getOutboundEventCount();
  console.log(events[0]);
  let packet = await rebuildPacketFromEvent(events[0], 32);
  const relayerDeployAccount = new AptosAccount(findSecretKeyWithZeroPrefix(1));
  console.log(
    `packet: ${JSON.stringify(packet, (_, v) =>
      typeof v === "bigint" ? v.toString() : v
    )}`
  );
  const tx = await sdk.LayerzeroModule.Uln.Receive.relayerVerify(
    relayerDeployAccount,
    packet.dst_address,
    encodePacket(packet),
    15
  );
  console.log(`Relayer Verify: ${tx.hash}`);
  // const receiveTx = await counterModule.lzReceive(
  //   deployer,
  //   10102,
  //   Uint8Array.from(
  //     Buffer.from("917663ED66A6EE96ee084eFa4Ff7FE9f6bb19621", "hex")
  //   ),
  //   Uint8Array.from([])
  // );

  // await client.waitForTransaction(receiveTx.hash, { checkSuccess: true });
  // console.log(receiveTx.hash);

  console.log("===========================================================");
  const shouldCreateCounter = prompt("type (y) to create counter ");
  if (shouldCreateCounter === "y") {
    console.log("creating counter...");
    await createCounter(deployer);
  }
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
      "/Users/user/dev/aptos/tutorials/move/counter",
      "build",
      "counter",
      "package-metadata.bcs"
    )
  );

  const moduleData = fs.readFileSync(
    path.join(
      "/Users/user/dev/aptos/tutorials/move/counter",
      "build",
      "counter",
      "bytecode_modules",
      "counter.mv"
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

export function findSecretKeyWithZeroPrefix(length = 0): Uint8Array {
  const prefix = Buffer.alloc(length, "0").toString();
  let address;
  let secretKey;
  do {
    secretKey = nacl.box.keyPair().secretKey;
    const account = new AptosAccount(secretKey);
    address = account.address().noPrefix();
  } while (!address.startsWith(prefix));
  return secretKey;
}
