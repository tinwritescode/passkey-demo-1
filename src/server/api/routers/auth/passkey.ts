import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type GenerateAuthenticationOptionsOpts,
  type GenerateRegistrationOptionsOpts,
} from "@simplewebauthn/server";
import {
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type RegistrationResponseJSON,
  type WebAuthnCredential,
} from "@simplewebauthn/types";
import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { db } from "../../../db";
import jwtService from "../../services/jwt";
import redisService from "../../services/redis";
import { env } from "../../../../env";

// These would typically come from environment variables
const rpID = env.NEXT_PUBLIC_RP_ID;
const expectedOrigin = env.NEXT_PUBLIC_EXPECTED_ORIGIN;
const rpName = "Your App Name";

export const passkeyRouter = createTRPCRouter({
  generateRegistrationOptions: protectedProcedure.mutation(
    async ({ ctx: { user: ctxUser } }) => {
      if (!ctxUser) {
        throw new Error("User not found");
      }

      const user = await db.user.findUniqueOrThrow({
        where: {
          id: ctxUser.userId,
        },
        include: {
          Provider: {
            where: {
              type: "WEB_AUTHN_CREDENTIAL",
            },
            include: {
              WebAuthnCredential: true,
            },
          },
        },
      });

      const opts: GenerateRegistrationOptionsOpts = {
        rpName,
        rpID,
        userName: user.username,
        userDisplayName: user.username,
        timeout: 60000,
        attestationType: "none",
        excludeCredentials: user.Provider.map((cred) => {
          if (!cred.WebAuthnCredential?.id) {
            return null;
          }
          return {
            id: cred.WebAuthnCredential.id,
            type: "public-key",
            transports: cred.WebAuthnCredential
              .transports as AuthenticatorTransportFuture[],
          };
        }).filter((x): x is NonNullable<typeof x> => x !== null),
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: "preferred",
        },
        supportedAlgorithmIDs: [-7, -257],
      };

      const options = await generateRegistrationOptions(opts);

      // Store challenge in session/db
      await redisService.redis.set(
        `user:${ctxUser.userId}:currentChallenge`,
        options.challenge,
        "EX",
        60 * 30, // 30 minutes
      );

      return options;
    },
  ),

  verifyRegistration: protectedProcedure
    .input(
      z.object({
        response: z.custom<RegistrationResponseJSON>(),
      }),
    )
    .mutation(async ({ input, ctx: { user: ctxUser } }) => {
      if (!ctxUser) {
        throw new Error("User not found");
      }

      const currentChallenge = await redisService.redis.get(
        `user:${ctxUser.userId}:currentChallenge`,
      );

      if (!currentChallenge) {
        throw new Error("No challenge found for user");
      }

      try {
        const verification = await verifyRegistrationResponse({
          response: input.response,
          expectedChallenge: currentChallenge,
          expectedOrigin,
          expectedRPID: rpID,
          requireUserVerification: false,
        });

        if (verification.verified && verification.registrationInfo) {
          const { credential } = verification.registrationInfo;

          const newCredential: WebAuthnCredential = {
            id: credential.id,
            publicKey: credential.publicKey,
            counter: credential.counter,
            transports: input.response.response.transports,
          };

          await Promise.all([
            db.user.update({
              where: {
                id: ctxUser.userId,
              },
              data: {
                Provider: {
                  create: {
                    type: "WEB_AUTHN_CREDENTIAL",
                    WebAuthnCredential: {
                      create: {
                        counter: newCredential.counter,
                        id: newCredential.id,
                        publicKey: Buffer.from(newCredential.publicKey),
                        transports: newCredential.transports,
                      },
                    },
                  },
                },
              },
            }),
            redisService.redis.del(`user:${ctxUser.userId}:currentChallenge`),
          ]);
        }

        return { verified: verification.verified };
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : "Unknown error occurred",
        );
      }
    }),

  generateAuthenticationOptions: publicProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      const user = await db.user.findUniqueOrThrow({
        where: {
          id: input.userId,
        },
        include: {
          Provider: {
            where: {
              type: "WEB_AUTHN_CREDENTIAL",
            },
            include: {
              WebAuthnCredential: true,
            },
          },
        },
      });

      const opts: GenerateAuthenticationOptionsOpts = {
        timeout: 60000,
        allowCredentials: user.Provider.map((cred) => {
          if (!cred.WebAuthnCredential?.id) {
            return null;
          }

          return {
            id: cred.WebAuthnCredential.id,
            type: "public-key",
            transports: cred.WebAuthnCredential
              .transports as AuthenticatorTransportFuture[],
          };
        }).filter((x): x is NonNullable<typeof x> => x !== null),
        userVerification: "preferred",
        rpID,
      };

      const options = await generateAuthenticationOptions(opts);

      // Store challenge
      await redisService.redis.set(
        `user:${input.userId}:currentChallenge`,
        options.challenge,
        "EX",
        60, // 1 minute
      );

      return options;
    }),

  verifyAuthentication: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        response: z.custom<AuthenticationResponseJSON>(),
      }),
    )
    .mutation(async ({ input: { userId, response } }) => {
      const user = await db.user.findFirstOrThrow({
        where: {
          id: userId,
        },
        include: {
          Provider: {
            include: {
              WebAuthnCredential: true,
              EmailCredential: true,
            },
          },
        },
      });

      const currentChallenge = await redisService.redis.get(
        `user:${userId}:currentChallenge`,
      );

      if (!currentChallenge) {
        throw new Error("No challenge found for user");
      }

      const credential = user.Provider.find(
        (cred) => cred.WebAuthnCredential?.id === response.id,
      )?.WebAuthnCredential;

      if (!credential) {
        throw new Error("Authenticator is not registered with this site");
      }

      const email = user.Provider.find((cred) => cred.EmailCredential !== null)
        ?.EmailCredential?.email;

      if (!email) {
        throw new Error("Email not found");
      }

      try {
        const verification = await verifyAuthenticationResponse({
          response,
          expectedChallenge: currentChallenge,
          expectedOrigin,
          expectedRPID: rpID,
          credential: {
            id: credential.id,
            publicKey: credential.publicKey,
            counter: Number(credential.counter),
            transports: credential.transports as AuthenticatorTransportFuture[],
          },
          requireUserVerification: false,
        });

        if (verification.verified) {
          await db.webAuthnCredential.update({
            where: {
              id: credential.id,
            },
            data: {
              counter: verification.authenticationInfo.newCounter,
            },
          });
        }

        await redisService.redis.del(`user:${userId}:currentChallenge`);

        const accessToken = jwtService.createAccessToken({
          userId,
          email,
          username: user.username,
        });

        return {
          verified: verification.verified,
          accessToken,
        };
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : "Unknown error occurred",
        );
      }
    }),

  getAllUsers: publicProcedure.query(async () => {
    const users = await db.user.findMany();
    return users;
  }),

  // CRUD passkey
  getPasskey: protectedProcedure
    .input(z.object({ passkeyId: z.string() }))
    .query(async ({ input: { passkeyId } }) => {
      const passkey = await db.webAuthnCredential.findUniqueOrThrow({
        where: {
          id: passkeyId,
        },
      });
      return {
        ...passkey,
        publicKey: passkey.publicKey.toString("base64"),
      };
    }),

  getPasskeys: protectedProcedure.query(async ({ ctx: { user: ctxUser } }) => {
    if (!ctxUser) {
      throw new Error("User not found");
    }
    const passkeys = await db.webAuthnCredential.findMany({
      where: {
        Provider: {
          userId: ctxUser.userId,
          type: "WEB_AUTHN_CREDENTIAL",
        },
      },
    });

    return passkeys.map((passkey) => {
      return {
        ...passkey,
        publicKey: passkey.publicKey.toString("base64"),
      };
    });
  }),

  deletePasskey: protectedProcedure
    .input(z.object({ passkeyId: z.string() }))
    .mutation(async ({ input: { passkeyId } }) => {
      await db.webAuthnCredential.delete({ where: { id: passkeyId } });

      return { success: true };
    }),
});
