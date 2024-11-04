"use client";

import { startRegistration } from "@simplewebauthn/browser";
import { useState } from "react";
import { api } from "~/trpc/react";

export const SetupPasskey = () => {
  const [error, setError] = useState<string | null>(null);

  // Read - Get all passkeys
  const { data: passkeys, isLoading } = api.auth.passkey.getPasskeys.useQuery();
  const utils = api.useUtils();

  // Create - Register new passkey
  const { mutate: generateRegistration } =
    api.auth.passkey.generateRegistrationOptions.useMutation({
      onSuccess: async (options) => {
        try {
          const registrationResponse = await startRegistration({
            optionsJSON: options,
          });
          await verifyRegistration({
            response: registrationResponse,
          });
          setError(null);
          await utils.auth.passkey.getPasskeys.invalidate();
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Failed to register passkey",
          );
        }
      },
      onError: (err) => {
        setError(err.message);
      },
    });

  const { mutateAsync: verifyRegistration } =
    api.auth.passkey.verifyRegistration.useMutation({
      onError: (err) => {
        setError(err.message);
      },
    });

  // Delete passkey
  const { mutate: deletePasskey } = api.auth.passkey.deletePasskey.useMutation({
    onSuccess: () => {
      void utils.auth.passkey.getPasskeys.invalidate();
      setError(null);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  if (isLoading) {
    return <div className="flex justify-center p-4">Loading passkeys...</div>;
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Passkey Management</h2>
        <button
          onClick={() => generateRegistration()}
          className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          Register New Passkey
        </button>
      </div>

      {error && (
        <div className="rounded border border-red-400 bg-red-100 p-3 text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Your Passkeys</h3>
        {passkeys?.length === 0 ? (
          <p className="text-gray-500">No passkeys registered yet.</p>
        ) : (
          <div className="grid gap-4">
            {passkeys?.map((passkey) => (
              <div
                key={passkey.id}
                className="flex items-center justify-between rounded border p-4 shadow-sm"
              >
                <div>
                  <div className="font-medium">Passkey ID: {passkey.id}</div>
                  <div className="text-sm text-gray-500">
                    Created: {new Date(passkey.createdAt).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => deletePasskey({ passkeyId: passkey.id })}
                  className="rounded px-3 py-1 text-red-500 hover:bg-red-50"
                  aria-label="Delete passkey"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
