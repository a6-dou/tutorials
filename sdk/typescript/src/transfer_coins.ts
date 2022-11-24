import { AptosAccount, AptosClient, CoinClient, FaucetClient } from "aptos";
import config from "./services/config";
import { getBalanceInApt } from "./services/utils";

const main = async () => {
  console.log("===========================================================");
  // Create a new instance of the aptos client
  const client = new AptosClient(config.network.clientEndpoint);
  // Create a new instance of the aptos faucet client
  const faucet = new FaucetClient(
    config.network.clientEndpoint,
    config.network.faucetEndpoint
  );

  // Create client to interact with `Coin` module
  const coinClient = new CoinClient(client);

  const bob = config.accounts.bob.instance;
  const alice = config.accounts.alice.instance;
  console.log(`Bob Account:   ${bob.address()}`);
  console.log(`Alice Account: ${alice.address()}`);
  console.log(`Funding Bob with 1 APT from faucet...`);
  await faucet.fundAccount(bob.address(), 100_000_000);
  console.log("===========================================================");

  console.log(`Bob Balance: ${await getBalanceInApt(bob, coinClient)} APT`);
  console.log(`Alice Balance: ${await getBalanceInApt(alice, coinClient)} APT`);
  console.log("Transferring 1 APT from Bob to Alice...");
  const tx = await coinClient.transfer(bob, alice, 100_000_000);
  await client.waitForTransactionWithResult(tx);
  console.log(`Bob Balance: ${await getBalanceInApt(bob, coinClient)} APT`);
  console.log(`Alice Balance: ${await getBalanceInApt(alice, coinClient)} APT`);
  console.log("===========================================================");
};

main().catch(console.error);
