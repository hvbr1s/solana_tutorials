import { start, AddedAccount, AddedProgram } from "solana-bankrun";
import BN from 'bn.js';
import { PublicKey, Transaction, SystemProgram, Keypair, TransactionInstruction } from "@solana/web3.js";
import {
    TOKEN_PROGRAM_ID,
    getAssociatedTokenAddressSync,
    AccountLayout,
  } from "@solana/spl-token";
import idl from "../idl/manifest.json"

test("simulate mint and ATA creation", async () => {
    // Define the owner and the mint address (USDC in this case)
    const owner = PublicKey.unique(); // Simulated unique public key for the owner
    const usdcMint = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
  
    // Create the associated token account (ATA) for the owner
    const ata = getAssociatedTokenAddressSync(usdcMint, owner, true);
  
    // Simulate minting 1,000,000,000 USDC to the ATA (use BigInt for large values)
    const usdcToOwn = 1_000_000_000_000n; // Amount in smallest denomination (decimals adjusted)
  
    // Create token account data using Buffer
    const ACCOUNT_SIZE = AccountLayout.span; // Ensure the correct account size
    const tokenAccData = Buffer.alloc(ACCOUNT_SIZE);
  
    // Encode the token account data for the ATA using the AccountLayout
    AccountLayout.encode(
      {
        mint: usdcMint,              // The token mint (USDC)
        owner: owner,                       // Owner of the ATA
        amount: usdcToOwn,           // Balance in the token account
        delegateOption: 0,           // No delegate set
        delegate: PublicKey.default, // Default public key for delegate
        delegatedAmount: 0n,         // No delegated amount
        state: 1,                    // Account is initialized
        isNativeOption: 0,           // Not a native account
        isNative: 0n,                // No SOL in the account (native lamports)
        closeAuthorityOption: 0,     // No close authority set
        closeAuthority: PublicKey.default,
      },
      tokenAccData,
    );
  
    // Initialize a test environment with the ATA preloaded with the token data
    const context = await start(
      [],
      [
        {
          address: ata, // The address of the associated token account (ATA)
          info: {
            lamports: 1_000_000_000, // Simulating 1 SOL in the account for rent exemption
            data: tokenAccData,      // Pre-encoded account data for the token account
            owner: TOKEN_PROGRAM_ID, // Token program owns the account
            executable: false,       // Not an executable account
          },
        },
      ],
    );
  
    // Access the test environment's client and fetch the raw account data
    const client = context.banksClient;
    const rawAccount = await client.getAccount(ata); // Get the token account data
  
    // Print the fetched account data to simulate the result
    console.log("Simulated ATA and Mint Account:", rawAccount?.owner.toBase58());
  });

//////////////////////////////
//////////////////////////////
//////////////////////////////
//////////////////////////////

