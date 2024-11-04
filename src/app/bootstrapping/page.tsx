"use client";

import { useState, useEffect } from "react";
import { trpcClient } from "~/trpc/react";

export default function Bootstrapping() {
  const [isPasskeyAvailable, setIsPasskeyAvailable] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [username, setUsername] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    // Check if passkeys are supported
    const checkPasskeySupport = async () => {
      if (
        typeof window.PublicKeyCredential !== "undefined" &&
        typeof window.PublicKeyCredential
          .isUserVerifyingPlatformAuthenticatorAvailable === "function"
      ) {
        const available =
          await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        setIsPasskeyAvailable(available);

        // Set up conditional UI for autofill if available
        if (
          typeof window.PublicKeyCredential.isConditionalMediationAvailable ===
          "function"
        ) {
          const conditionalSupport =
            await PublicKeyCredential.isConditionalMediationAvailable();

          if (conditionalSupport) {
            try {
              // Get authentication options from the API
              const authOptions =
                await trpcClient.auth.bootstrapping.getAuthenticationOptions.mutate(
                  {
                    username: "",
                  },
                );

              const webAuthnResponse = await navigator.credentials.get({
                mediation: "conditional",
                publicKey: {
                  challenge: authOptions.challenge,
                  timeout: authOptions.timeout,
                  userVerification:
                    authOptions.userVerification as UserVerificationRequirement,
                  rpId: authOptions.rpId,
                },
              });

              if (webAuthnResponse) {
                // Verify the authentication response
                await trpcClient.auth.bootstrapping.verifyAuthentication.mutate(
                  {
                    credential: webAuthnResponse,
                    username: "",
                  },
                );

                // Handle successful authentication
                // You might want to redirect or update UI state here
              }
            } catch (err) {
              console.error("Error with conditional UI:", err);
              setError("Failed to authenticate with passkey");
            }
          }
        }
      }
    };

    checkPasskeySupport();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const formData = new FormData(e.currentTarget);
      const username = formData.get("username") as string;

      // Get authentication options
      const authOptions =
        await trpcClient.auth.bootstrapping.getAuthenticationOptions.mutate({
          username,
        });

      // Create the credential request
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: authOptions.challenge,
          timeout: authOptions.timeout,
          userVerification:
            authOptions.userVerification as UserVerificationRequirement,
          rpId: authOptions.rpId,
        },
      });

      if (credential) {
        // Verify the authentication
        const result =
          await trpcClient.auth.bootstrapping.verifyAuthentication.mutate({
            credential,
            username,
          });

        if (result.success) {
          // Handle successful authentication
          // You might want to redirect or update UI state here
        }
      }
    } catch (error) {
      console.error("Authentication error:", error);
      setError("Failed to authenticate. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isPasskeyAvailable
              ? "Sign in with your passkey or username"
              : "Sign in with your username"}
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700"
            >
              Username or email
            </label>
            <div className="mt-1">
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username webauthn"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="Enter your username or email"
              />
            </div>
          </div>

          {!isPasskeyAvailable && (
            <div className="text-sm text-yellow-600">
              Passkeys are not supported on this device.
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400"
            >
              {isLoading ? "Signing in..." : "Next"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
