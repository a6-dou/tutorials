import { AptosClient, CoinClient, FaucetClient, TokenClient } from "aptos";
import config from "./services/config";
import { COLLECTION_NAME } from "./services/const";

const main = async () => {
  console.log("===========================================================");
  // Create a new instance of the aptos client
  const client = new AptosClient(config.network.clientEndpoint);
  // Create a new instance of the aptos faucet client
  const faucet = new FaucetClient(
    config.network.clientEndpoint,
    config.network.faucetEndpoint
  );
  const bob = config.accounts.bob.instance;
  const alice = config.accounts.alice.instance;
  console.log(`Bob Account:   ${bob.address()}`);
  console.log(`Alice Account: ${alice.address()}`);
  console.log(`Funding Alice with 1 APT from faucet...`);
  await faucet.fundAccount(alice.address(), 100_000_000);
  console.log("===========================================================");

  // Create a new instance of the Aptos Token Client
  const tokenClient = new TokenClient(client);

  // Create Collection, The collection is unique by account and name
  const tx = await tokenClient.createCollection(
    alice,
    COLLECTION_NAME,
    "A tutorial to learn Aptos Ecosystem 😄",
    "https://github.com/"
  );

  console.log(
    `Creating Collection with: 
    Account: ${alice.address().hex()} <Alice>,
    Name: "${COLLECTION_NAME}"`
  );

  try {
    await client.waitForTransaction(tx, { checkSuccess: true });
    console.log(`Created! Tx: ${tx}`);
  } catch (error: any) {
    // If collection with same name in the same account been created already the Tx will fail!
    console.log(error?.transaction?.vm_status || error);
  }

  console.log("===========================================================");
};

main().catch(console.error);
