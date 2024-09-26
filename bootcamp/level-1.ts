import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Level1 } from "../target/types/level_1";

describe("level-1", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Level1 as Program<Level1>;

  const explorer = anchor.web3.Keypair.generate();

  const seed = [
    97, 110, 99, 105, 101, 110, 116, 95, 118, 97, 117, 108, 116
  ]; // 'ancient_vault'

  before("Prepare", async () => {
    await airdrop(program.provider.connection, explorer.publicKey);
    const explorerBalance = await program.provider.connection.getBalance(
      explorer.publicKey
    );
    console.log("Explorer balance:", explorerBalance);
  });

  it("Finds secret1 by invoking access_vault with pins 0-255", async () => {
    const  pin=8
    const explorer = anchor.web3.Keypair.generate();
    await airdrop(program.provider.connection, explorer.publicKey);

    // Derive PDA including the pin
    const [ancientVault] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from(seed)],
    program.programId
    );

    console.log(`Attempting pin ${pin} with PDA ${ancientVault.toBase58()}`);

    try {
    // Invoke the access_vault instruction
    const tx = await program.methods
        .accessVault(pin)
        .accounts({
        explorer: explorer.publicKey,
        ancientVault: ancientVault,
        systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([explorer])
        .rpc();

    console.log(`Transaction signature for pin ${pin}: ${tx}`);

    // Wait for the transaction to be confirmed
    const confirmed = await program.provider.connection.confirmTransaction(tx, 'confirmed');
    if (confirmed) {
        console.log(`Transaction confirmed for pin ${pin}`);
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
        if (log.includes("secret1")) {
            console.log(`Found secret1 with pin ${pin}: ${log}`);
            // Optionally break the loop if you find the secret
            // break;
        }
        }
    }
    } catch (error) {
    console.log(`Error with pin ${pin}:`, error.message);
    }
  });
  

  it("Extracts secret2 from AncientVault account", async () => {
    const [ancientVault] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(seed)],
      program.programId
    );
    console.log("AncientVault PDA:", ancientVault.toBase58());

    // Fetch the account data
    try {
      const pdaAccount = await program.account.ancientVault.fetch(
        ancientVault
      );
      console.log("AncientVault account data:", pdaAccount);
      console.log("secret2:", pdaAccount.secret2);
    } catch (error) {
      console.log("Error fetching AncientVault account data:", error.message);
    }
  });
});

async function airdrop(
  connection: any,
  address: any,
  amount = 500_000_000_000
) {
  await connection.confirmTransaction(
    await connection.requestAirdrop(address, amount),
    "confirmed"
  );
}
