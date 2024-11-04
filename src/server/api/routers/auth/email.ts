import { z } from "zod";
import passwordHasherService from "../../services/hashing";
import jwtService from "../../services/jwt";
import { createTRPCRouter, publicProcedure } from "../../trpc";
import { Prisma } from "@prisma/client";

export const emailRouter = createTRPCRouter({
  login: publicProcedure
    .input(z.object({ email: z.string(), password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const emailCredential = await ctx.db.emailCredential.findUnique({
        where: {
          email: input.email,
        },
        include: {
          Provider: {
            include: {
              User: true,
            },
          },
        },
      });

      if (!emailCredential) {
        throw new Error("User not found");
      }

      const isPasswordValid = await passwordHasherService.compare(
        input.password,
        emailCredential.hashedPassword,
      );

      if (!isPasswordValid) {
        throw new Error("Invalid password");
      }

      const payload = {
        userId: emailCredential.Provider.User.id,
        email: emailCredential.email,
        username: emailCredential.Provider.User.username,
      };

      const accessToken = jwtService.createAccessToken(payload);

      return {
        success: true,
        accessToken,
        user: payload,
      };
    }),

  register: publicProcedure
    .input(z.object({ email: z.string(), password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const hashedPassword = await passwordHasherService.hash(input.password);

      // check if email is already in use

      const emailCredential = await ctx.db.emailCredential
        .create({
          data: {
            email: input.email,
            hashedPassword,
            Provider: {
              create: {
                type: "EMAIL",
                User: {
                  create: {
                    username: input.email,
                  },
                },
              },
            },
          },
          include: {
            Provider: {
              include: {
                User: true,
              },
            },
          },
        })
        .catch((error) => {
          // check if email is already in use
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
          ) {
            throw new Error("Email already in use");
          }
          throw error;
        });

      const payload = {
        userId: emailCredential.Provider.User.id,
        email: emailCredential.email,
        username: emailCredential.Provider.User.username,
      };

      const accessToken = jwtService.createAccessToken(payload);

      return {
        success: true,
        accessToken,
        user: payload,
      };
    }),
});
