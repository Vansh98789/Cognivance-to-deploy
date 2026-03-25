/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/verify_contract.json`.
 */
export type VerifyContract = {
  "address": "BXttSfoCqPxcFziWpzd4jqy8LSmj8axcyBcgfNcBxLPp",
  "metadata": {
    "name": "verifyContract",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "initSession",
      "discriminator": [
        121,
        206,
        80,
        106,
        231,
        194,
        225,
        248
      ],
      "accounts": [
        {
          "name": "interviewPda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  101,
                  114,
                  105,
                  102,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "student"
              },
              {
                "kind": "arg",
                "path": "sessionId"
              }
            ]
          }
        },
        {
          "name": "student",
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
          "name": "sessionId",
          "type": "string"
        },
        {
          "name": "subject",
          "type": "string"
        },
        {
          "name": "score",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "interviewSession",
      "discriminator": [
        0,
        142,
        65,
        218,
        111,
        130,
        58,
        39
      ]
    }
  ],
  "types": [
    {
      "name": "interviewSession",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "student",
            "type": "pubkey"
          },
          {
            "name": "sessionId",
            "type": "string"
          },
          {
            "name": "subject",
            "type": "string"
          },
          {
            "name": "score",
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
