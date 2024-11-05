"use client";
import { startRegistration } from "@simplewebauthn/browser";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api, trpcClient } from "~/trpc/react";

export const useAccessTokenStore = create<{
  accessToken: string | null;
  setAccessToken: (accessToken: string | null) => void;
  userId: string | null;
  setUserId: (userId: string | null) => void;
}>()(
  persist(
    (set) => ({
      accessToken: null,
      setAccessToken: (accessToken) => set({ accessToken }),
      // user id from last login session, save here to help user login again with passkey
      userId: null,
      setUserId: (userId) => set({ userId }),
    }),
    {
      name: "auth",
    },
  ),
);

export const useAuthStore = () => {
  const { accessToken, setAccessToken, userId, setUserId } =
    useAccessTokenStore();
  const { data: session, isPending } = api.auth.getSession.useQuery(undefined, {
    enabled: !!accessToken,
    retry: 3,
  });
  const utils = api.useUtils();

  const { mutate: registerWithEmail, isPending: registerWithEmailPending } =
    api.auth.email.register.useMutation({
      onSuccess: async (data) => {
        setAccessToken(data.accessToken);
        setUserId(data.user.userId);

        // auto register passkey
        const authOptions =
          await trpcClient.auth.passkey.generateRegistrationOptions.mutate();

        console.log(authOptions);

        const webAuthnResponse = await startRegistration({
          optionsJSON: authOptions,
          useAutoRegister: true,
        });

        console.log(`webAuthnResponse`, webAuthnResponse);

        const verification =
          await trpcClient.auth.passkey.verifyRegistration.mutate({
            response: webAuthnResponse,
          });

        console.log(`verification`, verification);
        void utils.invalidate();
      },
    });

  const { mutate: loginWithEmail, isPending: loginWithEmailPending } =
    api.auth.email.login.useMutation({
      onSuccess: async (data) => {
        setAccessToken(data.accessToken);
        setUserId(data.user.userId);

        void utils.invalidate();
      },
    });

  const onLogout = async () => {
    setAccessToken(null);
    await utils.auth.getSession.reset();
    await utils.invalidate();
  };

  return {
    isLoggedIn: !!session?.userId && !!accessToken,
    isPending: isPending && !!accessToken,
    logout: onLogout,
    loginWithEmail,
    registerWithEmail,
    loginWithEmailPending,
    registerWithEmailPending,
  };
};
