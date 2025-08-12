import {
  prepareAndSignUserOperations,
  toMultiChainECDSAValidator,
} from "@zerodev/multi-chain-ecdsa-validator";
import {
  createKernelAccount,
  createKernelAccountClient,
  createZeroDevPaymasterClient,
} from "@zerodev/sdk";
import {
  type Chain,
  type Client,
  type Transport,
  createPublicClient,
  http,
  zeroAddress,
} from "viem";
import { toAccount } from "viem/accounts";
import { optimismSepolia, sepolia } from "viem/chains";
import { getEntryPoint, KERNEL_V3_1 } from "@zerodev/sdk/constants";
import type { SmartAccount } from "viem/account-abstraction";

function createCustomAccount(address: `0x${string}`) {
  return toAccount({
    address,
    async signMessage({ message }) {
      console.log("signMessage:", message);
      const messageToSign =
        typeof message === "string" ? message : message.raw || message;
      console.log("messageToSign:", messageToSign);
      return await window.ethereum!.request({
        method: "personal_sign",
        params: [messageToSign, address],
      });
    },
    async signTransaction() {
      throw new Error("signTransaction not implemented for MetaMask bridge");
    },
    async signTypedData(typedData) {
      return await window.ethereum!.request({
        method: "eth_signTypedData_v4",
        params: [address, JSON.stringify(typedData)],
      });
    },
    async signAuthorization(authorization) {
      console.log("authorization:", authorization);
      // Use the EIP-7702 authorization format
      const { chainId, address, nonce } = authorization;

      // Debug log to check values
      console.log("Authorization params:", { chainId, address, nonce });

      // Ensure contractAddress is properly formatted
      if (!address) {
        throw new Error(
          "Contract address is required for EIP-7702 authorization"
        );
      }

      const domain = {
        name: "EIP-7702",
        version: "1",
        chainId: Number(chainId),
      };

      const types = {
        Authorization: [
          { name: "chainId", type: "uint64" },
          { name: "address", type: "address" },
          { name: "nonce", type: "uint64" },
        ],
      };

      const message = {
        chainId: Number(chainId),
        address: address,
        nonce: Number(nonce),
      };

      console.log("Signing typed data:", { domain, types, message });

      const signature = await window.ethereum!.request({
        method: "eth_signTypedData_v4",
        params: [
          address,
          JSON.stringify({
            domain,
            types,
            primaryType: "Authorization",
            message,
          }),
        ],
      });

      // Parse the signature components
      const r = signature.slice(0, 66) as `0x${string}`;
      const s = ("0x" + signature.slice(66, 130)) as `0x${string}`;
      const v = parseInt(signature.slice(130, 132), 16);
      const yParity = v === 27 ? 0 : 1;

      return {
        chainId: chainId,
        address: address,
        nonce: nonce,
        yParity,
        r,
        s,
      };
    },
  });
}

const SEPOLIA_ZERODEV_RPC_URL =
  "https://rpc.zerodev.app/api/v3/74d04728-3d8a-4df1-80aa-75afceb4764b/chain/11155111";
const OPTIMISM_SEPOLIA_ZERODEV_RPC_URL =
  "https://rpc.zerodev.app/api/v3/74d04728-3d8a-4df1-80aa-75afceb4764b/chain/11155420";

const entryPoint = getEntryPoint("0.7");

