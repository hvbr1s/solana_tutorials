import { start, AddedAccount, AddedProgram } from "solana-bankrun";
import BN from 'bn.js';
import { PublicKey, Transaction, SystemProgram, Keypair, TransactionInstruction, Connection } from "@solana/web3.js";

const WRAPPER_STATE_DISCRIMINANT = new BN("4859840929024028656");
const NIL = 0xFFFFFFFF;
const WRAPPER_FIXED_SIZE = 64;

function createWrapperStateBuffer(trader: PublicKey): Buffer {
    const buffer = Buffer.alloc(WRAPPER_FIXED_SIZE);
    let offset = 0;

    // Write discriminant (u64)
    buffer.writeBigUInt64LE(BigInt(WRAPPER_STATE_DISCRIMINANT.toString()), offset);
    offset += 8;

    // Write trader public key (Pubkey - 32 bytes)
    trader.toBuffer().copy(buffer, offset);
    offset += 32;

    // Write num_bytes_allocated (u32)
    buffer.writeUInt32LE(0, offset);
    offset += 4;

    // Write free_list_head_index (DataIndex - u32)
    buffer.writeUInt32LE(NIL, offset);
    offset += 4;

    // Write market_infos_root_index (DataIndex - u32)
    buffer.writeUInt32LE(NIL, offset);
    offset += 4;

    // Write padding (3 * u32)
    buffer.writeUInt32LE(0, offset);
    offset += 4;
    buffer.writeUInt32LE(0, offset);
    offset += 4;
    buffer.writeUInt32LE(0, offset);

    return buffer;
}

test("simulate BatchUpdate", async () => {
    // Define the correct program IDs
    // const programIdManifest = new PublicKey('8p6eMVgc7TmwFHSKgvpVUdAs2anR6U7EqR7J8RtQy7Zq');
    // const programIdWrapper = new PublicKey('CyBtNcXwi7RURKCGv8H8nn9r8mKtRgSL4CZyLpxqRK9u');
    const programIdManifest = PublicKey.unique();;
    const programIdWrapper = PublicKey.unique();;
    
    // Custom program object
    const customProgram: AddedProgram = {
        name: "wrapper",
        programId: programIdWrapper,
    };

    const customManifest: AddedProgram = {
        name: "manifest",
        programId: programIdManifest,
    };

    // BatchUpdate instruction discriminant
    const BATCH_UPDATE_DISCRIMINANT = 4;

    const initialLamports = 1_000_000_000;

    // Create keypairs for owner, market, payer
    const ownerKeypair = Keypair.generate();
    const marketKeypair = Keypair.generate();
    const payerKeypair = Keypair.generate();

    // Generate the wrapper state PDA
    const [wrapperStatePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("wrapper_state")],
        programIdWrapper
    );

    // Define accounts
    const owner: AddedAccount = {
        address: ownerKeypair.publicKey,
        info: {
            data: Buffer.alloc(0),
            executable: false,
            lamports: initialLamports,
            owner: SystemProgram.programId,
        },
    };

    const market: AddedAccount = {
        address: marketKeypair.publicKey,
        info: {
            data: Buffer.alloc(1000), 
            executable: false,
            lamports: initialLamports,
            owner: programIdManifest,
        },
    };

    const payer: AddedAccount = {
        address: payerKeypair.publicKey,
        info: {
            data: Buffer.alloc(0),
            executable: false,
            lamports: initialLamports,
            owner: SystemProgram.programId,
        },
    };

    const wrapperState: AddedAccount = {
        address: wrapperStatePDA,
        info: {
            data: createWrapperStateBuffer(ownerKeypair.publicKey),
            executable: false,
            lamports: initialLamports,
            owner: programIdWrapper,
        },
    };

    // Start the test environment
    const context = await start([customProgram, customManifest], [owner, market, payer, wrapperState]);
    const client = context.banksClient;

    // Create the BatchUpdate instruction
    const batchUpdateIx = new TransactionInstruction({
        programId: programIdWrapper,
        keys: [
          { pubkey: programIdWrapper, isSigner: false, isWritable: false },
          { pubkey: programIdManifest, isSigner: false, isWritable: false },
          { pubkey: ownerKeypair.publicKey, isSigner: true, isWritable: true },
          { pubkey: marketKeypair.publicKey, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: payerKeypair.publicKey, isSigner: true, isWritable: true },
          { pubkey: wrapperStatePDA, isSigner: false, isWritable: true },
        ],
        data: Buffer.from([4]),
    });

    // Create and sign the transaction
    const tx = new Transaction().add(batchUpdateIx);
    tx.recentBlockhash = context.lastBlockhash;
    tx.feePayer = payerKeypair.publicKey;
    tx.sign(ownerKeypair, payerKeypair);

    // Process the transaction
    try {
        console.log("Simulating the BatchUpdate transaction...");
        const simResult = await client.simulateTransaction(tx);
        console.log("Simulation result:", simResult);

        console.log("Processing the BatchUpdate transaction...");
        const txResult = await client.processTransaction(tx);
        console.log("Transaction result:", txResult);

        // Fetch and log updated account info
        const updatedMarketInfo = await client.getAccount(marketKeypair.publicKey);
        const updatedWrapperStateInfo = await client.getAccount(wrapperStatePDA);

        console.log("Updated market info:", updatedMarketInfo);
        console.log("Updated wrapper state info:", updatedWrapperStateInfo);
    } catch (error) {
        console.error("Error processing BatchUpdate transaction:", error);
        throw error;
    }
});
