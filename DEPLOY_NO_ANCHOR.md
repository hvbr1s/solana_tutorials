# How to Deploy a Solana Program without Anchor ⚓❌

[![YouTube Video](https://img.youtube.com/vi/T-Q9_Nq4CZg/0.jpg)](https://www.youtube.com/watch?v=T-Q9_Nq4CZg)

## Installed Prerequisites

- Git 
- Node.js and npm
- Cargo
- Solana CLI

⚠️ Please note this setup is **not** using Anchor. If your project **is** using Anchor, please use [this tutorial](https://github.com/hvbr1s/solana_tutorials/blob/main/DEPLOY_WITH_ANCHOR.md) instead.

## Setup Steps

1. Clone the repository:
   ```
   git clone <repo>
   ```

2. Navigate to the cloned repository:
   ```
   cd <repo>
   ```

3. Connect to Solana devnet, fund your local wallet by requesting an airdrop, then verify your balance:
   ```
   solana config set --url devnet
   solana airdrop 5
   solana balance
   ```

4. Install Node.js dependencies:
   ```
   yarn install
   ```

5. Check the Rust version in `rust-toolchain.toml` file under `toolchain -> channel`.

6. Install the required Rust version:
   ```
   rustup install <version>
   ```

7. Set the installed Rust version as default and make sure it overrides the workspace:
   ```
   rustup default <version>
   rustup override set <version>
   ```

8. Verify the Rust version in use:
   ```
   rustup toolchain list
   ```

9. Open `Cargo.toml` and note the `solana-program` version.

10. Install the Solana CLI:
    ```
    solana-install init <version>
    ```

11. Verify Solana version:
    ```
    solana-install list
    rustc --version
    ```
    Ensure the versions match those in your `Cargo.toml` file.

## Deploying Contract without Anchor

1. Build the project:
   ```
   cargo build
   cargo build-bpf --manifest-path=./Cargo.toml
   ```

   > **Note:** If you encounter an error about an outdated `rustc` version:
   > - Check your Solana's Rust version: `cargo build-sbf --version`
   > - Update Solana: `solana-install init <latest_version>`
   > - Set workplace Rust version to "solana": 
   >   ```
   >   rustup default solana
   >   rustup override set solana
   >   ```
   > - Retry `cargo build-bpf --manifest-path=./Cargo.toml`
   > - If this doesn't work, clean the build cache by running `Cargo clean` then retry `cargo build-bpf --manifest-path=./Cargo.toml`

2. Deploy the program:
   ```
   solana program deploy ./target/deploy/your_program.so --program-id <program_name>-keypair.json
   ```

   Repeat this step for each program that needs deployment. Use a unique key for each program.

   🔎 You can run the `solana program dump <PROGRAM_ID>` to dump any onchain program to a `.so` file.

## Generating IDL

1. Install Shank:
   ```
   cargo install --git https://github.com/metaplex-foundation/shank shank-cli
   ```

2. Generate IDL for each program:
   ```
   shank idl --out-dir idl --crate-root programs/manifest/
   shank idl --out-dir idl --crate-root programs/wrapper/
   ```

## Testing in Near-Live Conditions

- After deploying your programs and generating the IDL and `.so` files, you can test them in near-live conditions using a TypeScript test suite like [BankRun](https://www.youtube.com/watch?v=2DVudyfP5bQ)
- Please see [this code](https://github.com/hvbr1s/solana_tutorials/blob/main/bankrun/test/minimal.test.ts) for a basic example.

# Testing Setup Instructions

1. Install dependencies **in that exact order**:
   ```
   yarn add --dev mocha @types/mocha ts-node
   yarn add @babel/preset-env @babel/preset-typescript
   yarn add solana-bankrun
   yarn add jest
   ```

2. Create a `./tests/fixtures` folder and copy your `.so` program files from `./target/deploy`.

3. Add a custom test script to your `package.json` file:
   ```json
   {
     "scripts": {
       "test": "jest"
     }
   }
   ```

4. Create a `babel.config.js` file at the root of your project with the following content:
   ```javascript
   module.exports = {
     presets: [
       ['@babel/preset-env', { targets: { node: 'current' } }],
       '@babel/preset-typescript'
     ]
   };
   ```

5. Create a separate `./test` folder for your custom TypeScript tests, e.g., `testWIP.test.ts`.

6. Run your tests using:
   ```
   yarn test
   ```
