# Cross-chain Token

## Steps
- 1: Select Axelar [gateway and gas service](https://docs.axelar.dev/resources/testnet)
- 2: Select a LayerZero [endpoint](https://layerzero.gitbook.io/docs/technical-reference/testnet/testnet-addresses)
- 3: Deploy [Omnicoin.sol](contracts/Omnicoin.sol) with the same Deployer + nonce combination to get same contract address on multiple chains
- 4: [setTrustedRemote](https://layerzero.gitbook.io/docs/evm-guides/master/set-trusted-remotes) for LayerZero

## Resources
- [Axelar scanner](https://testnet.axelarscan.io/gmp/search)
- [Axelar Deployed Example](https://testnet.axelarscan.io/gmp/search?contractAddress=0x8Fd796794910F0F7C28e9d84E8E4D3eD50Ba069a)