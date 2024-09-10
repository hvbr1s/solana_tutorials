import { start, AddedAccount, AddedProgram } from "solana-bankrun";
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
        owner,                       // Owner of the ATA
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
    console.log("Simulated ATA and Mint Account:", rawAccount);
  });

test("custom program deposit", async () => {

    //// HOW TO LOAD A PROGRAM INTO YOUR TEST SUITE ////
    // Define the program ID (public key) for the custom program
    const programId = new PublicKey('8p6eMVgc7TmwFHSKgvpVUdAs2anR6U7EqR7J8RtQy7Zq');
    
    // Create an object representing the custom program to be added to the test environment
    const customProgram: AddedProgram = {
      programId: programId,
      name: "manifest"
    };

    // Find the function you want to call
    const depositInstruction = idl.instructions.find(ix => ix.name === 'Deposit');
    const instructionIndex = depositInstruction ? idl.instructions.indexOf(depositInstruction):2;
    console.log(`Instruction index -> ${instructionIndex}`)

    ////////////////////////////////////////////////////////////


    // Simulating token mint and token
    const mint = PublicKey.unique()
    const traderToken = PublicKey.unique()
    
    // Set up the initial balance for the payer account (in lamports)
    const initialLamports = 1_000_000_000;
    const payerPubKey = new PublicKey('MNFSTqtC93rEfYHB6hF82sKdZpUDFWkViLByLd1k1Ms')
    
    // Define the payer account with its initial state
    const payerKeypair = new Keypair();
    const payer: AddedAccount = {
        address: payerPubKey,
        info: {
            data: Buffer.alloc(0),
            executable: false,
            lamports: initialLamports,
            owner: SystemProgram.programId,
        }
    }

    // Define the market account with its initial state
    const marketKeypair = new Keypair();
    const marketAccountSize = 1000;
    const market: AddedAccount = {
        address: marketKeypair.publicKey,
        info: {
            data: Buffer.alloc(marketAccountSize),
            executable: false,
            lamports: initialLamports,
            owner: programId, // Set the owner to your program ID
        }
    }

    // Generate the vault PDA
    const [vault] = await PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), marketKeypair.publicKey.toBuffer(), mint.toBuffer()],
        programId
    );

    // Start the test environment with the custom program, payer account, and market account
    const context = await start([customProgram], [payer, market]);
    const client = context.banksClient;
    const latestBlockhash = context.lastBlockhash;
  
    // Create the deposit instruction
    const depositIx: TransactionInstruction = {
        programId: programId,
        keys: [
            { pubkey: payerKeypair.publicKey, isSigner: true, isWritable: true },
            { pubkey: marketKeypair.publicKey, isSigner: false, isWritable: true },
            { pubkey: traderToken, isSigner: false, isWritable: true },
            { pubkey: vault, isSigner: false, isWritable: true },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: mint, isSigner: false, isWritable: false },
        ],
        data: Buffer.from([instructionIndex]) // The instruction index is the only data needed
    };
  
    // Create a new transaction and add the deposit instruction
    const tx = new Transaction().add(depositIx);
    tx.recentBlockhash = latestBlockhash;
    tx.feePayer = payerKeypair.publicKey;
    tx.sign(payerKeypair);
  
    // Process the transaction
    try {
        console.log('Simulating the transaction!')
        const simRes = await client.simulateTransaction(tx);
        console.log(`Simulation results: ${simRes.result}`)
        const txResult = await client.processTransaction(tx);
        console.log('Transaction result:', txResult);
      
        // Fetch the updated account info
        const updatedPayerInfo = await client.getAccount(payerKeypair.publicKey);
        const updatedMarketInfo = await client.getAccount(marketKeypair.publicKey);
        const updatedTraderTokenInfo = await client.getAccount(traderToken);
        const updatedVaultInfo = await client.getAccount(vault);
      
        console.log('Updated payer info:', updatedPayerInfo);
        console.log('Updated market info:', updatedMarketInfo);
        console.log('Updated trader token info:', updatedTraderTokenInfo);
        console.log('Updated vault info:', updatedVaultInfo);
      
    } catch (error) {
        console.error('Error processing transaction:', error);
        throw error;
    }
});
