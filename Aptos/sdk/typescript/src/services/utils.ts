import { AptosAccount, CoinClient } from "aptos";

export const getBalanceInApt = async (
  account: AptosAccount,
  coinClient: CoinClient
) => {
  return BigInt(await coinClient.checkBalance(account)) / BigInt(100_000_000);
};
