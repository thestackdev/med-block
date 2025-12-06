import { useWeb3 } from "../context/Web3Context";

/**
 * Hook for contract interactions - wraps Web3Context for backward compatibility.
 * DEPRECATED: Use useWeb3() from Web3Context directly instead.
 */
export function useContracts() {
  const {
    provider,
    signer,
    account,
    contracts,
    isLoading,
    networkError
  } = useWeb3();

  return {
    provider,
    signer,
    account,
    contracts,
    error: networkError,
    isLoading,
    reinitialize: () => window.location.reload()
  };
}
