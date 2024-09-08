import { start, AddedAccount, AddedProgram } from "solana-bankrun";
import { PublicKey, Transaction, SystemProgram, Keypair, TransactionInstruction } from "@solana/web3.js";

// test("one transfer", async () => {
// 	const context = await start([], []);
// 	const client = context.banksClient;
// 	const payer = context.payer;
// 	const receiver = PublicKey.unique();
// 	const blockhash = context.lastBlockhash;
// 	const transferLamports = 1_000_000n;
// 	const ixs = [
// 		SystemProgram.transfer({
// 			fromPubkey: payer.publicKey,
// 			toPubkey: receiver,
// 			lamports: transferLamports,
// 		}),
// 	];
// 	const tx = new Transaction();
// 	tx.recentBlockhash = blockhash;
// 	tx.add(...ixs);
// 	tx.sign(payer);
// 	await client.processTransaction(tx);
// 	const balanceAfter = await client.getBalance(receiver);
//     expect(balanceAfter).toEqual(transferLamports)
// });

test("custom program", async () => {
    const programId = new PublicKey('8p6eMVgc7TmwFHSKgvpVUdAs2anR6U7EqR7J8RtQy7Zq')
    const customProgram : AddedProgram = {
        programId: programId,
        name: "manifest"
    };
    const newAccount = new Keypair()
    const initialLamports = 42_000_000;
    const receiver : AddedAccount = {
        address: newAccount.publicKey,
        info: {
            data: new Uint8Array([0,0,0,0,0,0,0,0]),
            executable: false,
            lamports: initialLamports,
            owner: SystemProgram.programId,
        }
    }
    const context = await start([customProgram], [receiver])
    const client = context.banksClient;
    const payer = context.payer;
    const latestBlockhash = context.lastBlockhash;
    const inx : TransactionInstruction[] = [
        {
            data: Buffer.alloc(0),
            programId: programId,
            keys:[
                {
                    pubkey: payer.publicKey,
                    isSigner: true,
                    isWritable: true
                },
                {
                    pubkey: receiver.address,
                    isSigner: false,
                    isWritable: true
                }
        ]
        }
    ];

})
