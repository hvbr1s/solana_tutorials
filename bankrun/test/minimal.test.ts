import { start, AddedAccount, AddedProgram } from "solana-bankrun";
import { PublicKey, Transaction, SystemProgram, Keypair, TransactionInstruction } from "@solana/web3.js";
import idl from "../idl/<>.json"

test("custom program deposit", async () => {
    const programId = new PublicKey('<>');
    const customProgram: AddedProgram = {
      programId: programId,
      name: "manifest"
    };

    // Find the index of the 'deposit' instruction in the IDL
    const depositInstruction = idl.instructions.find(ix => ix.name === 'Deposit');
    const instructionIndex = depositInstruction ? idl.instructions.indexOf(depositInstruction):0;
    console.log(`Instruction index -> ${instructionIndex}`)

    const traderKeypair = new Keypair();
    const initialLamports = 42_000_000;

    // Generate a PDA for the trader account
    const [traderPDA, _] = await PublicKey.findProgramAddress(
        [Buffer.from("trader"), traderKeypair.publicKey.toBuffer()],
        programId
    );

    const trader : AddedAccount = {
        address: traderKeypair.publicKey,
        info: {
            data: Buffer.alloc(0),
            executable: false,
            lamports: initialLamports,
            owner: SystemProgram.programId,
        }
    }

    const context = await start([customProgram], [trader]);
    const client = context.banksClient;
    const latestBlockhash = context.lastBlockhash;

    // First, initialize the trader account
    const initializeIx = new TransactionInstruction({
        programId: programId,
        keys: [
            { pubkey: traderKeypair.publicKey, isSigner: true, isWritable: true },
            { pubkey: traderPDA, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: Buffer.from([0]) 
    });

    let tx = new Transaction().add(initializeIx);
    tx.recentBlockhash = latestBlockhash;
    tx.feePayer = traderKeypair.publicKey;
    tx.sign(traderKeypair);

    await client.processTransaction(tx);


    // Set up parameters for the deposit instruction
    const amount = 1000000; // amount in lamports
    const isBase = true; // flag to indicate if it's a base token
  
    // Construct the instruction data buffer
    const instructionData = Buffer.alloc(10);
    instructionData.writeUInt8(instructionIndex, 0);
    instructionData.writeBigUInt64LE(BigInt(amount), 1);
    instructionData.writeUInt8(isBase ? 1 : 0, 9);

    const depositIx: TransactionInstruction = {
        programId: programId,
        keys: [
          { pubkey: traderKeypair.publicKey, isSigner: true, isWritable: true },
          { pubkey: traderPDA, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: instructionData
    };

    tx = new Transaction().add(depositIx);
    tx.recentBlockhash = latestBlockhash;
    tx.feePayer = traderKeypair.publicKey;
    tx.sign(traderKeypair);

    try {
        const txResult = await client.processTransaction(tx);
        console.log('Transaction result:', txResult);
        
        const updatedTraderInfo = await client.getAccount(traderPDA);
        console.log('Updated trader info:', updatedTraderInfo);
        
    } catch (error) {
        console.error('Error processing transaction:', error);
        throw error;
    }
});