const main = async () => {
  const sepoliaPublicClient = createPublicClient({
    transport: http(),
    chain: sepolia,
  });
  const optimismSepoliaPublicClient = createPublicClient({
    transport: http(),
    chain: optimismSepolia,
  });

  const [address] = (await window.ethereum!.request({
    method: "eth_requestAccounts",
  })) as `0x${string}`[];

  const signer = createCustomAccount(address);
  const sepoliaMultiSigECDSAValidatorPlugin = await toMultiChainECDSAValidator(
    sepoliaPublicClient,
    {
      entryPoint,
      signer,
      kernelVersion: KERNEL_V3_1,
      multiChainIds: [sepolia.id, optimismSepolia.id],
    }
  );
  const optimismSepoliaMultiSigECDSAValidatorPlugin =
    await toMultiChainECDSAValidator(optimismSepoliaPublicClient, {
      entryPoint,
      signer,
      kernelVersion: KERNEL_V3_1,
      multiChainIds: [sepolia.id, optimismSepolia.id],
    });

  const sepoliaKernelAccount = await createKernelAccount(sepoliaPublicClient, {
    entryPoint,
    plugins: {
      sudo: sepoliaMultiSigECDSAValidatorPlugin,
    },
    kernelVersion: KERNEL_V3_1,
  });

  const optimismSepoliaKernelAccount = await createKernelAccount(
    optimismSepoliaPublicClient,
    {
      entryPoint,
      plugins: {
        sudo: optimismSepoliaMultiSigECDSAValidatorPlugin,
      },
      kernelVersion: KERNEL_V3_1,
    }
  );

  console.log("sepoliaKernelAccount.address", sepoliaKernelAccount.address);
  console.log(
    "optimismSepoliaKernelAccount.address",
    optimismSepoliaKernelAccount.address
  );

  const sepoliaZeroDevPaymasterClient = createZeroDevPaymasterClient({
    chain: sepolia,
    transport: http(SEPOLIA_ZERODEV_RPC_URL),
  });

  const opSepoliaZeroDevPaymasterClient = createZeroDevPaymasterClient({
    chain: optimismSepolia,
    transport: http(OPTIMISM_SEPOLIA_ZERODEV_RPC_URL),
  });

  const sepoliaZerodevKernelClient = createKernelAccountClient({
    account: sepoliaKernelAccount,
    chain: sepolia,
    bundlerTransport: http(SEPOLIA_ZERODEV_RPC_URL),
    paymaster: {
      getPaymasterData(userOperation) {
        return sepoliaZeroDevPaymasterClient.sponsorUserOperation({
          userOperation,
        });
      },
    },
  });

  const optimismSepoliaZerodevKernelClient = createKernelAccountClient({
    account: optimismSepoliaKernelAccount,
    chain: optimismSepolia,
    bundlerTransport: http(OPTIMISM_SEPOLIA_ZERODEV_RPC_URL),
    paymaster: {
      getPaymasterData(userOperation) {
        return opSepoliaZeroDevPaymasterClient.sponsorUserOperation({
          userOperation,
        });
      },
    },
  });

  const clients: Client<Transport, Chain, SmartAccount>[] = [
    {
      ...sepoliaZerodevKernelClient,
    },
    {
      ...optimismSepoliaZerodevKernelClient,
    },
  ];

  const userOps = await Promise.all(
    clients.map(async (client) => {
      return {
        callData: await client.account.encodeCalls([
          {
            to: zeroAddress,
            value: BigInt(0),
            data: "0x",
          },
        ]),
      };
    })
  );

  const userOpParams = [
    {
      ...userOps[0],
      chainId: sepolia.id,
    },
    {
      ...userOps[1],
      chainId: optimismSepolia.id,
    },
  ];

  // prepare and sign user operations with multi-chain ecdsa validator
  const signedUserOps = await prepareAndSignUserOperations(
    clients,
    userOpParams
  );
  const sepoliaUserOp = signedUserOps[0];
  const optimismSepoliaUserOp = signedUserOps[1];
  console.log("signedUserOps:", signedUserOps);
  console.log("sending sepoliaUserOp");
  const sepoliaUserOpHash = await sepoliaZerodevKernelClient.sendUserOperation(
    sepoliaUserOp
  );

  console.log("sepoliaUserOpHash", sepoliaUserOpHash);
  console.log("waitForUserOperationReceipt");
  await sepoliaZerodevKernelClient.waitForUserOperationReceipt({
    hash: sepoliaUserOpHash,
  });

  console.log("sending optimismSepoliaUserOp");
  const optimismSepoliaUserOpHash =
    await optimismSepoliaZerodevKernelClient.sendUserOperation(
      optimismSepoliaUserOp
    );

  console.log("optimismSepoliaUserOpHash", optimismSepoliaUserOpHash);
  console.log("waitForUserOperationReceipt");
  await optimismSepoliaZerodevKernelClient.waitForUserOperationReceipt({
    hash: optimismSepoliaUserOpHash,
  });
};

main();
