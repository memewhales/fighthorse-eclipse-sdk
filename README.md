# FightHorseSDK README

## Overview

The FightHorseSDK is built to facilitate interactions with the Fight Horse Eclipse decentralized platform. It offers functions for generating, purchasing, and trading tokens on the Eclipse blockchain. The SDK takes care of the required transactions and connections with the Fight.Horse protocol.

## Installation

`
npm i fighthorse-eclipse-sdk
`

## Usage Example

Start by creating a .env file and specify your RPC URL, following the format in the .env.example file.

Next, ensure that you fund an account with a minimum of 0.00001 ETH, which will be generated when executing the command below.

`
npx ts-node example/basic/index.ts
`

```typescript
import dotenv from "dotenv";
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { DEFAULT_DECIMALS, FightHorseSDK } from "fighthorse-eclipse-sdk";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { AnchorProvider } from "@coral-xyz/anchor";
import {
  getOrCreateKeypair,
  getSPLBalance,
  printSOLBalance,
  printSPLBalance,
} from "./util";

dotenv.config();

const KEYS_FOLDER = __dirname + "/.keys";
const SLIPPAGE_BASIS_POINTS = 100n;

const getProvider = () => {
  if (!process.env.ECLIPSE_RPC_URL) {
    throw new Error("Please set ECLIPSE_RPC_URL in .env file");
  }

  const connection = new Connection(process.env.ECLIPSE_RPC_URL || "");
  const wallet = new NodeWallet(new Keypair());
  return new AnchorProvider(connection, wallet, { commitment: "finalized" });
};

const createAndBuyToken = async (sdk, testAccount, mint) => {
  const tokenMetadata = {
    name: "TST-7",
    symbol: "TST-7",
    description: "TST-7: This is a test token",
    filePath: "example/basic/robot.png",
  };

  const createResults = await sdk.createAndBuy(
    testAccount,
    mint,
    tokenMetadata,
    BigInt(0.0001 * LAMPORTS_PER_SOL),
    SLIPPAGE_BASIS_POINTS,
    {
      unitLimit: 250000,
      unitPrice: 250000,
    }
  );

  if (createResults.success) {
    console.log("Success:", `https://eclipse.fight.horse/launchpad/${mint.publicKey.toBase58()}`);
    printSPLBalance(sdk.connection, mint.publicKey, testAccount.publicKey);
  } else {
    console.log("Create and Buy failed");
  }
};

const buyTokens = async (sdk, testAccount, mint) => {
  const buyResults = await sdk.buy(
    testAccount,
    mint.publicKey,
    BigInt(0.0001 * LAMPORTS_PER_SOL),
    SLIPPAGE_BASIS_POINTS,
    {
      unitLimit: 250000,
      unitPrice: 250000,
    }
  );

  if (buyResults.success) {
    printSPLBalance(sdk.connection, mint.publicKey, testAccount.publicKey);
    console.log("Bonding curve after buy", await sdk.getBondingCurveAccount(mint.publicKey));
  } else {
    console.log("Buy failed");
  }
};

const sellTokens = async (sdk, testAccount, mint) => {
  const currentSPLBalance = await getSPLBalance(
    sdk.connection,
    mint.publicKey,
    testAccount.publicKey
  );
  console.log("currentSPLBalance", currentSPLBalance);

  if (currentSPLBalance) {
    const sellResults = await sdk.sell(
      testAccount,
      mint.publicKey,
      BigInt(currentSPLBalance * Math.pow(10, DEFAULT_DECIMALS)),
      SLIPPAGE_BASIS_POINTS,
      {
        unitLimit: 250000,
        unitPrice: 250000,
      }
    );

    if (sellResults.success) {
      await printSOLBalance(sdk.connection, testAccount.publicKey, "Test Account keypair");
      printSPLBalance(sdk.connection, mint.publicKey, testAccount.publicKey, "After SPL sell all");
      console.log("Bonding curve after sell", await sdk.getBondingCurveAccount(mint.publicKey));
    } else {
      console.log("Sell failed");
    }
  }
};

