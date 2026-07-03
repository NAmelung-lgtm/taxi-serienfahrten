"use client";

import { useEffect, useState } from "react";

export default function PasswortSchutz({
  bereich,
  children,
}: {
  bereich: "fahrer" | "buero";
  children: React.ReactNode;
}) {
  const [eingeloggt, setEingeloggt] = useState(false);
  const [passwort, setPasswort] = useState("");
  const [fehler, setFehler] = useState("");

  useEffect(() => {
    const bis = localStorage.getItem("login_" + bereich);
    if (bis && Number(bis) > Date.now()) {
      setEingeloggt(true);
    }
  }, [bereich]);

  async function anmelden() {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bereich, passwort }),
    });

    const data = await res.json();

    if (!data.ok) {
      setFehler("Falsches Passwort");
      return;
    }

    localStorage.setItem(
      "login_" + bereich,
      String(Date.now() + 8 * 60 * 60 * 1000)
    );

    setEingeloggt(true);
  }

  if (eingeloggt) return <>{children}</>;

  return (
    <main style={{ padding: 30, fontFamily: "Arial" }}>
      <h1>{bereich === "fahrer" ? "🚖 Fahrer Login" : "🏢 Büro Login"}</h1>

      <input
        type="password"
        placeholder="Passwort"
        value={passwort}
        onChange={(e) => setPasswort(e.target.value)}
        style={{
          padding: 14,
          fontSize: 18,
          width: "100%",
          maxWidth: 400,
          marginBottom: 12,
        }}
      />

      <br />

      <button
        onClick={anmelden}
        style={{
          padding: 14,
          fontSize: 18,
          background: "black",
          color: "white",
          border: "none",
          borderRadius: 8,
        }}
      >
        Anmelden
      </button>

      {fehler && <p style={{ color: "red" }}>{fehler}</p>}
    </main>
  );
}