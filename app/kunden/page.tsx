"use client";

import { useEffect, useState } from "react";
import PasswortSchutz from "../../components/PasswortSchutz";
import { supabase } from "../../lib/supabase";

type Kunde = {
  id: string;
  name: string;
  adresse: string | null;
  geburtsdatum: string | null;
  krankenkasse: string | null;
  versichertennummer: string | null;
  genehmigungsnummer: string | null;
  genehmigungsdatum: string | null;
  genehmigung_gueltig_bis: string | null;
  zahlungsart: string | null;
  abholort: string | null;
  zielort: string | null;
};

const leererKunde: Partial<Kunde> = {
  name: "",
  adresse: "",
  geburtsdatum: "",
  krankenkasse: "",
  versichertennummer: "",
  genehmigungsnummer: "",
  genehmigungsdatum: "",
  genehmigung_gueltig_bis: "",
  zahlungsart: "frei",
  abholort: "",
  zielort: "",
};

function KundenApp() {
  const [kunden, setKunden] = useState<Kunde[]>([]);
  const [formular, setFormular] = useState<Partial<Kunde>>(leererKunde);
  const [bearbeitenId, setBearbeitenId] = useState<string | null>(null);
  const [suche, setSuche] = useState("");
  const [meldung, setMeldung] = useState("");

  useEffect(() => {
    laden();
  }, []);

  async function laden() {
    const { data, error } = await supabase.from("kunden").select("*").order("name");
    if (error) {
      setMeldung("Fehler: " + error.message);
      return;
    }
    setKunden(data ?? []);
  }

  function feld(name: keyof Kunde, wert: string) {
    setFormular((alt) => ({ ...alt, [name]: wert }));
  }

  async function speichern() {
    if (!formular.name) {
      setMeldung("Name fehlt.");
      return;
    }

    const daten = {
      name: formular.name || null,
      adresse: formular.adresse || null,
      geburtsdatum: formular.geburtsdatum || null,
      krankenkasse: formular.krankenkasse || null,
      versichertennummer: formular.versichertennummer || null,
      genehmigungsnummer: formular.genehmigungsnummer || null,
      genehmigungsdatum: formular.genehmigungsdatum || null,
      genehmigung_gueltig_bis: formular.genehmigung_gueltig_bis || null,
      zahlungsart: formular.zahlungsart || null,
      abholort: formular.abholort || null,
      zielort: formular.zielort || null,
    };

    const { error } = bearbeitenId
      ? await supabase.from("kunden").update(daten).eq("id", bearbeitenId)
      : await supabase.from("kunden").insert(daten);

    if (error) {
      setMeldung("Fehler: " + error.message);
      return;
    }

    setMeldung(bearbeitenId ? "✅ Kunde aktualisiert" : "✅ Kunde angelegt");
    setFormular(leererKunde);
    setBearbeitenId(null);
    laden();
  }

  function bearbeiten(k: Kunde) {
    setBearbeitenId(k.id);
    setFormular(k);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function loeschen(id: string) {
    if (!confirm("Kunden wirklich löschen?")) return;

    const { error } = await supabase.from("kunden").delete().eq("id", id);

    if (error) {
      setMeldung("Fehler: " + error.message);
      return;
    }

    setMeldung("✅ Kunde gelöscht");
    laden();
  }

  const gefiltert = kunden.filter((k) =>
    k.name.toLowerCase().includes(suche.toLowerCase())
  );

  return (
    <main style={s.main}>
      <p>
        <a href="/">← Fahrer-App</a> | <a href="/admin">Admin</a>
      </p>

      <h1>Kundenverwaltung</h1>

      <div style={s.card}>
        <h2>{bearbeitenId ? "Kunde bearbeiten" : "Neuer Kunde"}</h2>

        <input placeholder="Name" value={formular.name ?? ""} onChange={(e) => feld("name", e.target.value)} style={s.input} />
        <input placeholder="Adresse" value={formular.adresse ?? ""} onChange={(e) => feld("adresse", e.target.value)} style={s.input} />

        <label>Geburtsdatum</label>
        <input type="date" value={formular.geburtsdatum ?? ""} onChange={(e) => feld("geburtsdatum", e.target.value)} style={s.input} />

        <input placeholder="Krankenkasse" value={formular.krankenkasse ?? ""} onChange={(e) => feld("krankenkasse", e.target.value)} style={s.input} />
        <input placeholder="Versichertennummer" value={formular.versichertennummer ?? ""} onChange={(e) => feld("versichertennummer", e.target.value)} style={s.input} />
        <input placeholder="Genehmigungsnummer" value={formular.genehmigungsnummer ?? ""} onChange={(e) => feld("genehmigungsnummer", e.target.value)} style={s.input} />

        <label>Genehmigungsdatum</label>
        <input type="date" value={formular.genehmigungsdatum ?? ""} onChange={(e) => feld("genehmigungsdatum", e.target.value)} style={s.input} />

        <label>Genehmigung gültig bis</label>
        <input type="date" value={formular.genehmigung_gueltig_bis ?? ""} onChange={(e) => feld("genehmigung_gueltig_bis", e.target.value)} style={s.input} />

        <label>Zahlungsart</label>
        <select value={formular.zahlungsart ?? "frei"} onChange={(e) => feld("zahlungsart", e.target.value)} style={s.input}>
          <option value="frei">frei</option>
          <option value="Rechnung">Rechnung</option>
          <option value="Bar">Bar</option>
        </select>

        <input placeholder="Standard-Abholort" value={formular.abholort ?? ""} onChange={(e) => feld("abholort", e.target.value)} style={s.input} />
        <input placeholder="Standard-Zielort" value={formular.zielort ?? ""} onChange={(e) => feld("zielort", e.target.value)} style={s.input} />

        <button onClick={speichern} style={s.save}>
          {bearbeitenId ? "Änderungen speichern" : "Kunde anlegen"}
        </button>

        {bearbeitenId && (
          <button onClick={() => { setBearbeitenId(null); setFormular(leererKunde); }} style={s.cancel}>
            Abbrechen
          </button>
        )}

        {meldung && <p>{meldung}</p>}
      </div>

      <h2>Alle Kunden</h2>

      <input
        placeholder="Kunde suchen..."
        value={suche}
        onChange={(e) => setSuche(e.target.value)}
        style={s.input}
      />

      {gefiltert.map((k) => (
        <div key={k.id} style={s.card}>
          <h3>{k.name}</h3>
          <p>{k.adresse}</p>
          <p>{k.krankenkasse}</p>
          <small>
            Zahlungsart: {k.zahlungsart || "-"}<br />
            Genehmigung: {k.genehmigungsdatum || "-"} bis {k.genehmigung_gueltig_bis || "-"}<br />
            Abholort: {k.abholort || "-"}<br />
            Zielort: {k.zielort || "-"}
          </small>

          <div style={{ marginTop: 12 }}>
            <button onClick={() => bearbeiten(k)} style={s.save}>Bearbeiten</button>
            <button onClick={() => loeschen(k.id)} style={s.delete}>Löschen</button>
          </div>
        </div>
      ))}
    </main>
  );
}

export default function KundenPage() {
  return (
    <PasswortSchutz bereich="buero">
      <KundenApp />
    </PasswortSchutz>
  );
}

const s: Record<string, React.CSSProperties> = {
  main: { padding: 20, fontFamily: "Arial", background: "#f4f4f4", minHeight: "100vh" },
  card: { background: "white", padding: 16, marginBottom: 16, borderRadius: 10, maxWidth: 650 },
  input: { display: "block", width: "100%", maxWidth: 600, padding: 12, marginBottom: 10, fontSize: 16, borderRadius: 8, border: "1px solid #ccc" },
  save: { padding: 12, background: "black", color: "white", border: "none", borderRadius: 8, marginRight: 8 },
  cancel: { padding: 12, background: "white", border: "1px solid #ccc", borderRadius: 8 },
  delete: { padding: 12, background: "#b00020", color: "white", border: "none", borderRadius: 8 },
};