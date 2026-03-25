import { useEffect, useState } from "react";
import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { Metaplex } from "@metaplex-foundation/js";
import axios from "axios";
import idl from "../../../contract/escrow_contract/idl/escrow_contract.json";


const programId = new PublicKey("8KERZnKwKuPYr4JXS6oPXqJHUjLmngniFRB22Q6XZHij");
const network   = "https://api.devnet.solana.com";
const API       = "http://localhost:3000";
const CVANCE    = "CVANCE";

type EscrowStatus = "Open" | "InProgress" | "Completed" | "Cancelled";
type Tab = "my" | "all";

interface DbJob {
  id: number;
  recruiter_pubkey: string;
  company_name: string;
  role_name: string;
  job_description: string;
  amount: number;
  selected_roles: string[];
  tx_signature: string;
  created_at: string;
}

interface ChainData {
  escrowPda: string;
  status: EscrowStatus;
  canOpen: boolean;
  amount: number;
  candidate: string | null;
  jobId: number;
}

interface MergedJob extends DbJob {
  chain: ChainData | null;
}

interface UserNft { tier: string; skill: string; }

const STATUS_CONFIG: Record<EscrowStatus, { badge: string; dot: string; label: string }> = {
  Open:       { badge: "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30", dot: "bg-emerald-400",  label: "Open"        },
  InProgress: { badge: "bg-amber-500/10  text-amber-400  ring-1 ring-amber-500/30",     dot: "bg-amber-400",   label: "In Progress" },
  Completed:  { badge: "bg-sky-500/10    text-sky-400    ring-1 ring-sky-500/30",        dot: "bg-sky-400",     label: "Completed"   },
  Cancelled:  { badge: "bg-rose-500/10   text-rose-400   ring-1 ring-rose-500/30",       dot: "bg-rose-400",    label: "Cancelled"   },
};

function truncate(s: string, a = 6, b = 4) {
  return s.length <= a + b ? s : `${s.slice(0, a)}…${s.slice(-b)}`;
}
function u64Buf(n: number) {
  const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b;
}
function parseStatus(r: Record<string, unknown>): EscrowStatus {
  if ("open" in r)       return "Open";
  if ("inProgress" in r) return "InProgress";
  if ("completed" in r)  return "Completed";
  if ("cancelled" in r)  return "Cancelled";
  return "Open";
}
function CopyIcon({ copied }: { copied: boolean }) {
  return copied
    ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
    : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>;
}

