"use client";

import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { EmailLoginForm, EmailRegisterForm, LoggedIn } from "./_components";

enum Tab {
  LOGIN = "login",
  REGISTER = "register",
}

export default function Home() {
  const { isLoggedIn, isPending } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>(Tab.LOGIN);

  if (isPending) {
    return <div>Loading...</div>;
  }

  if (isLoggedIn) {
    return <LoggedIn />;
  }

  const renderTabs = () => {
    return (
      <div className="mb-6 flex">
        <button
          className={`flex-1 border-b-2 pb-2 text-center ${
            activeTab === Tab.LOGIN
              ? "border-blue-500 text-blue-500"
              : "border-gray-200 text-gray-500"
          }`}
          onClick={() => setActiveTab(Tab.LOGIN)}
        >
          Login
        </button>
        <button
          className={`flex-1 border-b-2 pb-2 text-center ${
            activeTab === Tab.REGISTER
              ? "border-blue-500 text-blue-500"
              : "border-gray-200 text-gray-500"
          }`}
          onClick={() => setActiveTab(Tab.REGISTER)}
        >
          Register
        </button>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        {renderTabs()}
        {activeTab === Tab.LOGIN ? <EmailLoginForm /> : <EmailRegisterForm />}
      </div>
    </div>
  );
}
