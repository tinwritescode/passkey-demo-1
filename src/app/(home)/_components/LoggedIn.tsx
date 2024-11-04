"use client";
import { api } from "../../../trpc/react";
import { useAuthStore } from "../../store/useAuthStore";
import { SetupPasskey } from "./SetupPasskey";

export const LoggedIn = () => {
  const { logout } = useAuthStore();
  const { mutate: deleteAccount } = api.auth.deleteAccount.useMutation({
    onSuccess: () => {
      logout();
    },
  });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
      <div className="w-full max-w-2xl rounded-lg bg-white p-8 text-center shadow-md">
        <h1 className="mb-4 text-2xl font-bold">Partner's dapp</h1>
        <p className="mb-6 text-gray-600">You are successfully logged in.</p>

        <SetupPasskey />

        <button
          onClick={logout}
          className="rounded-md bg-red-500 px-4 py-2 text-white hover:bg-red-600"
        >
          Logout
        </button>

        {/* Delete account */}
        <button
          onClick={() => deleteAccount()}
          className="ml-3 inline-flex rounded-md bg-red-500 px-4 py-2 text-white hover:bg-red-600"
        >
          Delete account
        </button>
      </div>
    </div>
  );
};
