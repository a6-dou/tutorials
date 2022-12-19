import { AptosAccount, AptosClient } from "aptos";
import config from "../services/config";
import PromptSync from "prompt-sync";
import * as lz from "@layerzerolabs/lz-aptos";
import {
  rebuildPacketFromEvent,
  encodePacket,
} from "@layerzerolabs/lz-aptos/dist/utils";
import * as nacl from "tweetnacl";

const prompt = PromptSync();

// Create a new instance of the aptos client
const client = new AptosClient(config.network.clientEndpoint);
const deployer = config.accounts.coolWallet.instance;
const layerzeroDeployedAddress =
  "0x1759cc0d3161f1eb79f65847d4feb9d1f74fb79014698a23b16b28b9cd4c37e3";

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
  const optimistic = prompt(
    "Proceed with manual relayer if multisig relayer fails? "
  );
  try {
    await relayer();
  } catch (error) {
    if (optimistic === "yes" || optimistic === "y") {
      await optimisticRelayer();
    }
  }
};

async function optimisticRelayer() {
  const rawTx = await client.generateTransaction(deployer.address(), {
    function: `${deployer.address()}::omnichain_cool_wallet_coin::submit_lz_receive`,
    type_arguments: [],
    arguments: [],
  });

  const signedTx = await client.signTransaction(deployer, rawTx);
  const pendingTx = await client.submitTransaction(signedTx);
  await client.waitForTransaction(pendingTx.hash, { checkSuccess: true });
  console.log(`Submitted! ${pendingTx.hash}`);
}

async function relayer() {
  const events = await sdk.LayerzeroModule.Uln.PacketEvent.getOutboundEvents(
    BigInt(36),
    10
  );

  const eventCount =
    await sdk.LayerzeroModule.Uln.PacketEvent.getOutboundEventCount();

  console.log({ eventCount, events: events.length });

  console.log(events[events.length - 1]);
  let packet = await rebuildPacketFromEvent(events[events.length - 1], 32);

  console.log(
    `packet: ${JSON.stringify(packet, (_, v) =>
      typeof v === "bigint" ? v.toString() : v
    )}`
  );
  console.log(Buffer.from(packet.dst_address).toString("hex"));

  const tx = await sdk.LayerzeroModule.Uln.Receive.relayerVerify(
    deployer,
    packet.dst_address,
    encodePacket(packet),
    5
  );
  console.log(`Relayer Verify: ${tx.hash}`);
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

async function registerRelayer(chainId: number) {
  const registered = await sdk.LayerzeroModule.Uln.Signer.isRegistered(
    deployer.address()
  );

  const registerPayload = sdk.LayerzeroModule.Uln.Signer.registerPayload();
  const registerTx: any = {
    needChange: !registered,
    chainId,
    module: sdk.LayerzeroModule.Uln.Signer.moduleName,
    function: registerPayload.function.split("::")[2],
    args: registerPayload.arguments,
    registerPayload,
  };
  if (registerTx.needChange) {
    registerTx.diff = {
      registered: {
        oldValue: false,
        newValue: true,
      },
    };
  }

  await sdk.sendAndConfirmTransaction(deployer, registerTx.payload);
}

