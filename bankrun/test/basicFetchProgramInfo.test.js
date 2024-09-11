import { Connection, PublicKey, clusterApiUrl, AccountInfo } from '@solana/web3.js';
import { Idl } from '@metaplex-foundation/solita';
import path from 'path';
import assert from 'assert';

async function getPublicFunctions(idl: Idl): Promise<Array<{ name: string; args: any[] }>> {
  if (!idl.instructions) {
    return [];
  }

  return idl.instructions.map(instruction => ({
    name: instruction.name,
    args: instruction.args
  }));
}

describe('Solana Program Info Test', () => {
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  const programId = new PublicKey('8p6eMVgc7TmwFHSKgvpVUdAs2anR6U7EqR7J8RtQy7Zq');

    it('should fetch and verify program information', async () => {
      // Fetch the program account info
      const accountInfo: AccountInfo<Buffer> | null = await connection.getAccountInfo(programId);

      // Assert that the account exists
      assert(accountInfo !== null, 'Program account should exist');

      // Check if it's a program account
      assert(accountInfo.executable, 'Account should be executable (a program)');

      // Log some basic information
      console.log('Program ID:', programId.toBase58());
      console.log('Owner:', accountInfo.owner.toBase58());
      console.log('Data length:', accountInfo.data.length);
      console.log('Lamports:', accountInfo.lamports);
    });

    it('should fetch the program methods', async () => {
      const idlPath = path.resolve(__dirname, '../idl/manifest.json');
      const idl: Idl = require(idlPath);
      const programMethods = await getPublicFunctions(idl);
      
      assert(programMethods.length > 0, 'Program should have methods!');
      console.log('Program methods:', JSON.stringify(programMethods, null, 2));
    });

  }
);
