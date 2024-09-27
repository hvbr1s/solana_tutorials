import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Level3 } from '../target/types/level_3';
import { web3 } from '@coral-xyz/anchor';
import {
  getAssociatedTokenAddress,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccount,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';

export const originalMint = new web3.PublicKey("AsqdvXVEZaSFRNJ5ERSSUL5firH2KBhjP76tsYXB1eKK");
export const originalFactionCreator = new web3.PublicKey("4A4cPZgQx2cZ3aejRLCMSX5839gVM3Gjrii2nxfGVwVj");
export const originalFaction = new web3.PublicKey("GG9rdMcjKFssQEdyLAeFrPSeZCPcGUBowTpwtGerrggp");

describe("level-3", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Level3 as Program<Level3>;

  const newMember = web3.Keypair.generate();
  const factionCreator = web3.Keypair.generate();
  const customMint = web3.Keypair.generate();

  let FACTION_PDA = null

  before("Fund the users!", async () => {
    await airdrop(provider.connection, newMember.publicKey);
    await airdrop(provider.connection, factionCreator.publicKey);
    await airdrop(provider.connection, customMint.publicKey);
  });

  it("creates a new faction", async () => {
    // Derive the faction PDA
    const [factionPDA] = await web3.PublicKey.findProgramAddressSync(
      [Buffer.from("faction"), factionCreator.publicKey.toBuffer(), customMint.publicKey.toBuffer()],
      program.programId
    );

    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log(`Faction PDA -> ${factionPDA}`)

      // Initialize the faction
      const initializeFaction =  await program.methods.initialize("Test Faction", "TEST")
      .accounts({
        factionCreator: factionCreator.publicKey,
        faction: factionPDA,
        mint: customMint.publicKey,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([factionCreator, customMint ])
      .rpc();

      await new Promise(resolve => setTimeout(resolve, 5000));
      const txDetails = await provider.connection.getTransaction(initializeFaction, {
        maxSupportedTransactionVersion: 0, commitment:'confirmed'
      });
      const factionDetails = await provider.connection.getAccountInfo(factionPDA, {
        commitment: 'confirmed'
      })

      FACTION_PDA = factionPDA

    });

    it ("creates an TA for the new member", async () => {
      const newMemberATA = await getAssociatedTokenAddress(
        customMint.publicKey,
        newMember.publicKey
      );
      console.log(`New Member ATA -> ${newMemberATA}`)

      const taCreate = await createAssociatedTokenAccount(
        provider.connection,
        newMember,
        customMint.publicKey,
        newMember.publicKey,
        null,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
      await new Promise(resolve => setTimeout(resolve, 5000));
      const accountInfo = await provider.connection.getBalance(newMemberATA);
      console.log("Account Info:", accountInfo);
    })

    // it ("grabs the token", async () => {

    //  const onbtainToken = await program.methods.obtainFactionToken()
    //  .accounts({
    //   factionAuthority: factionCreator.publicKey,
    //   faction: FACTION_PDA,
    //   mint: customMint.publicKey,
    //   newMember: newMember.publicKey,
    //   newMemberTokenAccount:

    //  })

    // });

  });

async function airdrop(connection: any, address: any, amount = 10_000_000_000) {
  await connection.confirmTransaction(await connection.requestAirdrop(address, amount), "confirmed");
}