test("simulate custom program deposit with USDC to payer", async () => {
  // Define the correct program ID (public key) for the Manifest program
  const programId = new PublicKey("MNFSTqtC93rEfYHB6hF82sKdZpUDFWkViLByLd1k1Ms");
  // Custom program object
  const customProgram : AddedProgram = {
    programId: programId,
    name: "manifest",
  };
  // Find the program function you want to call
  const depositInstruction = idl.instructions.find((ix) => ix.name === "Deposit");
  const instructionIndex = depositInstruction ? idl.instructions.indexOf(depositInstruction) : 2;
  console.log(`Deposit Instruction Index -> ${instructionIndex}`);

  // Simulating token mint and token
  const usdcMint = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
  const initialLamports = 1_000_000_000;

  // Define the trader account with its initial state
  const traderKeypair = Keypair.generate();
  const traderPubKey =  new PublicKey(traderKeypair.publicKey)
  console.log(`Trader PubKey -> ${traderPubKey}`)
  const trader : AddedAccount = {
    address: traderPubKey,
    info: {
      data: Buffer.alloc(1000),
      executable: false,
      lamports: initialLamports,
      owner: SystemProgram.programId,
    },
  };
  // Create the associated token account (ATA) for the trader
  const traderATA = getAssociatedTokenAddressSync(usdcMint, traderPubKey, true);
  console.log(`Trader ATA -> ${traderATA}`)
  
  // Encode trader ATA data
  const ACCOUNT_SIZE = AccountLayout.span;
  const tokenAccData = Buffer.alloc(ACCOUNT_SIZE);
  AccountLayout.encode(
    {
      mint: usdcMint,
      owner: traderPubKey,
      amount: 1_000_000_000_000n,
      delegateOption: 0,
      delegate: PublicKey.default,
      delegatedAmount: 0n,
      state: 1,
      isNativeOption: 0,
      isNative: 0n,
      closeAuthorityOption: 0,
      closeAuthority: PublicKey.default,
    },
    tokenAccData
  );

  // Define the trader ATA with its initial state
  const ATA : AddedAccount = {
    address: traderATA,
    info: {
      data: tokenAccData,
      executable: false,
      lamports: initialLamports,
      owner: TOKEN_PROGRAM_ID,
    }
  };

  // Define the market account with its initial state
  const marketKeypair = Keypair.generate();
  const marketPubKey = new PublicKey(marketKeypair.publicKey)
  console.log(`Market PubKey -> ${marketPubKey}`)
  const DISCRIMINANT = new BN("4859840929024028656");
  const marketAccountData = Buffer.alloc(1000);
  DISCRIMINANT.toArrayLike(Buffer, 'le', 8).copy(marketAccountData, 0);
  const market : AddedAccount = {
    address: marketKeypair.publicKey,
    info: {
      data: marketAccountData,
      executable: false,
      lamports: initialLamports,
      owner: programId,
    },
  };

  // Generate the vault PDA
  const [vaultPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), marketKeypair.publicKey.toBuffer(), usdcMint.toBuffer()],
    programId
  );
  console.log(`PDA PubKey -> ${vaultPDA.toBase58()}`)

  // Initialize vault account at PDA
  const vault :AddedAccount = {
    address: vaultPDA,
    info: {
      data: Buffer.alloc(AccountLayout.span),
      executable: false,
      lamports: initialLamports,
      owner: TOKEN_PROGRAM_ID,
    }
  };

  // Start the test environment with the custom program, payer account, market account, and vault account
  const context = await start([customProgram], [trader, market, ATA, vault]);
  const client = context.banksClient;

  // Check initial account values
  const initialTraderInfo = await client.getAccount(traderPubKey);
  const initialMarketInfo = await client.getAccount(marketPubKey);
  const initialTraderTokenInfo = await client.getAccount(traderATA);
  const initialVaultInfo = await client.getAccount(vaultPDA);

  console.log("Initial trader info:", initialTraderInfo);
  console.log("Initial market info:", initialMarketInfo);
  console.log("Initial trader token info:", initialTraderTokenInfo);
  console.log("Initial vault info:", initialVaultInfo);


  // Create the deposit instruction
  const depositIx = {
    programId: programId,
    keys: [
      { pubkey: traderPubKey, isSigner: true, isWritable: true },
      { pubkey: marketPubKey, isSigner: false, isWritable: true },
      { pubkey: traderATA, isSigner: false, isWritable: true },
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: usdcMint, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([instructionIndex]), 
  };

  // Create a new transaction and add the deposit instruction
  const latestBlockhash = context.lastBlockhash;
  const tx = new Transaction().add(depositIx);
  tx.recentBlockhash = latestBlockhash;
  tx.feePayer = traderPubKey;
  tx.sign(traderKeypair);

  // Process the transaction
  try {
    console.log("Simulating the transaction!");
    const simRes = await client.simulateTransaction(tx);
    console.log(`Simulation results:`, simRes);

    console.log("Processing the transaction!");
    const txResult = await client.processTransaction(tx);
    console.log("Transaction result:", txResult);

    // Fetch the updated account info
    const updatedTraderInfo = await client.getAccount(traderPubKey);
    const updatedMarketInfo = await client.getAccount(marketPubKey);
    const updatedTraderTokenInfo = await client.getAccount(traderPubKey);
    const updatedVaultInfo = await client.getAccount(vaultPDA);

    console.log("Updated payer info:", updatedTraderInfo);
    console.log("Updated market info:", updatedMarketInfo);
    console.log("Updated trader token info:", updatedTraderTokenInfo);
    console.log("Updated vault info:", updatedVaultInfo);
  } catch (error) {
    console.error("Error processing transaction:", error);
    throw error;
  }
});
