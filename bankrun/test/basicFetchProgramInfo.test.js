const { Connection, PublicKey } = require('@solana/web3.js');
const assert = require('assert');
const { clusterApiUrl } = require('@solana/web3.js');

describe('Solana Program Info Test', () => {

  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  const programId = new PublicKey('8p6eMVgc7TmwFHSKgvpVUdAs2anR6U7EqR7J8RtQy7Zq');

  it('should fetch and verify program information', async () => {
    // Fetch the program account info
    const accountInfo = await connection.getAccountInfo(programId);

    // Assert that the account exists
    assert(accountInfo !== null, 'Program account should exist');

    // Check if it's a program account
    assert(accountInfo.executable, 'Account should be executable (a program)');

    // Log some basic information
    console.log('Program ID:', programId.toBase58());
    console.log('Owner:', accountInfo.owner.toBase58());
    console.log('Data length:', accountInfo.data.length);
    console.log('Lamports:', accountInfo.lamports);

    // You can add more specific assertions based on what you expect from this program
  });
});
