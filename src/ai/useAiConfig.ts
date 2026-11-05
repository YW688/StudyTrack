import { useSyncExternalStore } from "react";
import { getAiConfig, subscribeAiConfig, type AiConfig } from "./config";

export function useAiConfig(): AiConfig | null {
  return useSyncExternalStore(
    subscribeAiConfig,
    getAiConfig,
    () => null,
  );
}
