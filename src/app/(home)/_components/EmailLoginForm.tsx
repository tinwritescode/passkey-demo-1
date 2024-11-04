"use client";
import { startAuthentication } from "@simplewebauthn/browser";
import { useEffect, useState } from "react";
import { api, trpcClient } from "~/trpc/react";
import { useAccessTokenStore, useAuthStore } from "../../store/useAuthStore";
import { z } from "zod";

export const EmailLoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { setAccessToken, userId, setUserId } = useAccessTokenStore();
  const { loginWithEmail, loginWithEmailPending } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    loginWithEmail(
      { email, password },
      {
        onError: (error) => {
          setError(error.message);
        },
      },
    );
  };

  useEffect(() => {
    const event = async (event: MessageEvent) => {
      console.log("event", event);

      const data = z
        .object({ type: z.literal("TRIGGER_AUTHN"), value: z.string() })
        .safeParse(event.data);

      // we don't use the value for now, just for testing that it should be passed by the parent

      if (!data.success) {
        return;
      }

      if (data.data.type === "TRIGGER_AUTHN") {
        console.log("TRIGGER_AUTHN", data.data.value);

        const userId = useAccessTokenStore.getState().userId;
        if (!userId) {
          return;
        }

        const authOptions =
          await trpcClient.auth.passkey.generateAuthenticationOptions.mutate({
            userId,
          });

        const webAuthnResponse = await startAuthentication({
          optionsJSON: authOptions,
        });

        if (!webAuthnResponse) {
          return;
        }

        const verification =
          await trpcClient.auth.passkey.verifyAuthentication.mutate({
            userId,
            response: webAuthnResponse,
          });

        if (verification.verified) {
          setAccessToken(verification.accessToken);
        }
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    window.addEventListener("message", event);

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      window.removeEventListener("message", event);
    };
  }, []);

  useEffect(() => {
    void (async () => {
      if (
        typeof window.PublicKeyCredential !== "undefined" &&
        typeof window.PublicKeyCredential.isConditionalMediationAvailable ===
          "function"
      ) {
        const available =
          await PublicKeyCredential.isConditionalMediationAvailable();

        if (available) {
          try {
            const userId = useAccessTokenStore.getState().userId;

            if (!userId) {
              return;
            }

            // Retrieve authentication options for `navigator.credentials.get()`
            // from your server.
            // const authOptions = await getAuthenticationOptions();
            const authOptions =
              await trpcClient.auth.passkey.generateAuthenticationOptions.mutate(
                {
                  userId,
                },
              );

            const webAuthnResponse = await startAuthentication({
              optionsJSON: {
                ...authOptions,
                challenge: authOptions.challenge,
                userVerification: "preferred",
                allowCredentials: authOptions.allowCredentials,
              },
              useBrowserAutofill: true,
            });

            // Send the response to your server for verification and
            // authenticate the user if the response is valid.
            if (!webAuthnResponse) {
              throw new Error("No response from passkey");
            }

            const verification =
              await trpcClient.auth.passkey.verifyAuthentication.mutate({
                userId,
                response: webAuthnResponse,
              });

            if (verification.verified) {
              setAccessToken(verification.accessToken);
            }
          } catch (err) {
            // ignore: Authentication ceremony was sent an abort signal
            console.error("Error with conditional UI:", err);

            if (
              err instanceof Error &&
              err.message === "Authentication ceremony was sent an abort signal"
            ) {
              return;
            }

            setError(
              err instanceof Error
                ? err.message
                : "Failed to login with passkey",
            );
          }
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-500">
          {error}
        </div>
      )}
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700"
        >
          Email
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          required
          autoComplete="email webauthn"
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700"
        >
          Password
        </label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          required
        />
      </div>
      <button
        type="submit"
        disabled={loginWithEmailPending}
        className="w-full rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:bg-blue-300"
      >
        {loginWithEmailPending ? "Logging in..." : "Login"}
      </button>

      {userId !== null && (
        <>
          <button
            type="button"
            className="w-full rounded-md border border-blue-500 bg-white px-4 py-2 text-blue-500 hover:bg-blue-50 disabled:bg-blue-50 disabled:text-blue-300"
            onClick={async () => {
              const userId = useAccessTokenStore.getState().userId;
              if (!userId) {
                return;
              }
              const authOptions =
                await trpcClient.auth.passkey.generateAuthenticationOptions.mutate(
                  {
                    userId,
                  },
                );

              const webAuthnResponse = await startAuthentication({
                optionsJSON: authOptions,
              });

              // login
              if (!webAuthnResponse) {
                return;
              }
              const verification =
                await trpcClient.auth.passkey.verifyAuthentication.mutate({
                  userId,
                  response: webAuthnResponse,
                });

              if (verification.verified) {
                setAccessToken(verification.accessToken);
              }
            }}
          >
            Choose passkey (userID: {userId})
          </button>

          {/* Remove user */}
          <button
            type="button"
            className="w-full rounded-md border border-red-500 bg-white px-4 py-2 text-red-500 hover:bg-red-50 disabled:bg-red-50 disabled:text-red-300"
            onClick={async () => {
              setUserId(null);
            }}
          >
            Remove userId
          </button>
        </>
      )}
    </form>
  );
};
