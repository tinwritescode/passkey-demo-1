"use client";

import { api } from "~/trpc/react";

export default function PasskeyCreation() {
  const createPasskey = api.auth.bootstrapping.createPasskey.useMutation();
  const verifyPasskey =
    api.auth.bootstrapping.verifyPasskeyCreation.useMutation();

  const handleCreatePasskey = async () => {
    // First check if passkeys are supported
    if (!window.PublicKeyCredential) {
      console.error("Passkeys are not supported in this browser");
      return;
    }

    const supported =
      await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!supported) {
      console.error("User verifying platform authenticator is not available");
      return;
    }

    try {
      // Get creation options from server
      const options = await createPasskey.mutateAsync({
        username: "user@example.com",
        displayName: "User Name",
        userId: "unique-user-id",
      });

      // Create the passkey
      const credential = await navigator.credentials.create({
        publicKey: {
          ...options,
          challenge: new Uint8Array(options.challenge),
          pubKeyCredParams: options.pubKeyCredParams.map((param) => ({
            ...param,
            type: "public-key" as const,
          })),
          authenticatorSelection: {
            ...options.authenticatorSelection,
            residentKey: "required" as ResidentKeyRequirement,
            userVerification: "required" as UserVerificationRequirement,
          },
        },
      });

      // Verify the creation with the server
      if (credential) {
        await verifyPasskey.mutateAsync({
          credential,
          userId: "unique-user-id",
        });
      }
    } catch (error) {
      console.error("Error creating passkey:", error);
    }
  };

  return (
    <div>
      <h1>Create Passkey</h1>
      <button
        onClick={handleCreatePasskey}
        className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
      >
        Create Passkey
      </button>
    </div>
  );
}
