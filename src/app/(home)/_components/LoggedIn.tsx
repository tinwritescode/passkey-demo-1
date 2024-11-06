"use client";
import { startRegistration } from "@simplewebauthn/browser";
import { useEffect } from "react";
import toast from "react-hot-toast";
import { z } from "zod";
import { api, trpcClient } from "../../../trpc/react";
import { useAccessTokenStore, useAuthStore } from "../../store/useAuthStore";
import { SetupPasskey } from "./SetupPasskey";

export const LoggedIn = () => {
  const { logout, isLoggedIn } = useAuthStore();
  const { userId } = useAccessTokenStore();
  const { mutate: deleteAccount } = api.auth.deleteAccount.useMutation({
    onSuccess: async () => {
      await logout();
    },
  });

  const registerPasskey = async () => {
    toast.success("Registration triggered");
    const authOptions =
      await trpcClient.auth.passkey.generateRegistrationOptions.mutate();

    const webAuthnResponse = await startRegistration({
      optionsJSON: authOptions,
    });

    if (!webAuthnResponse) {
      return;
    }

    const verification =
      await trpcClient.auth.passkey.verifyRegistration.mutate({
        response: webAuthnResponse,
      });

    if (!verification.verified) {
      toast.error("Passkey registration failed");
      return;
    }

    toast.success("Passkey registered");
  };

  useEffect(() => {
    const event = async (event: MessageEvent) => {
      const data = z
        .object({
          type: z.enum(["TRIGGER_REGISTRATION"]),
          value: z.string(),
        })
        .safeParse(event.data);

      // we don't use the value for now, just for testing that it should be passed by the parent

      if (!data.success) {
        return;
      }

      console.log("event", event);

      if (data.data.type === "TRIGGER_REGISTRATION") {
        console.log("TRIGGER_REGISTRATION");

        if (!isLoggedIn) {
          toast.error("You must be logged in to register a passkey");
          return;
        }

        await registerPasskey();
      } else {
        console.log("unknown event", event);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    window.addEventListener("message", event);

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      window.removeEventListener("message", event);
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
      <div className="w-full max-w-2xl rounded-lg bg-white p-8 text-center shadow-md">
        <h1 className="mb-4 text-2xl font-bold">Partner&apos;s dapp</h1>
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
