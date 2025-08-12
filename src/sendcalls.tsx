import { createWalletClient, custom } from "viem";
import { sepolia } from "viem/chains";

const walletClient = createWalletClient({
  chain: sepolia,
  transport: custom(window.ethereum!),
});

const [account] = await walletClient.requestAddresses();

// Example usage with Viem's sendCalls
async function exampleSendCalls() {
  try {
    // Get the connected account
    console.log("Connected address:", account);

    const { id } = await walletClient.sendCalls({
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


    let status;
    do {
      console.log('id:', id)
      status = await walletClient.getCallsStatus({ id });
      console.log("Calls status:", status.status, "Receipts:", status.receipts);

      if (status.status === "pending") {
        console.log("Still pending, checking again in 2 seconds...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } while (status.status === "pending");

    console.log("Final status:", status.status);
    console.log("Final receipts:", status.receipts);

    return id;
  } catch (error) {
    console.error("Failed to send calls:", error);
    throw error;
  }
}

// Run the example
exampleSendCalls();
