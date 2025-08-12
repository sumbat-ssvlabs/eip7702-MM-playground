import { createWalletClient, custom } from "viem";
import { sepolia, megaethTestnet } from "viem/chains";

const walletClient = createWalletClient({
  chain: sepolia,
  transport: custom(window.ethereum!),
});

const [account] = await walletClient.requestAddresses();

const watchStatus = async (id: string, chainName: string) => {
  let status;
  do {
    status = await walletClient.getCallsStatus({ id });
    if (status.status === "pending") {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  } while (status.status === "pending");

  console.log(`${chainName} status:`, status.status);
  console.log(`${chainName} receipts:`, status.receipts);
};

// Example usage with Viem's sendCalls
async function exampleSendCalls() {
  await walletClient.switchChain({
    id: sepolia.id,
  });

  console.log("Switched to:", walletClient.chain.name);

  const { id: id1 } = await walletClient.sendCalls({
    chain: sepolia,
    account,
    calls: [
      {
        data: "0xdeadbeef",
        to: "0xa5cc3c03994DB5b0d9A5eEdD10CabaB0813678AC",
      },
      {
        data: "0xdeadbeef",
        to: "0xa5cc3c03994DB5b0d9A5eEdD10CabaB0813678AC",
      },
      {
        data: "0xdeadbeef",
        to: "0xa5cc3c03994DB5b0d9A5eEdD10CabaB0813678AC",
      },
    ],
  });

  await walletClient.switchChain({
    id: megaethTestnet.id,
  });

  console.log("Switched to:", walletClient.chain.name);

  const { id: id2 } = await walletClient.sendCalls({
    chain: megaethTestnet,
    account,
    calls: [
      {
        data: "0xdeadbeef",
        to: "0xa5cc3c03994DB5b0d9A5eEdD10CabaB0813678AC",
      },
      {
        data: "0xdeadbeef",
        to: "0xa5cc3c03994DB5b0d9A5eEdD10CabaB0813678AC",
      },
    ],
  });
}

// Run the example
exampleSendCalls();
