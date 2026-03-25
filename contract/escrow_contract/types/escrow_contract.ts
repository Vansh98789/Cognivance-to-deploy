/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/escrow_contract.json`.
 */
export type EscrowContract = {
  "address": "8KERZnKwKuPYr4JXS6oPXqJHUjLmngniFRB22Q6XZHij",
  "metadata": {
    "name": "escrowContract",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "acceptJob",
      "discriminator": [
        43,
        201,
        124,
        1,
        19,
        189,
        96,
        10
      ],
      "accounts": [
        {
          "name": "escrowPda",
          "writable": true
        },
        {
          "name": "candidate",
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "canRelease",
      "discriminator": [
        126,
        225,
        213,
        238,
        107,
        233,
        169,
        39
      ],
      "accounts": [
        {
          "name": "escrowPda",
          "writable": true
        },
        {
          "name": "recruiter",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "cancelled",
      "discriminator": [
        112,
        114,
        77,
        217,
        132,
        226,
        69,
        75
      ],
      "accounts": [
        {
          "name": "escrowPda",
          "writable": true
        },
        {
          "name": "recruiter",
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "initEscrow",
      "discriminator": [
        70,
        46,
        40,
        23,
        6,
        11,
        81,
        139
      ],
      "accounts": [
        {
          "name": "recruiterState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  99,
                  114,
                  117,
                  105,
                  116,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "recruiter"
              }
            ]
          }
        },
        {
          "name": "escrowPda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "recruiter"
              },
              {
                "kind": "account",
                "path": "recruiter_state.job_count",
                "account": "recruiterState"
              }
            ]
          }
        },
        {
          "name": "recruiter",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "release",
      "discriminator": [
        253,
        249,
        15,
        206,
        28,
        127,
        193,
        241
      ],
      "accounts": [
        {
          "name": "escrowPda",
          "writable": true
        },
        {
          "name": "candidate",
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "escrowPda",
      "discriminator": [
        168,
        217,
        30,
        14,
        248,
        197,
        118,
        128
      ]
    },
    {
      "name": "recruiterState",
      "discriminator": [
        181,
        243,
        39,
        185,
        65,
        11,
        85,
        170
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "closedError",
      "msg": "Not open for further registration"
    },
    {
      "code": 6001,
      "name": "notAuthenticate",
      "msg": "You are not the recruiter"
    },
    {
      "code": 6002,
      "name": "noCandidateYet",
      "msg": "Candidate must be set first"
    },
    {
      "code": 6003,
      "name": "notApproved",
      "msg": "Recruiter has not approved release"
    },
    {
      "code": 6004,
      "name": "invalidCandidate",
      "msg": "Invalid candidate"
    }
  ],
  "types": [
    {
      "name": "escrowPda",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "recruiter",
            "type": "pubkey"
          },
          {
            "name": "candidate",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "escrowStatus"
              }
            }
          },
          {
            "name": "jobId",
            "type": "u64"
          },
          {
            "name": "canOpen",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "escrowStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "open"
          },
          {
            "name": "inProgress"
          },
          {
            "name": "completed"
          },
          {
            "name": "cancelled"
          }
        ]
      }
    },
    {
      "name": "recruiterState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "recuiter",
            "type": "pubkey"
          },
          {
            "name": "jobCount",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
