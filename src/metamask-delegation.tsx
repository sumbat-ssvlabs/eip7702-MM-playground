import "./index.css";

import { Buffer } from "buffer";
globalThis.Buffer = Buffer;

import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  zeroAddress,
} from "viem";
import { createBundlerClient } from "viem/account-abstraction";
import { sepolia } from "viem/chains";

import { getDeleGatorEnvironment } from "@metamask/delegation-toolkit";

import { createCustomAccount } from "./create-account";

const [address] = await createWalletClient({
  chain: sepolia,
  transport: custom(window.ethereum!),
}).requestAddresses();

export const account = createCustomAccount(address);
// import { privateKeyToAccount } from "viem/accounts";

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(),
});

// const account = createMetaMaskEIP7702Account(address);

const walletClient = createWalletClient({
  account: account,
  chain: sepolia,
  transport: custom(window.ethereum!),
});

const metamaskWalletClient = createWalletClient({
  chain: sepolia,
  transport: custom(window.ethereum!),
});

await walletClient.switchChain({ id: sepolia.id });

export const bundlerClient = createBundlerClient({
  account,
  client: publicClient,
  transport: http(`https://api.candide.dev/public/v3/${sepolia.id}`),
});

const environment = getDeleGatorEnvironment(sepolia.id);
const contractAddress =
  environment.implementations.EIP7702StatelessDeleGatorImpl;

const authorization = await metamaskWalletClient.signAuthorization({
  account: address,
  contractAddress,
  executor: "self",
});

console.log("authorization:", authorization);

const hash = await metamaskWalletClient.sendTransaction({
  account: address,
  authorizationList: [authorization],
  data: "0x",
  to: zeroAddress,
});
console.log("hash:", hash);

// const smartAccount = await toMetaMaskSmartAccount({
//   client: publicClient,
//   implementation: Implementation.Stateless7702,
//   address: address,
//   signatory: { walletClient },
// });
