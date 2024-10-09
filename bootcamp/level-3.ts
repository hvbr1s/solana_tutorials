import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Level3 } from "../target/types/level_3";
import * as web3 from '@solana/web3.js';
import { AuthorityType, createAssociatedTokenAccount, createInitializeMetadataPointerInstruction, createInitializeMintInstruction, createMint, createMintToInstruction, createSetAuthorityInstruction, createUpdateMetadataPointerInstruction, ExtensionType, getAssociatedTokenAddress, getMetadataPointerState, getMint, getMintLen, initializeMetadataPointerData, initializeMintInstructionData, initializeNonTransferableMintInstructionData, isInitializeMintInstruction, LENGTH_SIZE, mintTo, setAuthority, TOKEN_2022_PROGRAM_ID, TYPE_SIZE } from "@solana/spl-token";
import { createInitializeInstruction, pack, TokenMetadata } from "@solana/spl-token-metadata";

export const mint = new web3.PublicKey("AsqdvXVEZaSFRNJ5ERSSUL5firH2KBhjP76tsYXB1eKK");
export const factionCreator = new web3.PublicKey("4A4cPZgQx2cZ3aejRLCMSX5839gVM3Gjrii2nxfGVwVj");
export const faction = new web3.PublicKey("GG9rdMcjKFssQEdyLAeFrPSeZCPcGUBowTpwtGerrggp");


// x x x x x x x x x x x x x x x x x x x x x
// | | | | | | | | | | | | | | | | | | | | |
//           ADD SECRETS CODE BELOW
// | | | | | | | | | | | | | | | | | | | | |
// v v v v v v v v v v v v v v v v v v v v v

const SECRET = ""


// ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^
// | | | | | | | | | | | | | | | | | | | | |
//           ADD SECRETS CODE ABOVE
// | | | | | | | | | | | | | | | | | | | | |
// x x x x x x x x x x x x x x x x x x x x x

describe("level-3", () => {
  const provider = anchor.AnchorProvider.env();

  anchor.setProvider(provider);

  const program = anchor.workspace.Level3 as Program<Level3>;

  const newMember = web3.Keypair.generate()
  const newMint = web3.Keypair.generate()

  // x x x x x x x x x x x x x x x x x x x x x
  // | | | | | | | | | | | | | | | | | | | | |
  //           ADD YOUR CODE BELOW
  // | | | | | | | | | | | | | | | | | | | | |
  // v v v v v v v v v v v v v v v v v v v v v

  before("Fund the users!", async () => {
    await airdrop(provider.connection, newMember.publicKey)
  });

  it("obtain token", async () => {

    // STEP 1
    // reference link: https://solana.com/developers/guides/token-extensions/metadata-pointer
    // NOTES: Creating custom mint account
    const metaData: TokenMetadata = {
      updateAuthority: newMember.publicKey,
      mint: newMint.publicKey,
      name: "OPOS",
      symbol: "OPOS",
      uri: "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/DeveloperPortal/metadata.json",
      additionalMetadata: [["description", "Only Possible On Solana"]],
    };

    const metadataExtension = TYPE_SIZE + LENGTH_SIZE;
    const metadataLen = pack(metaData).length;
    const mintLen = getMintLen([ExtensionType.MetadataPointer]);
    const lamports = await provider.connection.getMinimumBalanceForRentExemption(
      mintLen + metadataExtension + metadataLen,
    );

    let tx = new web3.Transaction().add(
      web3.SystemProgram.createAccount({
        fromPubkey: newMember.publicKey,
        newAccountPubkey: newMint.publicKey,
        space: mintLen,
        lamports,
        programId: TOKEN_2022_PROGRAM_ID
      }),
      createInitializeMetadataPointerInstruction(
        newMint.publicKey, 
        newMember.publicKey, 
        newMint.publicKey, 
        TOKEN_2022_PROGRAM_ID
      ),
      createInitializeMintInstruction(
        newMint.publicKey, // Mint Account Address
        0, // Decimals of Mint
        newMember.publicKey, // Designated Mint Authority
        newMember.publicKey, // Optional Freeze Authority
        TOKEN_2022_PROGRAM_ID, // Token Extension Program ID
      ),
      createInitializeInstruction({
        programId: TOKEN_2022_PROGRAM_ID, // Token Extension Program as Metadata Program
        metadata: newMint.publicKey, // Account address that holds the metadata
        updateAuthority: newMember.publicKey, // Authority that can update the metadata
        mint: newMint.publicKey, // Mint Account address
        mintAuthority: newMember.publicKey, // Designated Mint Authority
        name: metaData.name,
        symbol: metaData.symbol,
        uri: metaData.uri,
      })
    ) 
    tx.feePayer = newMember.publicKey
    tx.recentBlockhash = (await provider.connection.getLatestBlockhash()).blockhash
    await web3.sendAndConfirmTransaction(provider.connection, tx, [newMember, newMint], {skipPreflight: false})

    // NOTES: for checking mint info and metadata pointer
    // const mintInfo = await getMint(
    //   provider.connection,
    //   newMint.publicKey,
    //   'confirmed',
    //   TOKEN_2022_PROGRAM_ID
    // );
    // console.log('Updated mint info:', mintInfo);

    // const metadataPointer = getMetadataPointerState(mintInfo);
    // console.log("\nMetadata Pointer:", JSON.stringify(metadataPointer, null, 2));


    // STEP 2
    // 1. mint one token to our token account
    // 2. set mint&freeze authority to faction 
    const newMemberTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      newMember,
      newMint.publicKey,
      newMember.publicKey,
      null,
      TOKEN_2022_PROGRAM_ID
    );

    const tx2 = new web3.Transaction().add(
      createMintToInstruction(
        newMint.publicKey,
        newMemberTokenAccount, 
        newMember.publicKey,
        1,
        [],
        TOKEN_2022_PROGRAM_ID
      ),

      createSetAuthorityInstruction( 
        newMint.publicKey,  // account 
        newMember.publicKey, // current authority 
        AuthorityType.MintTokens, // authority type
        faction, // new authority
        [],
        TOKEN_2022_PROGRAM_ID
      ),
      createSetAuthorityInstruction( 
        newMint.publicKey,  // account 
        newMember.publicKey, // current authority 
        AuthorityType.FreezeAccount, // authority type
        faction, // new authority
        [],
        TOKEN_2022_PROGRAM_ID
      )
    )
    tx2.feePayer = newMember.publicKey
    tx2.recentBlockhash = (await provider.connection.getLatestBlockhash()).blockhash
    await web3.sendAndConfirmTransaction(provider.connection, tx2, [newMember], {skipPreflight: false})

    // NOTES: faction variable
    const extractFactionSecret = await program.methods.showFactionSecret(SECRET).accounts({
      factionMember: newMember.publicKey, 
      faction, 
      memberTokenAccount: newMemberTokenAccount, 
      mint: newMint.publicKey
    }).signers([newMember]).rpc()

    await new Promise((resolve) => setTimeout(resolve, 3000));

    const txDetails = await program.provider.connection.getParsedTransaction(extractFactionSecret, {
      "commitment": "confirmed"
    })
    console.log(txDetails)

  });

  // ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^
  // | | | | | | | | | | | | | | | | | | | | |
  //           ADD YOUR CODE ABOVE
  // | | | | | | | | | | | | | | | | | | | | |
  // x x x x x x x x x x x x x x x x x x x x x
});

async function airdrop(connection: any, address: any, amount = 10_000_000_000) {
  await connection.confirmTransaction(await connection.requestAirdrop(address, amount), "confirmed");
}
