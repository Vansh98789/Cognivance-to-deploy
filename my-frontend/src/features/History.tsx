import { useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import IDL from "../../../contract/verify_contract/idl/verify_contract.json";
const RPC = "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey("BXttSfoCqPxcFziWpzd4jqy8LSmj8axcyBcgfNcBxLPp");

const SKILLS = [
  { label: "Content Writing",    value: "Content"   },
  { label: "Frontend Developer", value: "Front End" },
  { label: "Python Developer",   value: "Python"    },
  { label: "Backend Developer",  value: "Back End"  },
  { label: "Web3 Developer",     value: "Web 3"     },
];

interface SessionRecord {
  sessionId: string;
  subject: string;
  score: number;
  pda: string;
}

function getTier(score: number) {
  if (score >= 9) return { label: "Gold",   style: "bg-yellow-400/10 text-yellow-300 border-yellow-400/20" };
  if (score >= 7) return { label: "Silver", style: "bg-slate-400/10 text-slate-300 border-slate-400/20" };
  if (score >= 4) return { label: "Bronze", style: "bg-amber-700/10 text-amber-600 border-amber-700/20" };
  return           { label: "—",      style: "bg-white/5 text-white/30 border-white/10" };
}

function isValidPublicKey(key: string): boolean {
  try { new PublicKey(key); return true; } catch { return false; }
}

export default function History() {
  const wallet = useWallet();
  const anchorWallet = useAnchorWallet();
  const { publicKey, connected } = wallet;

  const [mode, setMode]                 = useState<"mine" | "other">("mine");
  const [inputKey, setInputKey]         = useState("");
  const [inputError, setInputError]     = useState("");
  const [selectedSkill, setSelectedSkill] = useState(SKILLS[0].value);
  const [records, setRecords]           = useState<SessionRecord[]>([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [fetched, setFetched]           = useState(false);
  const [fetchedFor, setFetchedFor]     = useState("");

  const getTargetKey = (): PublicKey | null => {
    if (mode === "mine") {
      return publicKey ?? null;
    }
    if (!isValidPublicKey(inputKey)) return null;
    return new PublicKey(inputKey);
  };

  const fetchSessions = async (skill: string, targetOverride?: PublicKey) => {
    const target = targetOverride ?? getTargetKey();
    if (!target) return;
    if (!anchorWallet) return;

    setLoading(true);
    setError("");
    setRecords([]);
    setFetched(false);

    try {
      const connection = new Connection(RPC, "confirmed");
      const provider = new AnchorProvider(connection, anchorWallet, { commitment: "confirmed" });
      const program = new Program(IDL as any, provider);

      const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
        filters: [
          {
            // 8 discriminator + 32 student pubkey = filter by student at offset 8
            memcmp: { offset: 8, bytes: target.toBase58() },
          },
        ],
      });

      const parsed: SessionRecord[] = [];
      for (const { pubkey, account } of accounts) {
        try {
          // Try decoding — IDL account name must match exactly (Anchor uses PascalCase)
          const decoded = program.coder.accounts.decode("interviewSession", account.data);

          const subject   = String(decoded.subject   ?? "");
          const sessionId = String(decoded.sessionId ?? decoded.session_id ?? "");
          const score     = decoded.score?.toNumber?.() ?? Number(decoded.score) ?? 0;

          // Filter by selected skill
          if (subject.toLowerCase() === skill.toLowerCase()) {
            parsed.push({ sessionId, subject, score, pda: pubkey.toBase58() });
          }
        } catch (decodeErr) {
          console.error("[History] decode failed for", pubkey.toBase58(), decodeErr);
        }
      }

      setRecords(parsed);
      setFetched(true);
      setFetchedFor(target.toBase58());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (mode === "other") {
      if (!inputKey.trim()) { setInputError("Enter a public key"); return; }
      if (!isValidPublicKey(inputKey.trim())) { setInputError("Invalid public key"); return; }
      setInputError("");
    }
    fetchSessions(selectedSkill);
  };

  const handleModeSwitch = (m: "mine" | "other") => {
    setMode(m);
    setRecords([]);
    setFetched(false);
    setError("");
    setInputError("");
    setInputKey("");
  };

  return (
    <div className="min-h-screen bg-[#0e0e10] flex flex-col font-mono">
      {/* Header */}
      <header className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-white/70 tracking-widest uppercase">Session History</h1>
          <p className="text-xs text-white/25 mt-0.5">On-chain interview records</p>
        </div>
        {connected && publicKey && (
          <span className="text-xs text-white/25 bg-white/5 border border-white/10 rounded px-3 py-1">
            {publicKey.toBase58().slice(0, 4)}…{publicKey.toBase58().slice(-4)}
          </span>
        )}
      </header>

      <main className="flex-1 p-6 space-y-5">
        {!connected ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-sm text-white/30">Connect your wallet to view history</p>
          </div>
        ) : (
          <>
            {/* Mode toggle */}
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1 w-fit">
              <button
                onClick={() => handleModeSwitch("mine")}
                className={`text-xs px-4 py-1.5 rounded-md transition-all duration-150 ${
                  mode === "mine"
                    ? "bg-white/10 text-white/70"
                    : "text-white/25 hover:text-white/40"
                }`}
              >
                My History
              </button>
              <button
                onClick={() => handleModeSwitch("other")}
                className={`text-xs px-4 py-1.5 rounded-md transition-all duration-150 ${
                  mode === "other"
                    ? "bg-white/10 text-white/70"
                    : "text-white/25 hover:text-white/40"
                }`}
              >
                Search by Wallet
              </button>
            </div>

            {/* Other wallet input */}
            {mode === "other" && (
              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputKey}
                    onChange={(e) => { setInputKey(e.target.value); setInputError(""); }}
                    placeholder="Enter wallet public key…"
                    className="flex-1 bg-white/5 border border-white/10 text-white/60 text-xs rounded-md
                               px-3 py-2 placeholder-white/20 focus:outline-none focus:border-white/20"
                  />
                </div>
                {inputError && (
                  <p className="text-[11px] text-red-400">{inputError}</p>
                )}
              </div>
            )}

            {/* Skill selector + fetch */}
            <div className="flex items-center gap-3">
              <select
                value={selectedSkill}
                onChange={(e) => setSelectedSkill(e.target.value)}
                className="bg-white/5 border border-white/10 text-white/60 text-xs rounded-md px-3 py-2
                           focus:outline-none focus:border-white/20 cursor-pointer"
              >
                {SKILLS.map((s) => (
                  <option key={s.value} value={s.value} className="bg-[#1a1a1c]">
                    {s.label}
                  </option>
                ))}
              </select>

              <button
                onClick={handleSearch}
                disabled={loading}
                className="text-xs text-emerald-400 border border-emerald-500/30 bg-emerald-500/10
                           rounded-md px-4 py-2 hover:bg-emerald-500/20
                           disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {loading ? "Searching…" : "Search"}
              </button>
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-white/25 py-8 justify-center">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Fetching on-chain records…
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                <p className="text-xs text-red-400 mb-1">Error</p>
                <p className="text-[11px] text-white/30 break-all">{error}</p>
              </div>
            )}

            {/* Fetched for label */}
            {!loading && fetched && (
              <p className="text-[11px] text-white/20">
                Showing results for{" "}
                <span className="text-white/35">
                  {fetchedFor === publicKey?.toBase58()
                    ? "your wallet"
                    : `${fetchedFor.slice(0, 6)}…${fetchedFor.slice(-6)}`}
                </span>
              </p>
            )}

            {/* Empty */}
            {!loading && !error && fetched && records.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-sm text-white/25">No sessions found for {selectedSkill}</p>
              </div>
            )}

            {/* Records */}
            {!loading && !error && records.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs text-white/20">
                  {records.length} session{records.length !== 1 ? "s" : ""} found
                </p>
                {records.map((r) => {
                  const tier = getTier(r.score);
                  return (
                    <div key={r.pda} className="rounded-xl border border-white/10 bg-white/3 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/60 font-semibold">{r.subject}</span>
                        <span className={`text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full border ${tier.style}`}>
                          {tier.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs text-white/25 w-12">Score</span>
                        <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-400/40 rounded-full"
                            style={{ width: `${(r.score / 10) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-white/50 w-8 text-right">{r.score}/10</span>
                      </div>

                      <div className="space-y-1.5 pt-1 border-t border-white/5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-white/20">PDA</span>
                          <span className="text-[10px] text-white/35 font-mono">
                            {r.pda.slice(0, 8)}…{r.pda.slice(-8)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-white/20">Session</span>
                          <span className="text-[10px] text-white/35 font-mono">
                            {r.sessionId.slice(0, 8)}…
                          </span>
                        </div>
                        <div className="flex justify-end pt-1">
                          <a
                            href={`https://explorer.solana.com/address/${r.pda}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-white/20 hover:text-white/40 transition-colors"
                          >
                            View on Explorer ↗
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
