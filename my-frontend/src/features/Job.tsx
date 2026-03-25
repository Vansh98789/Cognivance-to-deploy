import { useState } from "react";
import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import idl from "../../../contract/escrow_contract/idl/escrow_contract.json";
import { useWallet } from "@solana/wallet-adapter-react";
import axios from "axios";

const programId = new PublicKey("8KERZnKwKuPYr4JXS6oPXqJHUjLmngniFRB22Q6XZHij");
const network   = "https://api.devnet.solana.com";

interface JobOption {
  value: string;
  label: string;
  rate:  number;
}

function u64ToLeBuffer(num: number): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(num));
  return buf;
}

export default function JobFormCheckbox() {
  const jobOptions: JobOption[] = [
    { value: "gold-frontend",   label: "Sr Frontend Developer",      rate: 2   },
    { value: "silver-frontend", label: "Mid Lvl Frontend Developer",  rate: 1   },
    { value: "bronze-frontend", label: "Jr Frontend Developer",       rate: 0.5 },
    { value: "gold-backend",    label: "Sr Backend Developer",        rate: 2   },
    { value: "silver-backend",  label: "Mid Lvl Backend Developer",   rate: 1   },
    { value: "bronze-backend",  label: "Jr Backend Developer",        rate: 0.5 },
    { value: "gold-web3",       label: "Sr Web3 Developer",           rate: 2   },
    { value: "silver-web3",     label: "Mid Lvl Web3 Developer",      rate: 1   },
    { value: "bronze-web3",     label: "Jr Web3 Developer",           rate: 0.5 },
    { value: "gold-python",     label: "Sr Python Developer",         rate: 2   },
    { value: "silver-python",   label: "Mid Lvl Python Developer",    rate: 1   },
    { value: "bronze-python",   label: "Jr Python Developer",         rate: 0.5 },
    { value: "gold-content",    label: "Sr Content Writer",           rate: 2   },
    { value: "silver-content",  label: "Mid Lvl Content Writer",      rate: 1   },
    { value: "bronze-content",  label: "Jr Content Writer",           rate: 0.5 },
  ];

  const [selectedJobs,   setSelectedJobs]   = useState<string[]>([]);
  const [companyName,    setCompanyName]     = useState("");
  const [roleName,       setRoleName]        = useState("");
  const [jobDescription, setJobDescription]  = useState("");
  const [isSubmitting,   setIsSubmitting]    = useState(false);
  const [errorMsg,       setErrorMsg]        = useState<string | null>(null);
  const [successMsg,     setSuccessMsg]      = useState<string | null>(null);

  const { publicKey, signAllTransactions, signTransaction } = useWallet();

  const getProvider = () => {
    if (!publicKey || !signTransaction) throw new Error("Wallet not connected");
    const connection = new Connection(network, "confirmed");
    return new anchor.AnchorProvider(
      connection,
      {
        publicKey,
        signTransaction,
        signAllTransactions: signAllTransactions ?? (async (txs) => txs),
      } as anchor.Wallet,
      { commitment: "confirmed" }
    );
  };

  const toggleJob = (value: string) => {
    setSelectedJobs((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const totalAmount = selectedJobs.reduce((sum, val) => {
    const job = jobOptions.find((j) => j.value === val);
    return sum + (job ? job.rate : 0);
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!publicKey || !signTransaction) {
      setErrorMsg("Please connect your wallet first.");
      return;
    }
    if (!selectedJobs.length || !companyName || !roleName || !jobDescription) {
      setErrorMsg("Please fill in all fields and select at least one role.");
      return;
    }

    setIsSubmitting(true);

    try {
      const provider   = getProvider();
      const program    = new anchor.Program(idl as anchor.Idl, provider);
      const connection = new Connection(network, "confirmed");

      const [recruiterStatePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("recruiter"), publicKey.toBuffer()],
        programId
      );

      const recruiterStateAccount = await (program.account as any)
        .recruiterState
        .fetchNullable(recruiterStatePda);

      const jobCount: number = recruiterStateAccount
        ? (recruiterStateAccount.jobCount as anchor.BN).toNumber()
        : 0;

      const [escrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), publicKey.toBuffer(), u64ToLeBuffer(jobCount)],
        programId
      );

      console.log("recruiterStatePda :", recruiterStatePda.toBase58());
      console.log("escrowPda         :", escrowPda.toBase58());
      console.log("jobCount          :", jobCount);

      const amountInLamports = new anchor.BN(totalAmount * LAMPORTS_PER_SOL);

      const txSignature = await program.methods
        .initEscrow(amountInLamports)
        .accountsStrict({
          recruiterState: recruiterStatePda,
          escrowPda:      escrowPda,
          recruiter:      publicKey,
          systemProgram:  anchor.web3.SystemProgram.programId,
        })
        .rpc();

      await connection.confirmTransaction(txSignature, "confirmed");
      console.log("TX confirmed:", txSignature);

      // ── Store job details + selected_roles in DB ───────────────────────────
      await axios.post("https://cognivance-backend.vercel.app/jobs", {
        recruiter_pubkey: publicKey.toBase58(),
        company_name:     companyName,
        role_name:        roleName,
        job_description:  jobDescription,
        amount:           totalAmount * LAMPORTS_PER_SOL,
        tx_signature:     txSignature,
        selected_roles:   selectedJobs,   // ← stores ["gold-frontend", "silver-backend", ...]
      });

      setSuccessMsg("Job escrow created successfully!");
      setSelectedJobs([]);
      setCompanyName("");
      setRoleName("");
      setJobDescription("");
    } catch (err: any) {
      console.error("Escrow creation error:", err);
      const logs: string[] | undefined = err?.logs ?? err?.transactionLogs;
      if (logs?.length) console.error("Program logs:\n", logs.join("\n"));
      setErrorMsg(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto mt-10 p-6 bg-white shadow-lg rounded-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">Create Job Escrow</h2>

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md text-sm">
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">Company Name</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Enter company name"
            required
            className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Role</label>
          <input
            type="text"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            placeholder="Enter role name"
            required
            className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Job Description</label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Enter job description"
            required
            className="w-full border border-gray-300 rounded-md p-2 h-24 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div>
          <label className="block mb-2 font-medium">Select Roles</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {jobOptions.map((job) => (
              <div
                key={job.value}
                onClick={() => toggleJob(job.value)}
                className={`p-2 border rounded-md cursor-pointer transition-colors ${
                  selectedJobs.includes(job.value)
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-white text-gray-800 hover:bg-blue-100"
                }`}
              >
                {job.label} — {job.rate} SOL
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-100 p-3 rounded-md">
          <p className="font-medium">
            Selected Roles:{" "}
            {selectedJobs
              .map((val) => jobOptions.find((j) => j.value === val)?.label)
              .join(", ") || "None"}
          </p>
          <p className="font-semibold mt-1">Total Amount: {totalAmount} SOL</p>
          <p className="text-xs text-gray-500 mt-1">
            ≈ {totalAmount} SOL will be locked in escrow
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Creating Escrow..." : "Create Escrow"}
        </button>
      </form>
    </div>
  );
}
