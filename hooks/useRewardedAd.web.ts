export function useRewardedAd(_onEarned?: (amount: number, type: string) => void) {
  return { show: async () => false, isReady: false };
}
