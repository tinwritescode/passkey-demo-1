import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "../../trpc";
import { emailRouter } from "./email";
import { passkeyRouter } from "./passkey";
import crypto from "crypto";
import { env } from "../../../../env";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";

const inMemoryDatabase = new Map<string, string>();

export const bootStrappingRouter = createTRPCRouter({
  getAuthenticationOptions: publicProcedure
    .input(z.object({ username: z.string() }))
    .mutation(async ({ input }) => {
      // Generate authentication options
      const challenge = crypto.getRandomValues(new Uint8Array(32));

      inMemoryDatabase.set(input.username, challenge.toString());

      return {
        challenge,
        timeout: 60000,
        userVerification: "preferred",
        rpId: env.NEXT_PUBLIC_RP_ID,
      };
    }),

  verifyAuthentication: publicProcedure
    .input(
      z.object({
        credential: z.any(), // You should define a proper type for the credential
        username: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      // Verify the authentication response
      // This is where you'd validate the signature and authenticate the user
      const challenge = inMemoryDatabase.get(input.username);

      if (!challenge) {
        throw new Error("Challenge not found");
      }

      const verified = await verifyAuthenticationResponse({
        response: input.credential.response,
        expectedChallenge: challenge,
        expectedOrigin: env.NEXT_PUBLIC_RP_ID,
        credential: input.credential,
        expectedRPID: env.NEXT_PUBLIC_RP_ID,
      });

      if (!verified) {
        throw new Error("Authentication failed");
      }

      return {
        success: true,
      };
    }),

  createPasskey: publicProcedure
    .input(
      z.object({
        username: z.string(),
        displayName: z.string(),
        userId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      // Generate a cryptographically random challenge
      const challenge = crypto.getRandomValues(new Uint8Array(32));

      // Create the authentication options following the passkeys.dev guide
      return {
        rp: {
          name: "Your App Name", // Replace with your app name
          id: env.NEXT_PUBLIC_RP_ID,
        },
        user: {
          id: Uint8Array.from(input.userId, (c) => c.charCodeAt(0)),
          name: input.username,
          displayName: input.displayName,
        },
        challenge,
        pubKeyCredParams: [
          {
            type: "public-key",
            alg: -7, // EC P256
          },
          {
            type: "public-key",
            alg: -257, // RSA
          },
        ],
        authenticatorSelection: {
          residentKey: "required",
          userVerification: "preferred",
        },
        extensions: {
          credProps: true,
        },
      };
    }),

  verifyPasskeyCreation: publicProcedure
    .input(
      z.object({
        credential: z.any(), // You should define a proper type for the credential response
        userId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      // Here you would:
      // 1. Verify the attestation response
      // 2. Store the credential ID and public key associated with the user
      // 3. Mark the user as having a passkey in your database
      return {
        success: true,
      };
    }),
});
