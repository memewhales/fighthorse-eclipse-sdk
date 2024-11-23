import dotenv from "dotenv";
import fs from "fs/promises"; // Use promises for modern async file handling
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { DEFAULT_DECIMALS, FightHorseSDK } from "../../src";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { AnchorProvider } from "@coral-xyz/anchor";
import {
  getOrCreateKeypair,
  getSPLBalance,
  printSOLBalance,
  printSPLBalance,
} from "../util";

const KEYS_FOLDER = __dirname + "/.keys";
const SLIPPAGE_BASIS_POINTS = 500n;


const main = async () => {
  dotenv.config();

  if (!process.env.ECLIPSE_RPC_URL) {
    console.error("Please set ECLIPSE_RPC_URL in .env file");
    console.error(
      "Example: ECLIPSE_RPC_URL=https://eclipse.helius-rpc.com"
    );
    return;
  }

  let connection = new Connection(process.env.ECLIPSE_RPC_URL || "");

  let wallet = new NodeWallet(new Keypair()); //note this is not used
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "finalized",
  });

  const testAccount = getOrCreateKeypair(KEYS_FOLDER, "test-account");
  const mint = getOrCreateKeypair(KEYS_FOLDER, "mint");

  await printSOLBalance(
    connection,
    testAccount.publicKey,
    "Test Account keypair"
  );

  let sdk = new FightHorseSDK(provider);

  let globalAccount = await sdk.getGlobalAccount();
  console.log(globalAccount);

  let currentSolBalance = await connection.getBalance(testAccount.publicKey);
  if (currentSolBalance == 0) {
    console.log(
      "Please send some ETH to the test-account:",
      testAccount.publicKey.toBase58()
    );
    return;
  }

  console.log(await sdk.getGlobalAccount());

  //Check if mint already exists
  let boundingCurveAccount = await sdk.getBondingCurveAccount(mint.publicKey);
  if (!boundingCurveAccount) {


    let imageBuffer = await fs.readFile("example/basic/robot.png");
    let imageBlob = new Blob([imageBuffer]); // Convert Buffer to Blob

    let tokenMetadata = {
      name: "GipsyKing",
      symbol: "GSP",
      description: "ALl",
      file: imageBlob,
    };

    let createResults = await sdk.createAndBuy(
      testAccount,
      mint,
      tokenMetadata,
      BigInt(0.00001 * LAMPORTS_PER_SOL),
      SLIPPAGE_BASIS_POINTS,
      {
        unitLimit: 250000,
        unitPrice: 250000,
      },
    );

    if (createResults.success) {
      console.log("Success:", `https://eclipse.fight.horse/launchpad/${mint.publicKey.toBase58()}`);
      boundingCurveAccount = await sdk.getBondingCurveAccount(mint.publicKey);
      console.log("Bonding curve after create and buy", boundingCurveAccount);
      printSPLBalance(connection, mint.publicKey, testAccount.publicKey);
    }
  } else {
    console.log("boundingCurveAccount", boundingCurveAccount);
    console.log("Success:", `https://eclipse.fight.horse/launchpad/${mint.publicKey.toBase58()}`);
    printSPLBalance(connection, mint.publicKey, testAccount.publicKey);
  }

  if (boundingCurveAccount) {
    //buy 0.00001 ETH worth of tokens
    let buyResults = await sdk.buy(
      testAccount,
      mint.publicKey,
      BigInt(0.00001 * LAMPORTS_PER_SOL),
      SLIPPAGE_BASIS_POINTS,
      {
        unitLimit: 250000,
        unitPrice: 250000,
      },
    );

    if (buyResults.success) {
      printSPLBalance(connection, mint.publicKey, testAccount.publicKey);
      console.log("Bonding curve after buy", await sdk.getBondingCurveAccount(mint.publicKey));
    } else {
      console.log("Buy failed");
    }

    //sell all tokens
    let currentSPLBalance = await getSPLBalance(
      connection,
      mint.publicKey,
      testAccount.publicKey
    );
    console.log("currentSPLBalance", currentSPLBalance);
    if (currentSPLBalance) {
      let sellResults = await sdk.sell(
        testAccount,
        mint.publicKey,
        BigInt(currentSPLBalance * Math.pow(10, DEFAULT_DECIMALS)),
        SLIPPAGE_BASIS_POINTS,
        {
          unitLimit: 250000,
          unitPrice: 250000,
        },
      );
      if (sellResults.success) {
        await printSOLBalance(
          connection,
          testAccount.publicKey,
          "Test Account keypair"
        );

        printSPLBalance(connection, mint.publicKey, testAccount.publicKey, "After SPL sell all");
        console.log("Bonding curve after sell", await sdk.getBondingCurveAccount(mint.publicKey));
      } else {
        console.log("Sell failed");
      }
    }
  }
};

main();
