"use client";
import { useState } from "react";
import { useAuthStore } from "../../store/useAuthStore";

export const EmailRegisterForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { registerWithEmail, registerWithEmailPending } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    registerWithEmail(
      { email, password },
      {
        onError: (error) => {
          setError(error.message);
        },
      },
    );
  };

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
        disabled={registerWithEmailPending}
        className="w-full rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:bg-blue-300"
      >
        {registerWithEmailPending ? "Registering..." : "Register"}
      </button>
    </form>
  );
};
