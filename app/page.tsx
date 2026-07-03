"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

type Kunde = {
  id: string;
  name: string;
  adresse: string | null;
  krankenkasse: string | null;
  abholort: string | null;
  zielort: string | null;
};

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zeichnen, setZeichnen] = useState(false);
  const [kunden, setKunden] = useState<Kunde[]>([]);
  const [kunde, setKunde] = useState<Kunde | null>(null);
  const [suche, setSuche] = useState("");
  const [meldung, setMeldung] = useState("");

  const [fahrtdatum, setFahrtdatum] = useState("");
  const [hinfahrt, setHinfahrt] = useState(false);
  const [rueckfahrt, setRueckfahrt] = useState(false);
  const [vonAdresse, setVonAdresse] = useState("");
  const [nachAdresse, setNachAdresse] = useState("");

  useEffect(() => {
    ladeKunden();
  }, []);

  async function ladeKunden() {
    const { data } = await supabase.from("kunden").select("*").order("name");
    setKunden(data ?? []);
  }

  function kundeAuswaehlen(k: Kunde) {
    setKunde(k);
    setVonAdresse(k.abholort || k.adresse || "");
    setNachAdresse(k.zielort || "");
    setFahrtdatum("");
    setHinfahrt(false);
    setRueckfahrt(false);
    setMeldung("");
  }

  function getPosition(e: any) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function start(e: any) {
    e.preventDefault();
    setZeichnen(true);
    const ctx = canvasRef.current!.getContext("2d")!;
    const pos = getPosition(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function zeichne(e: any) {
    e.preventDefault();
    if (!zeichnen) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const pos = getPosition(e);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "black";
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function stop() {
    setZeichnen(false);
  }

  function unterschriftLoeschen() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
  }

  async function speichern() {
    if (!kunde) return;

    const unterschrift = canvasRef.current?.toDataURL("image/png");

    const { error } = await supabase.from("fahrten").insert({
      kunde_id: kunde.id,
      fahrtdatum: fahrtdatum || null,
      hinfahrt,
      rueckfahrt,
      fahrtart:
        hinfahrt && rueckfahrt
          ? "Hin- und Rückfahrt"
          : hinfahrt
          ? "Hinfahrt"
          : rueckfahrt
          ? "Rückfahrt"
          : null,
      von_adresse: vonAdresse || null,
      nach_adresse: nachAdresse || null,
      unterschrift,
    });

    if (error) {
      setMeldung("Fehler: " + error.message);
      return;
    }

    setMeldung("✅ Fahrt gespeichert");
    unterschriftLoeschen();
    setFahrtdatum("");
    setHinfahrt(false);
    setRueckfahrt(false);
  }

  const gefiltert = kunden.filter((k) =>
    k.name.toLowerCase().includes(suche.toLowerCase())
  );

  if (kunde) {
    return (
      <main style={s.main}>
        <button style={s.back} onClick={() => setKunde(null)}>
          ← Zurück
        </button>

        <div style={s.card}>
          <h1>Fahrt erfassen</h1>
          <h2>{kunde.name}</h2>

          <label style={s.label}>Datum</label>
          <input
            type="date"
            value={fahrtdatum}
            onChange={(e) => setFahrtdatum(e.target.value)}
            style={s.input}
          />
          <small>Leer lassen = zukünftige Fahrt / nur Unterschrift gesammelt</small>

          <label style={s.checkboxLabel}>
            <input
              type="checkbox"
              checked={hinfahrt}
              onChange={(e) => setHinfahrt(e.target.checked)}
            />
            Hinfahrt
          </label>

          <label style={s.checkboxLabel}>
            <input
              type="checkbox"
              checked={rueckfahrt}
              onChange={(e) => setRueckfahrt(e.target.checked)}
            />
            Rückfahrt
          </label>

          <label style={s.label}>Von</label>
          <input
            value={vonAdresse}
            onChange={(e) => setVonAdresse(e.target.value)}
            style={s.input}
          />

          <label style={s.label}>Nach</label>
          <input
            value={nachAdresse}
            onChange={(e) => setNachAdresse(e.target.value)}
            style={s.input}
          />

          <label style={s.label}>Unterschrift</label>
          <canvas
            ref={canvasRef}
            width={460}
            height={180}
            onMouseDown={start}
            onMouseMove={zeichne}
            onMouseUp={stop}
            onMouseLeave={stop}
            onTouchStart={start}
            onTouchMove={zeichne}
            onTouchEnd={stop}
            style={s.canvas}
          />

          <button style={s.clear} onClick={unterschriftLoeschen}>
            Unterschrift löschen
          </button>

          <button style={s.save} onClick={speichern}>
            Fahrt speichern
          </button>

          {meldung && <p>{meldung}</p>}
        </div>
      </main>
    );
  }

  return (
    <main style={s.main}>
      <h1>🚖 Taxi Serienfahrten</h1>
      <p>
        <a href="/kunden">Kundenverwaltung</a> | <a href="/admin">Admin</a>
      </p>

      <input
        placeholder="Kunde suchen..."
        value={suche}
        onChange={(e) => setSuche(e.target.value)}
        style={s.input}
      />

      {gefiltert.map((k) => (
        <button key={k.id} onClick={() => kundeAuswaehlen(k)} style={s.customer}>
          <strong>{k.name}</strong>
          <p>{k.abholort || k.adresse}</p>
          <small>{k.zielort}</small>
        </button>
      ))}
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  main: { padding: 20, fontFamily: "Arial", background: "#f4f4f4", minHeight: "100vh" },
  card: { maxWidth: 520, background: "white", padding: 20, borderRadius: 12 },
  input: { width: "100%", maxWidth: 500, padding: 14, fontSize: 16, borderRadius: 8, border: "1px solid #ccc", marginBottom: 10 },
  label: { display: "block", marginTop: 12, marginBottom: 6, fontWeight: "bold" },
  checkboxLabel: { display: "block", marginTop: 12, fontSize: 18 },
  customer: { display: "block", width: "100%", maxWidth: 500, textAlign: "left", background: "white", padding: 16, marginBottom: 12, borderRadius: 10, border: "none" },
  canvas: { width: "100%", height: 180, border: "2px solid black", background: "white", touchAction: "none" },
  save: { width: "100%", padding: 16, marginTop: 16, background: "black", color: "white", border: "none", borderRadius: 8 },
  clear: { padding: 12, marginTop: 10 },
  back: { padding: 10, marginBottom: 20 },
};