import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { Metaplex } from "@metaplex-foundation/js";

const CONNECTION = new Connection("https://api.devnet.solana.com");
const SYMBOL = "CVANCE";

interface NftItem {
  name: string;
  image: string;
  tier: string;
  mint: string;
}

const TIER_STYLE: Record<string, { border: string; glow: string; badge: string }> = {
  gold:    { border: "border-yellow-400/30", glow: "shadow-yellow-400/10", badge: "bg-yellow-400/10 text-yellow-300 border-yellow-400/20" },
  silver:  { border: "border-slate-400/30",  glow: "shadow-slate-300/10",  badge: "bg-slate-400/10 text-slate-300 border-slate-400/20"   },
  bronze:  { border: "border-amber-700/30",  glow: "shadow-amber-700/10",  badge: "bg-amber-700/10 text-amber-600 border-amber-700/20"   },
  default: { border: "border-white/10",      glow: "",                     badge: "bg-white/5 text-white/30 border-white/10"             },
};

function getTier(name: string) {
  const l = name.toLowerCase();
  if (l.includes("gold"))   return "gold";
  if (l.includes("silver")) return "silver";
  if (l.includes("bronze")) return "bronze";
  return "default";
}

export default function Passport() {
  const { publicKey, connected } = useWallet();
  const [nfts, setNfts]       = useState<NftItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    if (connected && publicKey) fetchNfts();
  }, [connected, publicKey]);

  const fetchNfts = async () => {
    if (!publicKey) return;
    setLoading(true);
    setError("");
    setNfts([]);

    try {
      const metaplex = Metaplex.make(CONNECTION);
      const owner = new PublicKey(publicKey.toBase58());
      const allNfts = await metaplex.nfts().findAllByOwner({ owner });

      // Match by symbol OR by name pattern (fallback for NFTs minted without symbol)
      const ours = allNfts.filter((n) =>
        n.symbol.trim() === SYMBOL ||
        (n.symbol.trim() === "" && /front end|back end|python|web3|web 3|content/i.test(n.name))
      );

      const items: NftItem[] = await Promise.all(
        ours.map(async (n) => {
          const name = n.name;
          const tier = getTier(name);
          const mint = n.address.toBase58();
          let image = "";
          try {
            const res = await fetch(n.uri);
            const json = await res.json();
            image = json.image ?? "";
          } catch {
            image = "";
          }
          return { name, image, tier, mint };
        })
      );

      setNfts(items);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0e0e10] flex flex-col font-mono">
      <header className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-white/70 tracking-widest uppercase">Skill Passport</h1>
          <p className="text-xs text-white/25 mt-0.5">Your earned credentials</p>
        </div>
        <div className="flex items-center gap-3">
          {connected && publicKey && (
            <span className="text-xs text-white/25 bg-white/5 border border-white/10 rounded px-3 py-1">
              {publicKey.toBase58().slice(0, 4)}…{publicKey.toBase58().slice(-4)}
            </span>
          )}
          {connected && !loading && (
            <button onClick={fetchNfts} className="text-xs text-white/25 border border-white/10 rounded px-3 py-1 hover:bg-white/5 transition-all">
              Refresh
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 p-6 space-y-6">
        {!connected && (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <p className="text-sm text-white/30">Connect your wallet to view your passport</p>
          </div>
        )}

        {connected && loading && (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <svg className="w-5 h-5 text-white/20 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-xs text-white/25">Fetching your credentials…</p>
          </div>
        )}

        {connected && !loading && error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-xs text-red-400 mb-1">Error</p>
            <p className="text-[11px] text-white/30 break-all">{error}</p>
            <button onClick={fetchNfts} className="mt-3 text-xs text-white/30 border border-white/10 rounded px-4 py-1.5 hover:bg-white/5 transition-all">
              Retry
            </button>
          </div>
        )}

        {connected && !loading && !error && nfts.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
            <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-sm text-white/30">No credentials yet</p>
            <p className="text-xs text-white/20">Complete an interview to earn your first NFT</p>
          </div>
        )}

        {connected && !loading && nfts.length > 0 && (
          <>
            <p className="text-xs text-white/20">{nfts.length} credential{nfts.length !== 1 ? "s" : ""} earned</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {nfts.map((nft) => {
                const style = TIER_STYLE[nft.tier] ?? TIER_STYLE.default;
                return (
                  <div key={nft.mint} className={`rounded-xl border ${style.border} bg-white/3 overflow-hidden shadow-lg ${style.glow} hover:scale-[1.02] transition-transform duration-150`}>
                    <div className="aspect-square bg-white/5 overflow-hidden">
                      {nft.image ? (
                        <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-white/70 font-semibold leading-tight mb-2 truncate">{nft.name}</p>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full border ${style.badge}`}>
                          {nft.tier === "default" ? "—" : nft.tier}
                        </span>
                        <span className="text-[10px] text-white/15">{nft.mint.slice(0, 4)}…{nft.mint.slice(-4)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      <footer className="px-6 py-3 border-t border-white/5 flex items-center justify-between">
        <span className="text-[10px] text-white/15 tracking-widest uppercase">Cognivance</span>
        <span className="text-[10px] text-white/15">Powered by Solana</span>
      </footer>
    </div>
  );
}