const main = async () => {
  try {
    const provider = getProvider();
    const sdk = new FightHorseSDK(provider);
    const connection = provider.connection;

    const testAccount = getOrCreateKeypair(KEYS_FOLDER, "test-account");
    const mint = getOrCreateKeypair(KEYS_FOLDER, "mint");

    await printSOLBalance(connection, testAccount.publicKey, "Test Account keypair");

    const globalAccount = await sdk.getGlobalAccount();
    console.log(globalAccount);

    const currentSolBalance = await connection.getBalance(testAccount.publicKey);
    if (currentSolBalance === 0) {
      console.log("Please send some ETH to the test-account:", testAccount.publicKey.toBase58());
      return;
    }

    console.log(await sdk.getGlobalAccount());

    let bondingCurveAccount = await sdk.getBondingCurveAccount(mint.publicKey);
    if (!bondingCurveAccount) {
      await createAndBuyToken(sdk, testAccount, mint);
      bondingCurveAccount = await sdk.getBondingCurveAccount(mint.publicKey);
    }

    if (bondingCurveAccount) {
      await buyTokens(sdk, testAccount, mint);
      await sellTokens(sdk, testAccount, mint);
    }
  } catch (error) {
    console.error("An error occurred:", error);
  }
};

main();
```


### FightHorseSDK Class

The `FightHorseSDK` class offers functions for interacting with the Fight.Horse protocol. The following are the method signatures along with their respective descriptions.


#### createAndBuy

```typescript
async createAndBuy(
  creator: Keypair,
  mint: Keypair,
  createTokenMetadata: CreateTokenMetadata,
  buyAmountEth: bigint,
  slippageBasisPoints: bigint = 500n,
  priorityFees?: PriorityFee,
  commitment: Commitment = DEFAULT_COMMITMENT,
  finality: Finality = DEFAULT_FINALITY
): Promise<TransactionResult>
```

- Creates a new token and buys it.
- **Parameters**:
  - `creator`: The keypair of the token creator.
  - `mint`: The keypair of the mint account.
  - `createTokenMetadata`: Metadata for the token.
  - `buyAmountEth`: Amount of ETH to buy.
  - `slippageBasisPoints`: Slippage in basis points (default: 500).
  - `priorityFees`: Priority fees (optional).
  - `commitment`: Commitment level (default: DEFAULT_COMMITMENT).
  - `finality`: Finality level (default: DEFAULT_FINALITY).
- **Returns**: A promise that resolves to a `TransactionResult`.

#### buy

```typescript
async buy(
  buyer: Keypair,
  mint: PublicKey,
  buyAmountEth: bigint,
  slippageBasisPoints: bigint = 500n,
  priorityFees?: PriorityFee,
  commitment: Commitment = DEFAULT_COMMITMENT,
  finality: Finality = DEFAULT_FINALITY
): Promise<TransactionResult>
```

- Buys a specified amount of tokens.
- **Parameters**:
  - `buyer`: The keypair of the buyer.
  - `mint`: The public key of the mint account.
  - `buyAmountEth`: Amount of ETH to buy.
  - `slippageBasisPoints`: Slippage in basis points (default: 500).
  - `priorityFees`: Priority fees (optional).
  - `commitment`: Commitment level (default: DEFAULT_COMMITMENT).
  - `finality`: Finality level (default: DEFAULT_FINALITY).
- **Returns**: A promise that resolves to a `TransactionResult`.

#### sell

```typescript
async sell(
  seller: Keypair,
  mint: PublicKey,
  sellTokenAmount: bigint,
  slippageBasisPoints: bigint = 500n,
  priorityFees?: PriorityFee,
  commitment: Commitment = DEFAULT_COMMITMENT,
  finality: Finality = DEFAULT_FINALITY
): Promise<TransactionResult>
```

- Sells a specified amount of tokens.
- **Parameters**:
  - `seller`: The keypair of the seller.
  - `mint`: The public key of the mint account.
  - `sellTokenAmount`: Amount of tokens to sell.
  - `slippageBasisPoints`: Slippage in basis points (default: 500).
  - `priorityFees`: Priority fees (optional).
  - `commitment`: Commitment level (default: DEFAULT_COMMITMENT).
  - `finality`: Finality level (default: DEFAULT_FINALITY).
- **Returns**: A promise that resolves to a `TransactionResult`.

#### addEventListener

```typescript
addEventListener<T extends FightHorseEventType>(
  eventType: T,
  callback: (event: FightHorseEventHandlers[T], slot: number, signature: string) => void
): number
```

- Adds an event listener for the specified event type.
- **Parameters**:
  - `eventType`: The type of event to listen for.
  - `callback`: The callback function to execute when the event occurs.
- **Returns**: An identifier for the event listener.

#### removeEventListener

```typescript
removeEventListener(eventId: number): void
```

- Removes the event listener with the specified identifier.
- **Parameters**:
  - `eventId`: The identifier of the event listener to remove.

### Running the Examples

#### Basic Example

To run the basic example for creating, buying, and selling tokens, use the following command:

```bash
npx ts-node example/basic/index.ts
```

#### Event Subscription Example

This example demonstrates how to set up event subscriptions using the FightHorse SDK.

#### Script: `example/events/events.ts`

```typescript
import dotenv from "dotenv";
import { Connection, Keypair } from "@solana/web3.js";
import { FightHorseSDK } from "fighthorse-eclipse-sdk";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { AnchorProvider } from "@coral-xyz/anchor";

