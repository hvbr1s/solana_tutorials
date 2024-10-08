# How to Deploy a Solana Program on Localnet with Anchor ⚓    

[![YouTube Video](https://img.youtube.com/vi/J6oSNwncw8o/0.jpg)](https://www.youtube.com/watch?v=J6oSNwncw8o)


## Installed Prerequisites

- Git 
- Node.js and npm or yarn
- AVM (Anchor Version Manager)
- Cargo
- Solana CLI

⚠️ Please note this setup **is** using Anchor. If your project is not using Anchor, please use [this tutorial](https://github.com/hvbr1s/solana_tutorials/blob/main/DEPLOY_NO_ANCHOR.md) instead.

## Setup Steps

1. Clone the repository:
   ```
   git clone <repo>
   ```

2. Navigate to the cloned repository:
   ```
   cd <repo>
   ```
3. Install Node.js dependencies:
   ```
   yarn install
   ```

4. Check the Rust version in `rust-toolchain.toml` file.

5. Install the required Rust version:
   ```
   rustup install <version>
   ```

6. Set the installed Rust version as default and make sure it's over-ridding the workspace:
   ```
   rustup default <version>
   rustup override set <version>
   ```

7. Verify the Rust version in use:
   ```
   rustup toolchain list
   ```

8. Open `Anchor.toml` and note the `solana_version` and `anchor_version` version.

9. Install the Solana CLI:
    ```
    solana-install init <version>
    ```

10. Verify Solana version in use:
    ```
    solana-install list
    ```

11. Install the required anchor version

```
avm install <version>
avm use <version>
anchor --version
```

## Deploying Contract with Anchor

1. Build the project:
   ```
   anchor build
   ```

   > **Note:** If you encounter an error about an outdated `rustc` version:
   > - Check current Rust version used by your Solana install: `cargo build-sbf --version` 
   > - Update Solana: `solana-install init <latest_version>`
   > - Upgrade Rust: `rustup update stable`
   > - Set workplace Rust version: 
   >   ```
   >   rustup default <version>
   >   rustup override set <version>
   >   ```
   > - Update `Anchor.toml` and `rust-toolchain.toml` with correct versions
   > - Run `cargo build-sbf --version` to check if the Rust version now matches the one mentioned as required in the error message.
   > - Clean build cache by running `Cargo clean`
   > - Retry the build command : `anchor build`

2. In a new terminal, start your local Solana blockchain:

   ```
   solana config set --url localhost
   solana-test-validator
   ```
   
3. Connect to a local Solana deployment. If needed request an airdrop then verify your SOL balance:
   ```
   solana airdrop 5
   solana balance
   ```

4. Deploy the program:
   ```
   anchor deploy
   ```
5. Copy the program ID and verify your program exist "on-chain" with a [Solana Explorer](https://explorer.solana.com/?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899)


## Testing

- After deploying the contracts, you can use the IDL and `.so` files generated by Anchor and a TypeScript test suite like [BankRun](https://www.youtube.com/watch?v=2DVudyfP5bQ) to write tests.
- Please see [this code](https://github.com/hvbr1s/solana_tutorials/blob/main/bankrun/test/minimal.test.ts) for a basic example.

## Turning on and off your local Solana validator

1. Kill the terminal running your validator
2. Later, you can restart the validator with all the state preserved:

   ```
   solana-test-validator
   ```

3. To erase the state and start fresh, run:

   ```
   solana-test-validator --reset
   ```
