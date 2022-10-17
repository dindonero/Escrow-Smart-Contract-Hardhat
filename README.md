# Escrow Smart Contract Hardhat

This project represents a simple escrow smart contract that can be used to transfer funds between two parties using a time lock. The contract is written in Solidity and deployed and tested using Hardhat with Typescript.

## Installation

1. Clone the repository and install the dependencies.
```bash
git clone https://github.com/dindonero/escrow-smart-contract-hardhat.git
cd escrow-smart-contract-hardhat
npm install
```
2. (Optional: Goerli) Create a `.env` file in the root directory and add the following environment variables:
```bash
GOERLI_RPC_URL=
PRIVATE_KEY=
ETHERSCAN_API_KEY=
```

### Deploy the contract

```bash
npm deploy
```

### Run the tests
```bash
npm test
```
