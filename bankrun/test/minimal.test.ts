import { start, AddedAccount, AddedProgram } from "solana-bankrun";
import { PublicKey, Transaction, SystemProgram, Keypair, TransactionInstruction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import idl from "../idl/manifest.json"

test("custom program deposit", async () => {
    // Define the program ID (public key) for the custom program
    const programId = new PublicKey('8p6eMVgc7TmwFHSKgvpVUdAs2anR6U7EqR7J8RtQy7Zq');
    
    // Create an object representing the custom program to be added to the test environment
    const customProgram: AddedProgram = {
      programId: programId,
      name: "manifest"
    };

    // Create keypairs for the payer and market
    const payerKeypair = new Keypair();
    const marketKeypair = new Keypair();

    // Create public keys for other accounts
    const mint = PublicKey.unique()
    const traderToken = PublicKey.unique()
    
    // Generate the vault PDA
    const [vault] = await PublicKey.findProgramAddress(
        [Buffer.from("vault"), marketKeypair.publicKey.toBuffer(), mint.toBuffer()],
        programId
    );

    // Set up the initial balance for the payer account (in lamports)
    const initialLamports = 42_000_000;
    const payerPubKey = new PublicKey('MNFSTqtC93rEfYHB6hF82sKdZpUDFWkViLByLd1k1Ms')
    
    // Define the payer account with its initial state
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
    const marketAccountSize = 1000; // Replace with the actual size needed for your market account
    const market: AddedAccount = {
        address: marketKeypair.publicKey,
        info: {
            data: Buffer.alloc(marketAccountSize),
            executable: false,
            lamports: initialLamports,
            owner: programId, // Set the owner to your program ID
        }
    }

    // Start the test environment with the custom program, payer account, and market account
    const context = await start([customProgram], [payer, market]);
    const client = context.banksClient;
    const latestBlockhash = context.lastBlockhash;
  
    // The deposit instruction index is 2 according to the IDL
    const instructionIndex = 2;
  
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
