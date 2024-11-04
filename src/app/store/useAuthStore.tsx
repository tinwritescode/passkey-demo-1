"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "~/trpc/react";

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
      onSuccess: (data) => {
        setAccessToken(data.accessToken);
        setUserId(data.user.userId);

        void utils.invalidate();
      },
    });

  const { mutate: loginWithEmail, isPending: loginWithEmailPending } =
    api.auth.email.login.useMutation({
      onSuccess: (data) => {
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
