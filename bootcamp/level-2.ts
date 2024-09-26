import * as anchor from "@coral-xyz/anchor";
import { web3 } from "@coral-xyz/anchor";

import { Program } from "@coral-xyz/anchor";
import { Level2 } from "../target/types/level_2";


const SECRET1 = ""
const SECRET2 = ""

describe("level-2", () => {
  // Configure the client to use the local cluster.
  let provider = anchor.AnchorProvider.env();

  anchor.setProvider(provider);

  const program = anchor.workspace.Level2 as Program<Level2>;

  anchor.setProvider(provider);

  const user1 = web3.Keypair.generate();
  const user2 = web3.Keypair.generate();
  const [player1_account] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("EXPLORER"), user1.publicKey.toBuffer()],
    program.programId
  );
  const [player2_account] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("EXPLORER"), user2.publicKey.toBuffer()],
    program.programId
  );

  before("Fund the users!", async () => {
    await airdrop(provider.connection, user1.publicKey);
    await airdrop(provider.connection, user2.publicKey);
  });

  it("Setup players!", async () => {
    await program.methods
      .initExplorer(SECRET1, SECRET2)
      .accounts({
        user: user1.publicKey,
        explorerAccount: player1_account,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([user1])
      .rpc({ commitment: "confirmed" });

    await program.methods
      .initExplorer(SECRET1, SECRET2)
      .accounts({
        user: user2.publicKey,
        explorerAccount: player2_account,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([user2])
      .rpc({ commitment: "confirmed" });
  });


  // Function to fetch explorer stats
  async function getExplorerStats(explorerAccount) {
    return await program.account.explorer.fetch(explorerAccount, "confirmed");
  }

  // Function to heal an explorer using a fresh healer
  async function healExplorer(injuredExplorerAccount) {
    // Create a new healer user and explorer account
    const healerUser = web3.Keypair.generate();
    const [healerAccount] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("EXPLORER"), healerUser.publicKey.toBuffer()],
      program.programId
    );

    // Fund the healer
    await airdrop(provider.connection, healerUser.publicKey);

    // Initialize the healer explorer
    await program.methods
      .initExplorer(SECRET1, SECRET2)
      .accounts({
        user: healerUser.publicKey,
        explorerAccount: healerAccount,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([healerUser])
      .rpc({ commitment: "confirmed" });

    // Fetch healer's stats
    let healerStats = await getExplorerStats(healerAccount);
    console.log(`Healer Stats before healing:`, healerStats);

    try {
      await program.methods
        .healAlly()
        .accounts({
          user: healerUser.publicKey,
          injuredExplorer: injuredExplorerAccount,
          healer: healerAccount,
        })
        .signers([healerUser])
        .rpc({ commitment: "confirmed" });

      // Fetch healer's stats after healing
      healerStats = await getExplorerStats(healerAccount);
      console.log(`Healer Stats after healing:`, healerStats);

      console.log(`Healed explorer.`);
    } catch (err) {
      console.error(`Error healing explorer: ${err}`);
    }
  }

  // Function to battle monsters and heal when necessary
  async function levelUpExplorer(user, explorerAccount) {
    let explorerStats = await getExplorerStats(explorerAccount);

    while (explorerStats.experience < 100) {
      // Battle a monster
      try {
        await program.methods
          .battleMonster()
          .accounts({ user: user.publicKey, explorerAccount: explorerAccount })
          .signers([user])
          .rpc({ commitment: "confirmed" });
      } catch (err) {
        console.error(`Error battling monster: ${err}`);
        break;
      }

      explorerStats = await getExplorerStats(explorerAccount);
      console.log(`Explorer Stats after battling:`, explorerStats);

      // Heal if health is low but greater than 0
      if (explorerStats.health <= 20 && explorerStats.health > 0) {
        await healExplorer(explorerAccount);

        // Update stats after healing
        explorerStats = await getExplorerStats(explorerAccount);
        console.log(`Explorer Stats after healing:`, explorerStats);
      }

      // Break if health is 0
      if (explorerStats.health === 0) {
        console.error(`Explorer has died.`);
        break;
      }

      // Break if mana is depleted (if applicable)
      if (explorerStats.mana === 0) {
        console.error(`Explorer has no mana left.`);
        break;
      }
    }
  }

  // Level up both explorers
  it("Level up explorers", async () => {
    console.log("Leveling up Explorer 1...");
    await levelUpExplorer(user1, player1_account);

    console.log("Leveling up Explorer 2...");
    await levelUpExplorer(user2, player2_account);
  });

  it("Reveal the secret", async () => {
   const tx = await program.methods
      .revealSecret()
      .accounts({
        user1: user1.publicKey,
        user2: user2.publicKey,
        explorer1Account: player1_account,
        explorer2Account: player2_account,
      })
      .signers([user1, user2])
      .rpc({ commitment: "confirmed" });

    // Wait for the transaction to be confirmed
    const confirmed = await program.provider.connection.confirmTransaction(tx, 'confirmed');
    if (confirmed) {
        console.log(`Transaction confirmed`);
    }

    // Fetch the transaction logs
    const txDetails = await program.provider.connection.getTransaction(tx, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
    });

    if (txDetails && txDetails.meta && txDetails.meta.logMessages) {
        const logs = txDetails.meta.logMessages;
        for (const log of logs) {
        console.log(log);
        if (log.includes("secret3")) {
        }
        }
    }
  });
});

async function airdrop(connection: any, address: any, amount = 1000000000) {
  await connection.confirmTransaction(
    await connection.requestAirdrop(address, amount),
    "confirmed"
  );
}