dotenv.config();

const getProvider = () => {
  if (!process.env.ECLIPSE_RPC_URL) {
    throw new Error("Please set ECLIPSE_RPC_URL in .env file");
  }

  const connection = new Connection(process.env.ECLIPSE_RPC_URL || "");
  const wallet = new NodeWallet(new Keypair());
  return new AnchorProvider(connection, wallet, { commitment: "finalized" });
};

const setupEventListeners = async (sdk) => {
  const createEventId = sdk.addEventListener("createEvent", (event, slot, signature) => {
    console.log("createEvent", event, slot, signature);
  });
  console.log("Subscribed to createEvent with ID:", createEventId);

  const tradeEventId = sdk.addEventListener("tradeEvent", (event, slot, signature) => {
    console.log("tradeEvent", event, slot, signature);
  });
  console.log("Subscribed to tradeEvent with ID:", tradeEventId);

  const completeEventId = sdk.addEventListener("completeEvent", (event, slot, signature) => {
    console.log("completeEvent", event, slot, signature);
  });
  console.log("Subscribed to completeEvent with ID:", completeEventId);
};

const main = async () => {
  try {
    const provider = getProvider();
    const sdk = new FightHorseSDK(provider);

    // Set up event listeners
    await setupEventListeners(sdk);
  } catch (error) {
    console.error("An error occurred:", error);
  }
};

main();
```

#### Running the Event Subscription Example

To run the event subscription example, use the following command:

```bash
npx ts-node example/events/events.ts
```

## Contributing

We welcome contributions! Please submit a pull request or open an issue to discuss any changes.

---

## Disclaimer

This software is provided "as is," without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, and noninfringement. In no event shall the authors or copyright holders be liable for any claim, damages, or other liability, whether in an action of contract, tort, or otherwise, arising from, out of, or in connection with the software or the use or other dealings in the software.

**Use at your own risk.** The authors take no responsibility for any harm or damage caused by the use of this software. Users are responsible for ensuring the suitability and safety of this software for their specific use cases.

By using this software, you acknowledge that you have read, understood, and agree to this disclaimer.

---

Feel free to customize it further to suit the specific context and requirements of your project.

---

By following this README, you should be able to install the FightHorse SDK, run the provided examples, and understand how to set up event listeners and perform token operations.
