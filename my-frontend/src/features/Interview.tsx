import { useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import { useMemo, useState } from "react";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { createNft, mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { generateSigner, percentAmount } from "@metaplex-foundation/umi";
import { AnchorProvider, Program, BN, web3 } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import IDL from "../../../contract/verify_contract/idl/verify_contract.json";


const RPC = "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey("BXttSfoCqPxcFziWpzd4jqy8LSmj8axcyBcgfNcBxLPp");

const METADATA_ROOT =
  "https://gateway.pinata.cloud/ipfs/bafybeiguls4kjkczijlg4gnwb7jempcdzkhy2uudpd4f7m65t6rs5tmavi";
const IMAGE_ROOT =
  "https://gateway.pinata.cloud/ipfs/bafybeidia7ehjq62fctcoiruh5ngboeoxtqju33ljndix5qozplotxv3ce";

const NFT_MAP: Record<string, Record<string, { uri: string; image: string }>> = {
  "front end": {
    bronze: { uri: `${METADATA_ROOT}/frontend-bronze.json`, image: `${IMAGE_ROOT}/frontend-bronze.png` },
    silver: { uri: `${METADATA_ROOT}/frontend-silver.json`, image: `${IMAGE_ROOT}/frontend-silver.png` },
    gold:   { uri: `${METADATA_ROOT}/frontend-gold.json`,   image: `${IMAGE_ROOT}/frontend-gold.png` },
  },
  frontend: {
    bronze: { uri: `${METADATA_ROOT}/frontend-bronze.json`, image: `${IMAGE_ROOT}/frontend-bronze.png` },
    silver: { uri: `${METADATA_ROOT}/frontend-silver.json`, image: `${IMAGE_ROOT}/frontend-silver.png` },
    gold:   { uri: `${METADATA_ROOT}/frontend-gold.json`,   image: `${IMAGE_ROOT}/frontend-gold.png` },
  },
  "frontend developer": {
    bronze: { uri: `${METADATA_ROOT}/frontend-bronze.json`, image: `${IMAGE_ROOT}/frontend-bronze.png` },
    silver: { uri: `${METADATA_ROOT}/frontend-silver.json`, image: `${IMAGE_ROOT}/frontend-silver.png` },
    gold:   { uri: `${METADATA_ROOT}/frontend-gold.json`,   image: `${IMAGE_ROOT}/frontend-gold.png` },
  },
  "back end": {
    bronze: { uri: `${METADATA_ROOT}/backend-bronze.json`, image: `${IMAGE_ROOT}/backend-bronze.png` },
    silver: { uri: `${METADATA_ROOT}/backend-silver.json`, image: `${IMAGE_ROOT}/backend-silver.png` },
    gold:   { uri: `${METADATA_ROOT}/backend-gold.json`,   image: `${IMAGE_ROOT}/backend-gold.png` },
  },
  backend: {
    bronze: { uri: `${METADATA_ROOT}/backend-bronze.json`, image: `${IMAGE_ROOT}/backend-bronze.png` },
    silver: { uri: `${METADATA_ROOT}/backend-silver.json`, image: `${IMAGE_ROOT}/backend-silver.png` },
    gold:   { uri: `${METADATA_ROOT}/backend-gold.json`,   image: `${IMAGE_ROOT}/backend-gold.png` },
  },
  "backend developer": {
    bronze: { uri: `${METADATA_ROOT}/backend-bronze.json`, image: `${IMAGE_ROOT}/backend-bronze.png` },
    silver: { uri: `${METADATA_ROOT}/backend-silver.json`, image: `${IMAGE_ROOT}/backend-silver.png` },
    gold:   { uri: `${METADATA_ROOT}/backend-gold.json`,   image: `${IMAGE_ROOT}/backend-gold.png` },
  },
  python: {
    bronze: { uri: `${METADATA_ROOT}/python-bronze.json`, image: `${IMAGE_ROOT}/python-bronze.png` },
    silver: { uri: `${METADATA_ROOT}/python-silver.json`, image: `${IMAGE_ROOT}/python-silver.png` },
    gold:   { uri: `${METADATA_ROOT}/python-gold.json`,   image: `${IMAGE_ROOT}/python-gold.png` },
  },
  "python developer": {
    bronze: { uri: `${METADATA_ROOT}/python-bronze.json`, image: `${IMAGE_ROOT}/python-bronze.png` },
    silver: { uri: `${METADATA_ROOT}/python-silver.json`, image: `${IMAGE_ROOT}/python-silver.png` },
    gold:   { uri: `${METADATA_ROOT}/python-gold.json`,   image: `${IMAGE_ROOT}/python-gold.png` },
  },
  content: {
    bronze: { uri: `${METADATA_ROOT}/content-writing-bronze.json`, image: `${IMAGE_ROOT}/content-writing-bronze.png` },
    silver: { uri: `${METADATA_ROOT}/content-writing-silver.json`, image: `${IMAGE_ROOT}/content-writing-silver.png` },
    gold:   { uri: `${METADATA_ROOT}/content-writing-gold.json`,   image: `${IMAGE_ROOT}/content-writing-gold.png` },
  },
  "content writing": {
    bronze: { uri: `${METADATA_ROOT}/content-writing-bronze.json`, image: `${IMAGE_ROOT}/content-writing-bronze.png` },
    silver: { uri: `${METADATA_ROOT}/content-writing-silver.json`, image: `${IMAGE_ROOT}/content-writing-silver.png` },
    gold:   { uri: `${METADATA_ROOT}/content-writing-gold.json`,   image: `${IMAGE_ROOT}/content-writing-gold.png` },
  },
  "content writer": {
    bronze: { uri: `${METADATA_ROOT}/content-writing-bronze.json`, image: `${IMAGE_ROOT}/content-writing-bronze.png` },
    silver: { uri: `${METADATA_ROOT}/content-writing-silver.json`, image: `${IMAGE_ROOT}/content-writing-silver.png` },
    gold:   { uri: `${METADATA_ROOT}/content-writing-gold.json`,   image: `${IMAGE_ROOT}/content-writing-gold.png` },
  },
  "web 3": {
    bronze: { uri: `${METADATA_ROOT}/web3-bronze.json`, image: `${IMAGE_ROOT}/web3-bronze.png` },
    silver: { uri: `${METADATA_ROOT}/web3-silver.json`, image: `${IMAGE_ROOT}/web3-silver.png` },
    gold:   { uri: `${METADATA_ROOT}/web3-gold.json`,   image: `${IMAGE_ROOT}/web3-gold.png` },
  },
  web3: {
    bronze: { uri: `${METADATA_ROOT}/web3-bronze.json`, image: `${IMAGE_ROOT}/web3-bronze.png` },
    silver: { uri: `${METADATA_ROOT}/web3-silver.json`, image: `${IMAGE_ROOT}/web3-silver.png` },
    gold:   { uri: `${METADATA_ROOT}/web3-gold.json`,   image: `${IMAGE_ROOT}/web3-gold.png` },
  },
  "web3 developer": {
    bronze: { uri: `${METADATA_ROOT}/web3-bronze.json`, image: `${IMAGE_ROOT}/web3-bronze.png` },
    silver: { uri: `${METADATA_ROOT}/web3-silver.json`, image: `${IMAGE_ROOT}/web3-silver.png` },
    gold:   { uri: `${METADATA_ROOT}/web3-gold.json`,   image: `${IMAGE_ROOT}/web3-gold.png` },
  },
};

function getTier(score: number): "bronze" | "silver" | "gold" | null {
  if (score >= 9 && score <= 10) return "gold";
  if (score >= 7 && score < 9)   return "silver";
  if (score >= 1 && score < 7)   return "bronze";
  return null;
}

const TIER_STYLE = {
  gold:   { ring: "ring-yellow-400/40", glow: "shadow-yellow-400/20", label: "text-yellow-300", badge: "bg-yellow-400/10 border-yellow-400/30 text-yellow-300" },
  silver: { ring: "ring-slate-400/40",  glow: "shadow-slate-400/20",  label: "text-slate-300",  badge: "bg-slate-400/10 border-slate-400/30 text-slate-300" },
  bronze: { ring: "ring-amber-700/40",  glow: "shadow-amber-700/20",  label: "text-amber-600",  badge: "bg-amber-700/10 border-amber-700/30 text-amber-600" },
};

interface SkillScore {
  user_id: string;
  session_id: string;
  skill: string;
  final_score: number;
  answered_questions: number;
  total_questions: number;
  saved_at: string;
}

type Stage = "idle" | "fetching" | "no_nft" | "minting" | "storing" | "minted" | "mint_error" | "fetch_error";

export default function Interview() {
  const wallet = useWallet();
  const anchorWallet = useAnchorWallet();
  const { publicKey, connected } = wallet;
  const session_id = useMemo(() => crypto.randomUUID(), []);

  const [stage, setStage]         = useState<Stage>("idle");
  const [scoreData, setScoreData] = useState<SkillScore | null>(null);
  const [fetchError, setFetchError] = useState("");
  const [mintError, setMintError] = useState("");
  const [mintTx, setMintTx]       = useState("");

  const tier = scoreData ? getTier(scoreData.final_score) : null;
  const nftAsset = tier && scoreData ? NFT_MAP[scoreData.skill.toLowerCase()]?.[tier] : null;

  // ── Step 1: fetch score ──────────────────────────────────────────────────────
  const handleInterviewCompleted = async () => {
    if (!publicKey) return;
    setStage("fetching");
    setScoreData(null);
    setFetchError("");
    setMintError("");
    setMintTx("");

    const user_id = publicKey.toBase58();
    const url = `https://cognivance-production.up.railway.app/skill_score/${user_id}/${session_id}`;
    let data: SkillScore | null = null;

    try {
      const res = await fetch(url);
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const json = await res.json();
        if (!res.ok) {
          setFetchError(json?.error ?? `HTTP ${res.status}`);
          setStage("fetch_error");
          return;
        }
        data = json as SkillScore;
        setScoreData(data);
      } else {
        const text = await res.text();
        setFetchError(`HTTP ${res.status} — ${text.slice(0, 120)}`);
        setStage("fetch_error");
        return;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setFetchError(message);
      setStage("fetch_error");
      return;
    }

    const earnedTier = getTier(data.final_score);
    if (!earnedTier) {
      // No NFT but still store session on-chain
      await storeOnChain(data);
      setStage("no_nft");
      return;
    }

    await mintNft(data, earnedTier);
  };

  // ── Step 2: store session on-chain ───────────────────────────────────────────
  const storeOnChain = async (score: SkillScore) => {
    if (!anchorWallet || !publicKey) return;
    try {
      setStage("storing");
      const connection = new Connection(RPC, "confirmed");
      const provider = new AnchorProvider(connection, anchorWallet, { commitment: "confirmed" });
      const program = new Program(IDL as any, provider);

      // Seeds have a 32-byte max — UUID is 36 chars so we strip the dashes (32 chars)
      const seedId = session_id.replace(/-/g, ""); // 32 hex chars exactly
      const [interviewPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("verify"), publicKey.toBuffer(), Buffer.from(seedId)],
        PROGRAM_ID
      );

      await program.methods
        .initSession(seedId, score.skill, new BN(Math.round(score.final_score)))
        .accounts({
          interviewPda,
          student: publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();

      console.log("[Chain] Session stored on-chain:", session_id);
    } catch (err) {
      // Non-fatal — just log it
      console.warn("[Chain] Failed to store session:", err);
    }
  };

  // ── Step 3: mint NFT then store on-chain ─────────────────────────────────────
  const mintNft = async (score: SkillScore, earnedTier: "bronze" | "silver" | "gold") => {
    const asset = NFT_MAP[score.skill.toLowerCase()]?.[earnedTier];
    if (!asset) { setStage("mint_error"); setMintError("Metadata not found for this skill."); return; }

    setStage("minting");

    try {
      const umi = createUmi(RPC)
        .use(mplTokenMetadata())
        .use(walletAdapterIdentity(wallet));

      const mint = generateSigner(umi);
      const nftName = `${score.skill} — ${earnedTier.charAt(0).toUpperCase() + earnedTier.slice(1)}`;

      const { signature } = await createNft(umi, {
        mint,
        name: nftName,
        symbol: "CVANCE",
        uri: asset.uri,
        sellerFeeBasisPoints: percentAmount(0),
        isMutable: false,
      }).sendAndConfirm(umi);

      setMintTx(Buffer.from(signature).toString("base64"));

      // Store session on-chain after successful mint
      await storeOnChain(score);

      setStage("minted");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setMintError(message);
      setStage("mint_error");
    }
  };

  const reset = () => {
    setStage("idle");
    setScoreData(null);
    setFetchError("");
    setMintError("");
    setMintTx("");
  };

  return (
    <div className="min-h-screen bg-[#0e0e10] flex flex-col font-mono">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-white/40 tracking-widest uppercase">Live Session</span>
        </div>
        <div className="flex items-center gap-3">
          {connected && publicKey ? (
            <span className="text-xs text-white/30 bg-white/5 border border-white/10 rounded px-3 py-1">
              {publicKey.toBase58().slice(0, 4)}…{publicKey.toBase58().slice(-4)}
            </span>
          ) : (
            <span className="text-xs text-amber-400/70 bg-amber-400/10 border border-amber-400/20 rounded px-3 py-1">
              Wallet not connected
            </span>
          )}
          <span className="text-xs text-white/20 hidden sm:block">{session_id.slice(0, 8)}</span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col p-4 sm:p-6 gap-4">
        {!connected ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-sm text-white/30">Connect your wallet to begin</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs text-white/20">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Secure · Encrypted · Private</span>
            </div>

            <div className="flex-1 rounded-lg overflow-hidden border border-white/10 bg-white/5 relative">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent" />
              <iframe
                src={`https://cognivance-production.up.railway.app?user_id=${publicKey?.toBase58()}&session_id=${session_id}`}
                className="w-full h-full min-h-[70vh]"
                allow="microphone; camera"
                title="Cognivance Interview"
              />
            </div>

            {/* Interview Completed Button */}
            <div className="flex justify-end pt-1">
              <button
                onClick={handleInterviewCompleted}
                disabled={stage === "fetching" || stage === "minting" || stage === "storing"}
                className="flex items-center gap-2 px-5 py-2.5 rounded-md text-sm
                           bg-emerald-500/10 border border-emerald-500/30 text-emerald-400
                           hover:bg-emerald-500/20 hover:border-emerald-500/50
                           disabled:opacity-40 disabled:cursor-not-allowed
                           transition-all duration-150"
              >
                {stage === "fetching" ? (
                  <><Spinner /> Fetching score…</>
                ) : stage === "minting" ? (
                  <><Spinner /> Minting NFT…</>
                ) : stage === "storing" ? (
                  <><Spinner /> Storing on-chain…</>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Interview Completed
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── No NFT overlay ── */}
      {stage === "no_nft" && scoreData && (
        <Overlay>
          <div className="text-center">
            <div className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-sm text-white/60 mb-1">Your score is too low for an NFT</p>
            <p className="text-xs text-white/25 mb-1">
              {scoreData.skill} · Score: <span className="text-white/40">{scoreData.final_score}</span>
            </p>
            <p className="text-xs text-white/20 mb-6">Minimum score of 4 required to earn an NFT.</p>
            <CloseBtn onClick={reset} />
          </div>
        </Overlay>
      )}

      {/* ── Minted overlay ── */}
      {stage === "minted" && scoreData && tier && nftAsset && (
        <Overlay>
          <div className="text-center">
            <div className={`w-32 h-32 mx-auto mb-4 rounded-xl overflow-hidden ring-2 shadow-lg ${TIER_STYLE[tier].ring} ${TIER_STYLE[tier].glow}`}>
              <img src={nftAsset.image} alt={`${tier} NFT`} className="w-full h-full object-cover" />
            </div>
            <span className={`inline-block text-[10px] uppercase tracking-widest font-semibold px-3 py-1 rounded-full border mb-3 ${TIER_STYLE[tier].badge}`}>
              {tier}
            </span>
            <p className="text-sm text-white/70 mb-1">{scoreData.skill}</p>
            <p className="text-xs text-white/30 mb-1">Score: {scoreData.final_score} / {scoreData.total_questions}</p>
            <p className="text-[11px] text-emerald-400 mb-1">✓ NFT minted to your wallet</p>
            <p className="text-[11px] text-emerald-400/60 mb-5">✓ Session stored on-chain</p>
            {mintTx && (
              <p className="text-[10px] text-white/15 break-all mb-4">{mintTx.slice(0, 40)}…</p>
            )}
            <CloseBtn onClick={reset} />
          </div>
        </Overlay>
      )}

      {/* ── Error overlays ── */}
      {(stage === "fetch_error" || stage === "mint_error") && (
        <Overlay>
          <div className="text-center">
            <div className="w-14 h-14 rounded-full border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="w-2 h-2 rounded-full bg-red-400" />
            </div>
            <p className="text-sm text-white/60 mb-2">
              {stage === "fetch_error" ? "Could not fetch score" : "Minting failed"}
            </p>
            <p className="text-[11px] text-white/25 mb-6 break-all">
              {stage === "fetch_error" ? fetchError : mintError}
            </p>
            <CloseBtn onClick={reset} />
          </div>
        </Overlay>
      )}

      <footer className="px-6 py-3 border-t border-white/5 flex items-center justify-between">
        <span className="text-[10px] text-white/15 tracking-widest uppercase">Cognivance</span>
        <span className="text-[10px] text-white/15">Powered by Solana</span>
      </footer>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-xs rounded-xl border border-white/10 bg-[#141416] p-6 shadow-2xl">
        {children}
      </div>
    </div>
  );
}

function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full py-2 rounded-md text-xs text-white/40 border border-white/10
                 hover:bg-white/5 hover:text-white/60 transition-all duration-150"
    >
      Close
    </button>
  );
}
