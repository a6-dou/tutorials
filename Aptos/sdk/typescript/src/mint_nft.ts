import { AptosClient, TokenClient } from "aptos";

import config from "./services/config";
import { COLLECTION_NAME } from "./services/const";

const main = async () => {
  console.log("===========================================================");
  // Create a new instance of the aptos client
  const client = new AptosClient(config.network.clientEndpoint);
  // Create a new instance of the aptos token client
  const tokenClient = new TokenClient(client);
  const bob = config.accounts.bob.instance;
  const alice = config.accounts.alice.instance;
  const collectionData = await tokenClient.getCollectionData(
    alice.address(),
    COLLECTION_NAME
  );

  console.log(
    `Collection:
     account: ${alice.address().hex()}
     name: "${collectionData.name}"
     description: "${collectionData.description}"
     supply: ${collectionData.supply}
     maximum supply: ${collectionData.maximum}
     uri: ${collectionData.uri}`
  );
  console.log("===========================================================");

  const tokenName = "Non-Fungible #3";
  const mintTx = await tokenClient.createToken(
    alice,
    COLLECTION_NAME,
    tokenName,
    "My first token",
    1,
    "https://trustwallet.com/assets/images/home_hero.png"
  );

  await client
    .waitForTransaction(mintTx, { checkSuccess: true })
    .catch((error) =>
      // If NFT with same name in the same collection been created already the Tx will fail!
      console.log(error?.transaction?.vm_status || error)
    );
  const tokenData = await tokenClient.getTokenData(
    alice.address().hex(),
    COLLECTION_NAME,
    tokenName
  );

  console.log(
    `Token: 
        name: ${tokenData.name}
        supply: ${tokenData.supply}
        description: ${tokenData.description}
        uri: ${tokenData.uri}`
  );
  const aliceBalance = await tokenClient.getToken(
    alice.address().hex(),
    COLLECTION_NAME,
    tokenName
  );
  console.log(`Alice balance: ${aliceBalance.amount}`);

  console.log("===========================================================");

  const offerTx = await tokenClient.offerToken(
    alice,
    bob.address(),
    alice.address(),
    COLLECTION_NAME,
    tokenName,
    1
  );
  console.log(`Alice offer NFT to Bob ${offerTx}...`);
  await client.waitForTransaction(offerTx, { checkSuccess: true });

  const claimTx = await tokenClient.claimToken(
    bob,
    alice.address(),
    alice.address(),
    COLLECTION_NAME,
    tokenName
  );
  console.log(`Bob claims Alice Offer ${claimTx}...`);
  await client.waitForTransaction(claimTx, { checkSuccess: true });

  const tokenId = {
    token_data_id: {
      creator: alice.address().hex(),
      collection: COLLECTION_NAME,
      name: tokenName,
    },
    property_version: "0",
  };

  const aliceBalanceAfterBobClaim = await tokenClient.getTokenForAccount(
    alice.address(),
    tokenId
  );
  console.log(
    `Alice balance after bob claim: ${aliceBalanceAfterBobClaim.amount}`
  );

  const bobBalance = await tokenClient.getTokenForAccount(
    bob.address(),
    tokenId
  );

  console.log(`Bob balance after bob claim: ${bobBalance.amount}`);
};

main().catch(console.error);
