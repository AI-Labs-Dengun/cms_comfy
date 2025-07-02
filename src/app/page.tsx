"use client";

import React, { useState } from "react";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // TODO: Implement authentication
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md flex flex-col items-center"
      >
        <div className="mb-8 flex flex-col items-center">
          <img src="/cms-logo.png" alt="Comfy Content Hub Logo" className="mb-2 w-28 h-auto mx-auto" />
        </div>
        <div className="mb-6 text-center text-sm text-gray-900">Inicie sessão para começar</div>
        <div className="w-full mb-4">
          <label className="block text-sm mb-1 text-gray-900" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="Introduza o seu email"
            className="w-full border border-gray-400 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="w-full mb-6">
          <label className="block text-sm mb-1 text-gray-900" htmlFor="password">Palavra-passe</label>
          <input
            id="password"
            type="password"
            placeholder="Introduza a sua palavra-passe"
            className="w-full border border-gray-400 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-black text-white py-2 rounded font-medium hover:bg-gray-900 transition-colors disabled:opacity-60"
          disabled={isLoading}
        >
          {isLoading ? "A iniciar sessão..." : "Iniciar Sessão"}
        </button>
      </form>
    </div>
  );
}
