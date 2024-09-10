# How to deploy a Solana program without Anchor ⚓❌

[![YouTube Video](https://img.youtube.com/vi/T-Q9_Nq4CZg/0.jpg)](https://www.youtube.com/watch?v=T-Q9_Nq4CZg)

## Installed Prerequisites

- Git 
- Node.js and npm
- Cargo
- Solana CLI

⚠️ Please note this setup is **not** using Ancho. If your project **is** using Anchor, please use [this tutorial](https://github.com/hvbr1s/solana_tutorials/blob/main/DEPLOY_WITH_ANCHOR.md) instead.

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
   npm install
   ```

5. Check the Rust version in `rust-toolchain.toml` file under `toolchain -> channel`.

6. Install the required Rust version:
   ```
   rustup install <version>
   ```

7. Set the installed Rust version as default:
   ```
   rustup default <version>
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
   > - Check you Solana's Rust version: `cargo build-sbf --version`
   > - Update Solana: `solana-install init <latest_version>`
   > - Upgrade Rust: `rustup update stable`
   > - Set workplace Rust version: 
   >   ```
   >   rustup default <version>
   >   rustup override set <version>
   >   ```
   > - Update `Cargo.toml` and `rust-toolchain.toml` with correct versions
   > - Clean build cache by running `Cargo clean`
   > - Retry the build commands `cargo build` then `cargo build-bpf --manifest-path=./Cargo.toml`

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

After deploying your programs and generating the IDL and `.so` files, you can test them in near-live conditions using a TypeScript test suite like [BankRun](https://www.youtube.com/watch?v=2DVudyfP5bQ)
