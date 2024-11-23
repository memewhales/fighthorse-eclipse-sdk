import dotenv from "dotenv";
import { Connection, Keypair } from "@solana/web3.js";
import { FightHorseSDK } from "../../src";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { AnchorProvider } from "@coral-xyz/anchor";

const main = async () => {
  dotenv.config();

  if (!process.env.ECLIPSE_RPC_URL) {
    console.error("Please set ECLIPSE_RPC_URL in .env file");
    console.error(
      "Example: ECLIPSE_RPC_URL=https://mainnet.helius-rpc.com/?api-key=<your api key>"
    );
    console.error("Get one at: https://www.helius.dev");
    return;
  }

  let connection = new Connection(process.env.ECLIPSE_RPC_URL || "");

  let wallet = new NodeWallet(new Keypair()); //note this is not used
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "finalized",
  });

  let sdk = new FightHorseSDK(provider);

  let createEvent = sdk.addEventListener("createEvent", (event) => {
    console.log("createEvent", event);
  });
  console.log("createEvent", createEvent);

  let tradeEvent = sdk.addEventListener("tradeEvent", (event) => {
    console.log("tradeEvent", event);
  });
  console.log("tradeEvent", tradeEvent);

  let completeEvent = sdk.addEventListener("completeEvent", (event) => {
    console.log("completeEvent", event);
  });
  console.log("completeEvent", completeEvent);
};

main();