export default function Work() {
  const { publicKey, signTransaction, signAllTransactions } = useWallet();

  const [tab, setTab]                     = useState<Tab>("all");
  const [myJobs, setMyJobs]               = useState<MergedJob[]>([]);
  const [allJobs, setAllJobs]             = useState<MergedJob[]>([]);
  const [userNfts, setUserNfts]           = useState<UserNft[]>([]);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [copied, setCopied]               = useState<string | null>(null);
  const [filter, setFilter]               = useState<EscrowStatus | "All">("All");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError]     = useState<string | null>(null);

  const getProgram = () => {
    if (!publicKey || !signTransaction) throw new Error("Wallet not connected");
    const connection = new Connection(network, "confirmed");
    const provider = new anchor.AnchorProvider(
      connection,
      { publicKey, signTransaction, signAllTransactions: signAllTransactions ?? (async (txs) => txs) } as anchor.Wallet,
      { commitment: "confirmed" }
    );
    return new anchor.Program(idl as anchor.Idl, provider);
  };

  // ── Fetch chain data for a recruiter pubkey ─────────────────────────────
  const fetchChainJobs = async (recruiterPubkey: PublicKey): Promise<Map<number, ChainData>> => {
    const program = getProgram();
    const [recruiterStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("recruiter"), recruiterPubkey.toBuffer()], programId
    );
    const recruiterState = await (program.account as any).recruiterState.fetchNullable(recruiterStatePda);
    const jobCount: number = recruiterState ? (recruiterState.jobCount as anchor.BN).toNumber() : 0;

    const chainMap = new Map<number, ChainData>();
    for (let i = 0; i < jobCount; i++) {
      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), recruiterPubkey.toBuffer(), u64Buf(i)], programId
      );
      try {
        const e = await (program.account as any).escrowPda.fetch(pda);
        chainMap.set(i, {
          escrowPda: pda.toBase58(),
          jobId:     (e.jobId as anchor.BN).toNumber(),
          status:    parseStatus(e.status as Record<string, unknown>),
          canOpen:   e.canOpen as boolean,
          amount:    (e.amount as anchor.BN).toNumber() / LAMPORTS_PER_SOL,
          candidate: e.candidate ? (e.candidate as PublicKey).toBase58() : null,
        });
      } catch { /* closed */ }
    }
    return chainMap;
  };

  // ── Fetch user CVance NFTs ──────────────────────────────────────────────
  const fetchUserNfts = async () => {
    if (!publicKey) return;
    try {
      const mx = Metaplex.make(new Connection(network, "confirmed"));
      const all = await mx.nfts().findAllByOwner({ owner: publicKey });
      setUserNfts(
        all.filter(n => n.symbol.trim() === CVANCE).map(n => {
          const name = n.name.toLowerCase();
          return {
            tier:  name.includes("gold") ? "gold" : name.includes("silver") ? "silver" : "bronze",
            skill: name.includes("frontend") || name.includes("front end") ? "frontend"
              : name.includes("backend")  || name.includes("back end")  ? "backend"
              : name.includes("python")   ? "python"
              : name.includes("web3")     || name.includes("web 3")     ? "web3"
              : "content",
          };
        })
      );
    } catch { /* non-fatal */ }
  };

  // ── Fetch MY jobs (as recruiter) ────────────────────────────────────────
  const fetchMyJobs = async () => {
    if (!publicKey) return;
    const { data } = await axios.get(`${API}/jobs/recruiter/${publicKey.toBase58()}`);
    const dbJobs: DbJob[] = data.jobs;
    const chainMap = await fetchChainJobs(publicKey);
    setMyJobs(dbJobs.map((job, idx) => ({ ...job, chain: chainMap.get(idx) ?? null })));
  };

  // ── Fetch ALL jobs (as candidate) ───────────────────────────────────────
  const fetchAllJobs = async () => {
    const { data } = await axios.get(`${API}/jobs`);
    const dbJobs: DbJob[] = data.jobs;

    // Group by recruiter and fetch chain data per recruiter
    const recruiterMap = new Map<string, DbJob[]>();
    for (const job of dbJobs) {
      const arr = recruiterMap.get(job.recruiter_pubkey) ?? [];
      arr.push(job);
      recruiterMap.set(job.recruiter_pubkey, arr);
    }

    const merged: MergedJob[] = [];
    for (const [recruiterKey, jobs] of recruiterMap.entries()) {
      try {
        const chainMap = await fetchChainJobs(new PublicKey(recruiterKey));
        // Sort jobs by created_at to match chain index order
        const sorted = [...jobs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        sorted.forEach((job, idx) => merged.push({ ...job, chain: chainMap.get(idx) ?? null }));
      } catch {
        jobs.forEach(job => merged.push({ ...job, chain: null }));
      }
    }

    // Sort by created_at desc
    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setAllJobs(merged);
  };

  const refresh = async () => {
    if (!publicKey) { setError("Connect your wallet."); return; }
    setLoading(true); setError(null);
    try {
      await Promise.all([fetchMyJobs(), fetchAllJobs(), fetchUserNfts()]);
    } catch (err: any) {
      setError(err?.message ?? "Failed to fetch jobs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Clear stale data immediately when wallet changes
    setMyJobs([]);
    setAllJobs([]);
    setUserNfts([]);
    setError(null);
    setActionError(null);
    if (publicKey) refresh();
  }, [publicKey]);

  const handleCopy = (t: string) => {
    navigator.clipboard.writeText(t); setCopied(t);
    setTimeout(() => setCopied(null), 1500);
  };

  const matchingNft = (job: MergedJob): UserNft | null => {
    for (const nft of userNfts) {
      if (job.selected_roles?.some(r => r.toLowerCase() === `${nft.tier}-${nft.skill}`)) return nft;
    }
    return null;
  };

  const withAction = async (pdaStr: string, fn: () => Promise<void>) => {
    setActionLoading(pdaStr); setActionError(null);
    try { await fn(); await refresh(); }
    catch (err: any) { setActionError(err?.message ?? "Transaction failed."); }
    finally { setActionLoading(null); }
  };

  const handleAcceptJob = (job: MergedJob) => withAction(job.chain!.escrowPda, async () => {
    const program = getProgram();
    console.log("[acceptJob] escrowPda:", job.chain!.escrowPda, "candidate:", publicKey!.toBase58());
    await program.methods.acceptJob()
      .accountsStrict({
        escrowPda: new PublicKey(job.chain!.escrowPda),
        candidate: publicKey!,
      })
      .rpc();
  });

  const handleCanRelease = (job: MergedJob) => withAction(job.chain!.escrowPda, async () => {
    const program = getProgram();
    console.log("[canRelease] escrowPda:", job.chain!.escrowPda, "recruiter:", publicKey!.toBase58());
    await program.methods.canRelease()
      .accountsStrict({
        escrowPda: new PublicKey(job.chain!.escrowPda),
        recruiter: publicKey!,
      })
      .rpc();
  });

  const handleRelease = (job: MergedJob) => withAction(job.chain!.escrowPda, async () => {
    const program = getProgram();
    console.log("[release] escrowPda:", job.chain!.escrowPda, "candidate:", job.chain!.candidate);
    await program.methods.release()
      .accountsStrict({
        escrowPda: new PublicKey(job.chain!.escrowPda),
        candidate: new PublicKey(job.chain!.candidate!),
      })
      .rpc();
  });

  const handleCancel = (job: MergedJob) => withAction(job.chain!.escrowPda, async () => {
    const program = getProgram();
    console.log("[cancel] escrowPda:", job.chain!.escrowPda, "recruiter:", publicKey!.toBase58());
    await program.methods.cancelled()
      .accountsStrict({
        escrowPda: new PublicKey(job.chain!.escrowPda),
        recruiter: publicKey!,
      })
      .rpc();
  });

  const jobs    = tab === "my" ? myJobs : allJobs;
  const filtered = filter === "All" ? jobs : jobs.filter(j => (j.chain?.status ?? "Open") === filter);
  const counts = {
    All:        jobs.length,
    Open:       jobs.filter(j => j.chain?.status === "Open").length,
    InProgress: jobs.filter(j => j.chain?.status === "InProgress").length,
    Completed:  jobs.filter(j => j.chain?.status === "Completed").length,
    Cancelled:  jobs.filter(j => j.chain?.status === "Cancelled").length,
  };

  return (
    <div className="relative min-h-screen bg-[#07090d] text-slate-200 px-4 py-10 sm:px-6 overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-sky-500/5 blur-[130px]" />
        <div className="absolute bottom-0 right-0 w-[420px] h-[420px] rounded-full bg-indigo-500/5 blur-[110px]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-[2.2rem] font-black tracking-tight leading-none text-white">
              Job <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">Escrows</span>
            </h1>
            
            {userNfts.length > 0 && (
              <p className="mt-1 text-[11px] text-emerald-400/70">
                ✓ {userNfts.length} CVance NFT{userNfts.length > 1 ? "s" : ""} · {userNfts.map(n => `${n.tier} ${n.skill}`).join(", ")}
              </p>
            )}
          </div>
          <button onClick={refresh} disabled={loading || !publicKey}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-widest uppercase
              bg-white/[0.04] border border-white/10 text-slate-400
              hover:bg-sky-500/10 hover:border-sky-500/40 hover:text-sky-400
              disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={loading ? "animate-spin" : ""}>
              <path d="M23 4v6h-6" /><path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            {loading ? "Syncing…" : "Refresh"}
          </button>
        </div>

        {!publicKey && (
          <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-dashed border-indigo-500/20 bg-indigo-500/[0.03]">
            <span className="text-4xl mb-4">🔌</span>
            <p className="text-sm font-bold text-indigo-300">Wallet not connected</p>
            <p className="mt-1.5 font-mono text-xs text-slate-600">Connect your Solana wallet to view jobs</p>
          </div>
        )}

        {publicKey && (
          <>
            {error && (
              <div className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                <span>⚠</span>{error}
              </div>
            )}
            {actionError && (
              <div className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                <span>⚠</span>{actionError}
                <button onClick={() => setActionError(null)} className="ml-auto">✕</button>
              </div>
            )}

            {/* Tab toggle */}
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1 w-fit mb-6">
              {([["all", "All Jobs"], ["my", "My Postings"]] as [Tab, string][]).map(([key, label]) => (
                <button key={key} onClick={() => { setTab(key); setFilter("All"); }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all duration-150
                    ${tab === key ? "bg-white/10 text-white/80" : "text-slate-500 hover:text-slate-300"}`}>
                  {label}
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-white/10 text-[10px]">
                    {key === "all" ? allJobs.length : myJobs.length}
                  </span>
                </button>
              ))}
            </div>

            {/* Filter pills */}
            {!loading && jobs.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {(["All", "Open", "InProgress", "Completed", "Cancelled"] as const).map(key => (
                  <button key={key} onClick={() => setFilter(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all duration-150
                      ${filter === key ? "bg-sky-500/15 border border-sky-500/40 text-sky-400"
                        : "bg-white/[0.03] border border-white/[0.08] text-slate-500 hover:border-white/20 hover:text-slate-300"}`}>
                    {key === "InProgress" ? "In Progress" : key}
                    <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-[10px] leading-none tabular-nums">{counts[key]}</span>
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <div className="w-7 h-7 rounded-full border-2 border-sky-500/20 border-t-sky-400 animate-spin" />
                <p className="text-sm font-bold text-slate-500">Fetching jobs…</p>
              </div>
            )}

            {!loading && jobs.length === 0 && !error && (
              <div className="flex flex-col items-center justify-center py-24 gap-2">
                <span className="text-4xl mb-2">📭</span>
                <p className="text-sm font-bold text-slate-500">
                  {tab === "my" ? "You haven't posted any jobs yet" : "No jobs found"}
                </p>
              </div>
            )}

            {!loading && filtered.length > 0 && (
              <div className="flex flex-col gap-4">
                {filtered.map((job, idx) => {
                  const status = job.chain?.status ?? "Open";
                  const s      = STATUS_CONFIG[status];
                  const isMe   = job.recruiter_pubkey === publicKey.toBase58();
                  console.log("[Work] job:", job.company_name, "| isMe:", isMe, "| status:", status, "| candidate:", job.chain?.candidate, "| canOpen:", job.chain?.canOpen);
                  console.log("[Work] selected_roles:", job.selected_roles, "| userNfts:", userNfts);
                  const isCand = job.chain?.candidate === publicKey.toBase58();
                  const nft    = matchingNft(job);
                  const isLoad = actionLoading === job.chain?.escrowPda;

                  return (
                    <div key={job.id} style={{ animationDelay: `${idx * 0.06}s` }}
                      className="group relative rounded-2xl border border-white/[0.07] bg-white/[0.025]
                        hover:border-sky-500/25 hover:bg-white/[0.04] transition-all duration-200 p-5">
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-2xl
                        bg-gradient-to-r from-transparent via-sky-400/25 to-transparent
                        opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                      {/* Company / Role / Status */}
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                        <div>
                          <p className="text-base font-black text-white">{job.company_name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{job.role_name}</p>
                          <span className="font-mono text-[10px] tracking-[0.12em] text-slate-700 uppercase">
                            Job #{String(job.chain?.jobId ?? idx).padStart(4, "0")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {isMe && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20">Your Posting</span>}
                          {job.chain?.canOpen && (
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider
                              bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30">✓ Release Ready</span>
                          )}
                          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider ${s.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
                          </span>
                        </div>
                      </div>

                      {job.job_description && (
                        <p className="text-xs text-slate-500 mb-3 leading-relaxed line-clamp-2">{job.job_description}</p>
                      )}

                      {job.selected_roles?.length > 0 && (
                        <div className="mb-4">
                          <p className="font-mono text-[10px] font-bold tracking-[0.12em] uppercase text-slate-600 mb-1.5">Required NFT</p>
                          <div className="flex flex-wrap gap-1.5">
                            {job.selected_roles.map(r => (
                              <span key={r} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ring-1
                                ${nft && r.toLowerCase() === `${nft.tier}-${nft.skill}`
                                  ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/30"
                                  : "bg-indigo-500/10 text-indigo-400 ring-indigo-500/20"}`}>
                                {r}{nft && r.toLowerCase() === `${nft.tier}-${nft.skill}` ? " ✓" : ""}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="mb-1 font-mono text-[10px] font-bold tracking-[0.12em] uppercase text-slate-600">Amount</p>
                          <p className="text-lg font-black text-white tracking-tight leading-none">
                            ◎ {(job.chain?.amount ?? job.amount / LAMPORTS_PER_SOL).toFixed(4)}
                            <span className="ml-1 text-xs font-semibold text-slate-500">SOL</span>
                          </p>
                        </div>
                        <div>
                          <p className="mb-1 font-mono text-[10px] font-bold tracking-[0.12em] uppercase text-slate-600">Recruiter</p>
                          <div className="flex items-center gap-1.5 font-mono text-xs text-slate-400">
                            {truncate(job.recruiter_pubkey)}
                            <button onClick={() => handleCopy(job.recruiter_pubkey)} className="text-slate-600 hover:text-sky-400 transition-colors">
                              <CopyIcon copied={copied === job.recruiter_pubkey} />
                            </button>
                          </div>
                        </div>
                        <div>
                          <p className="mb-1 font-mono text-[10px] font-bold tracking-[0.12em] uppercase text-slate-600">Candidate</p>
                          {job.chain?.candidate ? (
                            <div className="flex items-center gap-1.5 font-mono text-xs text-slate-400">
                              {truncate(job.chain.candidate)}
                              <button onClick={() => handleCopy(job.chain!.candidate!)} className="text-slate-600 hover:text-sky-400 transition-colors">
                                <CopyIcon copied={copied === job.chain.candidate} />
                              </button>
                            </div>
                          ) : (
                            <p className="font-mono text-xs text-slate-700 italic">None yet</p>
                          )}
                        </div>
                      </div>

                      {job.chain?.escrowPda && (
                        <div className="pt-4 border-t border-white/[0.05] mb-4">
                          <p className="mb-2 font-mono text-[10px] font-bold tracking-[0.12em] uppercase text-slate-600">Escrow PDA</p>
                          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-black/40 border border-white/[0.05]">
                            <span className="font-mono text-[11px] text-slate-500 break-all flex-1 leading-relaxed">{job.chain.escrowPda}</span>
                            <button onClick={() => handleCopy(job.chain!.escrowPda)} className="flex-shrink-0 text-slate-600 hover:text-sky-400 transition-colors">
                              <CopyIcon copied={copied === job.chain.escrowPda} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      {job.chain && (
                        <div className="flex flex-wrap gap-2 pt-4 border-t border-white/[0.05]">

                          {/* Accept Job — candidate with matching NFT */}
                          {!isMe && status === "Open" && !job.chain.candidate && (
                            nft ? (
                              <button onClick={() => handleAcceptJob(job)} disabled={isLoad}
                                className="px-4 py-2 rounded-xl text-xs font-bold
                                  bg-emerald-500/10 border border-emerald-500/30 text-emerald-400
                                  hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                                {isLoad ? "Accepting…" : `Accept Job · ${nft.tier} ${nft.skill}`}
                              </button>
                            ) : (
                              <span className="px-4 py-2 rounded-xl text-xs font-bold
                                bg-white/[0.03] border border-white/[0.08] text-slate-600 cursor-not-allowed">
                                NFT Required to Apply
                              </span>
                            )
                          )}

                          {/* Mark Can Release — recruiter */}
                          {isMe && status === "InProgress" && !job.chain.canOpen && (
                            <button onClick={() => handleCanRelease(job)} disabled={isLoad}
                              className="px-4 py-2 rounded-xl text-xs font-bold
                                bg-amber-500/10 border border-amber-500/30 text-amber-400
                                hover:bg-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                              {isLoad ? "Processing…" : "Mark Can Release"}
                            </button>
                          )}

                          {/* Release Payment — candidate */}
                          {isCand && status === "InProgress" && job.chain.canOpen && (
                            <button onClick={() => handleRelease(job)} disabled={isLoad}
                              className="px-4 py-2 rounded-xl text-xs font-bold
                                bg-sky-500/10 border border-sky-500/30 text-sky-400
                                hover:bg-sky-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                              {isLoad ? "Releasing…" : "Release Payment"}
                            </button>
                          )}

                          {/* Cancel — recruiter */}
                          {isMe && (status === "Open" || status === "InProgress") && (
                            <button onClick={() => handleCancel(job)} disabled={isLoad}
                              className="px-4 py-2 rounded-xl text-xs font-bold
                                bg-rose-500/10 border border-rose-500/30 text-rose-400
                                hover:bg-rose-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                              {isLoad ? "Cancelling…" : "Cancel Escrow"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}