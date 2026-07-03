"use client";

import { useEffect, useState } from "react";
import PasswortSchutz from "../../components/PasswortSchutz";
import { supabase } from "../../lib/supabase";

type Kunde = {
  id: string;
  name: string;
  adresse: string | null;
  krankenkasse: string | null;
};

type Fahrt = {
  id: string;
  fahrtdatum: string | null;
  fahrtart: string | null;
  hinfahrt: boolean | null;
  rueckfahrt: boolean | null;
  von_adresse: string | null;
  nach_adresse: string | null;
  unterschrift: string | null;
  created_at: string;
};

function AdminApp() {
  const [kunden, setKunden] = useState<Kunde[]>([]);
  const [fahrten, setFahrten] = useState<Fahrt[]>([]);
  const [kunde, setKunde] = useState<Kunde | null>(null);
  const [suche, setSuche] = useState("");
  const [meldung, setMeldung] = useState("");

  useEffect(() => {
    ladeKunden();
  }, []);

  async function ladeKunden() {
    const { data, error } = await supabase.from("kunden").select("*").order("name");
    if (error) setMeldung(error.message);
    else setKunden(data ?? []);
  }

  async function ladeFahrten(k: Kunde) {
    setKunde(k);
    const { data, error } = await supabase
      .from("fahrten")
      .select("*")
      .eq("kunde_id", k.id)
      .order("created_at", { ascending: false });

    if (error) setMeldung(error.message);
    else setFahrten(data ?? []);
  }

  function updateFahrt(id: string, feld: keyof Fahrt, wert: any) {
    setFahrten((alt) =>
      alt.map((f) => (f.id === id ? { ...f, [feld]: wert } : f))
    );
  }

  async function speichern(f: Fahrt) {
    const { error } = await supabase
      .from("fahrten")
      .update({
        fahrtdatum: f.fahrtdatum || null,
        hinfahrt: f.hinfahrt || false,
        rueckfahrt: f.rueckfahrt || false,
        fahrtart:
          f.hinfahrt && f.rueckfahrt
            ? "Hin- und Rückfahrt"
            : f.hinfahrt
            ? "Hinfahrt"
            : f.rueckfahrt
            ? "Rückfahrt"
            : null,
        von_adresse: f.von_adresse || null,
        nach_adresse: f.nach_adresse || null,
      })
      .eq("id", f.id);

    if (error) setMeldung("Fehler: " + error.message);
    else setMeldung("✅ Fahrt gespeichert");
  }

  async function loeschen(id: string) {
    if (!confirm("Fahrt wirklich löschen?")) return;

    const { error } = await supabase.from("fahrten").delete().eq("id", id);

    if (error) setMeldung("Fehler: " + error.message);
    else {
      setMeldung("✅ Fahrt gelöscht");
      if (kunde) ladeFahrten(kunde);
    }
  }

  const gefilterteKunden = kunden.filter((k) =>
    k.name.toLowerCase().includes(suche.toLowerCase())
  );

  if (kunde) {
    return (
      <main style={s.main}>
        <p>
          <button onClick={() => setKunde(null)} style={s.linkButton}>
            ← Kundenliste
          </button>{" "}
          | <a href="/">Fahrer-App</a> | <a href="/kunden">Kundenverwaltung</a>
        </p>

        <h1>{kunde.name}</h1>
        <p>{kunde.adresse}</p>

        {meldung && <p>{meldung}</p>}

        {fahrten.map((f) => (
          <div key={f.id} style={s.card}>
            <label>Datum</label>
            <input
              type="date"
              value={f.fahrtdatum ?? ""}
              onChange={(e) => updateFahrt(f.id, "fahrtdatum", e.target.value)}
              style={s.input}
            />

            {!f.fahrtdatum && <strong>Datum offen / zukünftige Fahrt</strong>}

            <label style={s.checkbox}>
              <input
                type="checkbox"
                checked={!!f.hinfahrt}
                onChange={(e) => updateFahrt(f.id, "hinfahrt", e.target.checked)}
              />
              Hinfahrt
            </label>

            <label style={s.checkbox}>
              <input
                type="checkbox"
                checked={!!f.rueckfahrt}
                onChange={(e) => updateFahrt(f.id, "rueckfahrt", e.target.checked)}
              />
              Rückfahrt
            </label>

            <label>Von</label>
            <input
              value={f.von_adresse ?? ""}
              onChange={(e) => updateFahrt(f.id, "von_adresse", e.target.value)}
              style={s.input}
            />

            <label>Nach</label>
            <input
              value={f.nach_adresse ?? ""}
              onChange={(e) => updateFahrt(f.id, "nach_adresse", e.target.value)}
              style={s.input}
            />

            {f.unterschrift && (
              <img src={f.unterschrift} alt="Unterschrift" style={s.signature} />
            )}

            <div>
              <button onClick={() => speichern(f)} style={s.save}>
                Speichern
              </button>
              <button onClick={() => loeschen(f.id)} style={s.delete}>
                Löschen
              </button>
            </div>
          </div>
        ))}

        {fahrten.length === 0 && <p>Keine Fahrten für diesen Kunden.</p>}
      </main>
    );
  }

  return (
    <main style={s.main}>
      <p>
        <a href="/">Fahrer-App</a> | <a href="/kunden">Kundenverwaltung</a>
      </p>

      <h1>Admin: Kunden</h1>

      <input
        placeholder="Kunde suchen..."
        value={suche}
        onChange={(e) => setSuche(e.target.value)}
        style={s.input}
      />

      {gefilterteKunden.map((k) => (
        <button key={k.id} onClick={() => ladeFahrten(k)} style={s.customer}>
          <strong>{k.name}</strong>
          <p>{k.adresse}</p>
          <small>{k.krankenkasse}</small>
        </button>
      ))}
    </main>
  );
}

export default function AdminPage() {
  return (
    <PasswortSchutz bereich="buero">
      <AdminApp />
    </PasswortSchutz>
  );
}

const s: Record<string, React.CSSProperties> = {
  main: { padding: 20, fontFamily: "Arial", background: "#f4f4f4", minHeight: "100vh" },
  card: { background: "white", padding: 16, marginBottom: 16, borderRadius: 10, maxWidth: 650 },
  input: { display: "block", width: "100%", maxWidth: 600, padding: 12, marginBottom: 10, fontSize: 16, borderRadius: 8, border: "1px solid #ccc" },
  customer: { display: "block", width: "100%", maxWidth: 600, textAlign: "left", background: "white", padding: 16, marginBottom: 12, borderRadius: 10, border: "none" },
  checkbox: { display: "block", marginBottom: 8, fontSize: 18 },
  signature: { width: 260, maxWidth: "100%", display: "block", border: "1px solid #ccc", background: "white", margin: "12px 0" },
  save: { padding: 12, background: "black", color: "white", border: "none", borderRadius: 8, marginRight: 8 },
  delete: { padding: 12, background: "#b00020", color: "white", border: "none", borderRadius: 8 },
  linkButton: { background: "none", border: "none", textDecoration: "underline", cursor: "pointer", fontSize: 16 },
};