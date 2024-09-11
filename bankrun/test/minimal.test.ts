test("simulate custom program deposit with USDC to payer", async () => {
  // Define the program ID (public key) for the custom program
  const programId = new PublicKey("8p6eMVgc7TmwFHSKgvpVUdAs2anR6U7EqR7J8RtQy7Zq");

  // Custom program object
  const customProgram = {
    programId: programId,
    name: "manifest",
  };

  // Find the function you want to call
  const depositInstruction = idl.instructions.find((ix) => ix.name === "Deposit");
  const instructionIndex = depositInstruction ? idl.instructions.indexOf(depositInstruction) : 2;
  console.log(`Deposit Instruction Index -> ${instructionIndex}`);

  // Simulating token mint and token
  const owner = PublicKey.unique();
  const usdcMint = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

  // Create the associated token account (ATA) for the owner
  const ata = getAssociatedTokenAddressSync(usdcMint, owner, true);

  // Simulate minting 1,000,000,000 USDC to the ATA
  const usdcToOwn = 1_000_000_000_000n; // 1,000,000,000 USDC

  // Encode token account data
  const ACCOUNT_SIZE = AccountLayout.span;
  const tokenAccData = Buffer.alloc(ACCOUNT_SIZE);
  AccountLayout.encode(
    {
      mint: usdcMint,
      owner,
      amount: usdcToOwn,
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

  const initialLamports = 1_000_000_000;
  const payerPubKey = new PublicKey("MNFSTqtC93rEfYHB6hF82sKdZpUDFWkViLByLd1k1Ms");

  // Define the payer account with its initial state
  const payerKeypair = Keypair.generate();
  const payer: AddedAccount = {
    address: payerPubKey,
    info: {
      data: Buffer.alloc(1000),
      executable: false,
      lamports: initialLamports,
      owner: SystemProgram.programId,
    },
  };

  // Define the payer ATA with its initial state
  const payerATA = getAssociatedTokenAddressSync(usdcMint, payerPubKey, true); // Create payer's ATA
  const payerATAPubKey = new PublicKey(payerATA.toBase58())
  const ATA: AddedAccount =  {
    address: payerATAPubKey,
    info:{
      data: tokenAccData,
      executable: false,
      lamports:initialLamports,
      owner: payerPubKey,
    }
  }

  // Create and fund payer's ATA (Associated Token Account) with USDC
  const transferIx = createTransferInstruction(
    ata, // Source account (owner's ATA)
    payerPubKey, // Destination account (payer's ATA)
    owner, // Owner of the source account (signer)
    Number(usdcToOwn) // Amount to transfer (in the smallest denomination)
  );

  // Add the instruction to a new transaction
  const transferTx = new Transaction().add(transferIx);
  console.log(transferTx)

  // Define the market account with its initial state
  const marketKeypair = Keypair.generate();
  const marketAccountSize = 1000;
  const market: AddedAccount = {
    address: marketKeypair.publicKey,
    info: {
      data: Buffer.alloc(marketAccountSize),
      executable: false,
      lamports: initialLamports,
      owner: programId, // Set the owner to your program ID
    },
  };

  // Generate the vault PDA
  const [vault] = await PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), marketKeypair.publicKey.toBuffer(), usdcMint.toBuffer()],
    programId
  );

  // Start the test environment with the custom program, payer account, and market account
  const context = await start([customProgram], [payer, market, ATA]);
  const client = context.banksClient;
  const latestBlockhash = context.lastBlockhash;

  // Create the deposit instruction
  const depositIx: TransactionInstruction = {
    programId: programId,
    keys: [
      { pubkey: payerKeypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: marketKeypair.publicKey, isSigner: false, isWritable: true },
      { pubkey: payerATAPubKey, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: usdcMint, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([instructionIndex]),
  };

  // Create a new transaction and add the deposit instruction
  const tx = new Transaction().add(depositIx);
  tx.recentBlockhash = latestBlockhash;
  tx.feePayer = payerKeypair.publicKey;
  tx.sign(payerKeypair);

  // Process the transaction
  try {
    console.log("Simulating the transaction!");
    const simRes = await client.simulateTransaction(tx);
    console.log(`Simulation results: ${simRes.result}`);
    const txResult = await client.processTransaction(tx);
    console.log("Transaction result:", txResult);

    // Fetch the updated account info
    const updatedPayerInfo = await client.getAccount(payerKeypair.publicKey);
    const updatedMarketInfo = await client.getAccount(marketKeypair.publicKey);
    const updatedTraderTokenInfo = await client.getAccount(payerATAPubKey);
    const updatedVaultInfo = await client.getAccount(vault);

    console.log("Updated payer info:", updatedPayerInfo);
    console.log("Updated market info:", updatedMarketInfo);
    console.log("Updated trader token info:", updatedTraderTokenInfo);
    console.log("Updated vault info:", updatedVaultInfo);
  } catch (error) {
    console.error("Error processing transaction:", error);
    throw error;
  }
});
