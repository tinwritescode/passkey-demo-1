import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { bootStrappingRouter } from "./bootstrapping";
import { emailRouter } from "./email";
import { passkeyRouter } from "./passkey";

export const authRouter = createTRPCRouter({
  bootstrapping: bootStrappingRouter,
  email: emailRouter,
  passkey: passkeyRouter,

  getSession: protectedProcedure.query(async ({ ctx }) => {
    return ctx.user;
  }),

  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.user) {
      throw new Error("User not found");
    }

    await ctx.db.user.delete({
      where: { id: ctx.user.userId },
    });
  }),
});
