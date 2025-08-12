import { toAccount } from "viem/accounts";

export function createCustomAccount(accountAddress: `0x${string}`) {
  return toAccount({
    address: accountAddress,
    async signMessage({ message }) {
      console.log("signMessage:", message);
      const messageToSign =
        typeof message === "string" ? message : message.raw || message;
      console.log("messageToSign:", messageToSign);
      return await window.ethereum!.request({
        method: "personal_sign",
        params: [messageToSign, accountAddress],
      });
    },
    async signTransaction(transaction) {
      console.log("transaction:", transaction);
      return await window.ethereum!.request({
        method: "eth_signTransaction",
        params: [JSON.stringify(transaction)],
      });
    },
    async signTypedData(typedData) {
      return await window.ethereum!.request({
        method: "eth_signTypedData_v4",
        params: [accountAddress, JSON.stringify(typedData)],
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
          accountAddress,
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
