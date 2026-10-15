/**
 * lib/priceContext.tsx — Global XLM/USD price context.
 * Fetches once on mount from CoinGecko free API; fails silently.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface PriceContextValue {
  xlmUsd: number | null;
}

const PriceContext = createContext<PriceContextValue>({ xlmUsd: null });

export function PriceProvider({ children }: { children: ReactNode }) {
  const [xlmUsd, setXlmUsd] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
    const backendPriceUrl = apiBase ? `${apiBase}/api/v1/price/xlm-usdc` : "/api/v1/price/xlm-usdc";

    fetch(backendPriceUrl, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Backend price returned ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const rate =
          data?.data?.usdPerXlm ??
          (typeof data?.data?.xlmPerUsdc === "number" && data.data.xlmPerUsdc > 0
            ? 1 / data.data.xlmPerUsdc
            : null);
        if (typeof rate === "number" && rate > 0) {
          setXlmUsd(rate);
        } else {
          throw new Error("Invalid rate payload");
        }
      })
      .catch(() => {
        // Fallback to CoinGecko free API if backend price oracle is unavailable
        fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd",
          { signal: controller.signal },
        )
          .then((res) => {
            if (!res.ok) return;
            return res.json();
          })
          .then((data) => {
            const price = data?.stellar?.usd;
            if (typeof price === "number" && price > 0) {
              setXlmUsd(price);
            }
          })
          .catch(() => {
            // Fail silently — USD equivalents simply won't render
          });
      });

    return () => controller.abort();
  }, []);

  return (
    <PriceContext.Provider value={{ xlmUsd }}>
      {children}
    </PriceContext.Provider>
  );
}

export function useXlmPrice(): number | null {
  return useContext(PriceContext).xlmUsd;
}
