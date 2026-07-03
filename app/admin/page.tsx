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
  archiviert: boolean | null;
  archiviert_am: string | null;
  pdf_name: string | null;
};

function AdminApp() {
  const [kunden, setKunden] = useState<Kunde[]>([]);
  const [fahrten, setFahrten] = useState<Fahrt[]>([]);
  const [kunde, setKunde] = useState<Kunde | null>(null);
  const [suche, setSuche] = useState("");
  const [meldung, setMeldung] = useState("");
  const [excelLaedt, setExcelLaedt] = useState(false);
  const [zeigeArchiv, setZeigeArchiv] = useState(false);

  useEffect(() => {
    ladeKunden();
  }, []);

  async function ladeKunden() {
    const { data, error } = await supabase.from("kunden").select("*").order("name");
    if (error) setMeldung(error.message);
    else setKunden(data ?? []);
  }

  async function ladeFahrten(k: Kunde, archiv = zeigeArchiv) {
    setKunde(k);

    const { data, error } = await supabase
      .from("fahrten")
      .select("*")
      .eq("kunde_id", k.id)
      .eq("archiviert", archiv)
      .order("created_at", { ascending: false });

    if (error) setMeldung(error.message);
    else setFahrten(data ?? []);
  }

  async function modusWechseln(archiv: boolean) {
    setZeigeArchiv(archiv);
    if (kunde) await ladeFahrten(kunde, archiv);
  }

  function updateFahrt(id: string, feld: keyof Fahrt, wert: any) {
    setFahrten((alt) => alt.map((f) => (f.id === id ? { ...f, [feld]: wert } : f)));
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

    if (error) {
      setMeldung("Fehler: " + error.message);
    } else {
      setMeldung("✅ Fahrt gelöscht");
      if (kunde) ladeFahrten(kunde);
    }
  }

  async function wiederOeffnen(id: string) {
    const { error } = await supabase
      .from("fahrten")
      .update({
        archiviert: false,
        archiviert_am: null,
        pdf_name: null,
      })
      .eq("id", id);

    if (error) {
      setMeldung("Fehler: " + error.message);
    } else {
      setMeldung("✅ Fahrt wieder geöffnet");
      if (kunde) ladeFahrten(kunde, true);
    }
  }

  async function excelErzeugen() {
    if (!kunde) return;

    if (!confirm("Excel erzeugen und offene Fahrten archivieren?")) return;

    setExcelLaedt(true);
    setMeldung("");

    const res = await fetch("/api/excel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kundeId: kunde.id }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setMeldung("Fehler: " + (data?.error || "Excel konnte nicht erzeugt werden"));
      setExcelLaedt(false);
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `fahrtenzettel-${kunde.name}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);

    setMeldung("✅ Excel erzeugt und Fahrten archiviert");
    setExcelLaedt(false);
    ladeFahrten(kunde, false);
  }

  const gefilterteKunden = kunden.filter((k) =>
    k.name.toLowerCase().includes(suche.toLowerCase())
  );

  if (kunde) {
    return (
      <main style={s.main}>
        <p>
          <button onClick={() => setKunde(null)} style={s.linkButton}>← Kundenliste</button>{" "}
          | <a href="/">Fahrer-App</a> | <a href="/kunden">Kundenverwaltung</a>
        </p>

        <h1>{kunde.name}</h1>
        <p>{kunde.adresse}</p>

        <button onClick={() => modusWechseln(false)} style={!zeigeArchiv ? s.activeTab : s.tab}>
          Offene Fahrten
        </button>
        <button onClick={() => modusWechseln(true)} style={zeigeArchiv ? s.activeTab : s.tab}>
          Archiv
        </button>

        {!zeigeArchiv && (
          <button
            onClick={excelErzeugen}
            disabled={excelLaedt || fahrten.length === 0}
            style={s.excelButton}
          >
            {excelLaedt ? "Excel wird erzeugt..." : "Daten als Excel erzeugen"}
          </button>
        )}

        {meldung && <p>{meldung}</p>}

        {fahrten.map((f) => (
          <div key={f.id} style={s.card}>
            {zeigeArchiv && (
              <p>
                <strong>Archiviert:</strong> {f.archiviert_am || "-"}<br />
                <strong>Datei:</strong> {f.pdf_name || "-"}
              </p>
            )}

            <label>Datum</label>
            <input
              type="date"
              value={f.fahrtdatum ?? ""}
              onChange={(e) => updateFahrt(f.id, "fahrtdatum", e.target.value)}
              style={s.input}
              disabled={zeigeArchiv}
            />

            {!f.fahrtdatum && <strong>Datum offen / zukünftige Fahrt</strong>}

            <label style={s.checkbox}>
              <input
                type="checkbox"
                checked={!!f.hinfahrt}
                onChange={(e) => updateFahrt(f.id, "hinfahrt", e.target.checked)}
                disabled={zeigeArchiv}
              />
              Hinfahrt
            </label>

            <label style={s.checkbox}>
              <input
                type="checkbox"
                checked={!!f.rueckfahrt}
                onChange={(e) => updateFahrt(f.id, "rueckfahrt", e.target.checked)}
                disabled={zeigeArchiv}
              />
              Rückfahrt
            </label>

            <label>Von</label>
            <input
              value={f.von_adresse ?? ""}
              onChange={(e) => updateFahrt(f.id, "von_adresse", e.target.value)}
              style={s.input}
              disabled={zeigeArchiv}
            />

            <label>Nach</label>
            <input
              value={f.nach_adresse ?? ""}
              onChange={(e) => updateFahrt(f.id, "nach_adresse", e.target.value)}
              style={s.input}
              disabled={zeigeArchiv}
            />

            {f.unterschrift && (
              <img src={f.unterschrift} alt="Unterschrift" style={s.signature} />
            )}

            {!zeigeArchiv ? (
              <div>
                <button onClick={() => speichern(f)} style={s.save}>Speichern</button>
                <button onClick={() => loeschen(f.id)} style={s.delete}>Löschen</button>
              </div>
            ) : (
              <button onClick={() => wiederOeffnen(f.id)} style={s.save}>
                Wieder öffnen
              </button>
            )}
          </div>
        ))}

        {fahrten.length === 0 && (
          <p>{zeigeArchiv ? "Keine archivierten Fahrten." : "Keine offenen Fahrten für diesen Kunden."}</p>
        )}
      </main>
    );
  }

  return (
    <main style={s.main}>
      <p><a href="/">Fahrer-App</a> | <a href="/kunden">Kundenverwaltung</a></p>
      <h1>Admin: Kunden</h1>

      <input
        placeholder="Kunde suchen..."
        value={suche}
        onChange={(e) => setSuche(e.target.value)}
        style={s.input}
      />

      {gefilterteKunden.map((k) => (
        <button key={k.id} onClick={() => ladeFahrten(k, false)} style={s.customer}>
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
  excelButton: { display: "block", padding: 16, background: "#004aad", color: "white", border: "none", borderRadius: 8, margin: "14px 0 20px 0", fontSize: 16 },
  linkButton: { background: "none", border: "none", textDecoration: "underline", cursor: "pointer", fontSize: 16 },
  tab: { padding: 12, marginRight: 8, border: "1px solid #ccc", borderRadius: 8, background: "white" },
  activeTab: { padding: 12, marginRight: 8, border: "none", borderRadius: 8, background: "black", color: "white" },
};