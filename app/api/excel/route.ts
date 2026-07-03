import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@supabase/supabase-js";
import path from "path";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function text(value: any) {
  return value ? String(value) : "";
}

function dateText(value: any) {
  if (!value) return "XXXXXX";

  const d = new Date(value);

  const tag = String(d.getDate()).padStart(2, "0");
  const monat = String(d.getMonth() + 1).padStart(2, "0");
  const jahr = d.getFullYear();

  return `${tag}.${monat}.${jahr}`;
}

function safeFileName(value: string) {
  return value.replace(/[^a-z0-9äöüß\- ]/gi, "").replaceAll(" ", "-");
}

export async function POST(request: Request) {
  const { kundeId } = await request.json();

  const { data: kunde, error: kundeError } = await supabase
    .from("kunden")
    .select("*")
    .eq("id", kundeId)
    .single();

  if (kundeError || !kunde) {
    return NextResponse.json({ error: "Kunde nicht gefunden" }, { status: 400 });
  }

  const { data: fahrten, error: fahrtenError } = await supabase
    .from("fahrten")
    .select("*")
    .eq("kunde_id", kundeId)
    .eq("archiviert", false)
    .order("created_at", { ascending: true });

  if (fahrtenError || !fahrten || fahrten.length === 0) {
    return NextResponse.json(
      { error: "Keine offenen Fahrten gefunden" },
      { status: 400 }
    );
  }

  const workbook = new ExcelJS.Workbook();

  const templatePath = path.join(
    process.cwd(),
    "templates",
    "vorlage-serienfahrten.xlsx"
  );

  await workbook.xlsx.readFile(templatePath);

  const sheet = workbook.worksheets[0];

  // Kopfbereich
  sheet.getCell("D5").value = `${text(kunde.name)}${
    kunde.geburtsdatum ? " geb. " + kunde.geburtsdatum : ""
  }`;
  sheet.getCell("D6").value = text(kunde.adresse);
  sheet.getCell("D7").value = text(kunde.krankenkasse);
  sheet.getCell("D8").value = text(kunde.versichertennummer);
  sheet.getCell("D9").value = text(kunde.genehmigungsnummer);
  sheet.getCell("D10").value = text(kunde.genehmigungsdatum);
  sheet.getCell("D11").value =
    "Taxi Dendra Inh. Alexander Zimmermann e.K.";

  // Fahrtenbereich
  // Fahrt 1: Zeile 15/16, Fahrt 2: 17/18, usw.
  const maxFahrten = 30;

  for (let i = 0; i < Math.min(fahrten.length, maxFahrten); i++) {
    const f = fahrten[i];
    const rowVon = 15 + i * 2;
    const rowNach = rowVon + 1;

sheet.getCell(`A${rowVon}`).value = i + 1;
sheet.getCell(`B${rowVon}`).value = dateText(f.fahrtdatum);

sheet.getCell(`C${rowVon}`).value = "von";
sheet.getCell(`D${rowVon}`).value = text(f.von_adresse);

sheet.getCell(`C${rowNach}`).value = "nach";
sheet.getCell(`D${rowNach}`).value = text(f.nach_adresse);

sheet.getCell(`E${rowVon}`).value = f.hinfahrt ? "X" : "";
sheet.getCell(`F${rowVon}`).value = f.rueckfahrt ? "X" : "";

    if (f.unterschrift?.startsWith("data:image/png;base64,")) {
      try {
        const base64 = f.unterschrift.replace("data:image/png;base64,", "");

        const imageId = workbook.addImage({
          base64,
          extension: "png",
        });

        sheet.addImage(imageId, {
  tl: { col: 6.2, row: rowVon - 1 },
  ext: { width: 125, height: 38 },
});
      } catch {
        // Falls eine Unterschrift beschädigt ist, wird sie übersprungen.
      }
    }
  }

  const filename = safeFileName(
    `fahrtenzettel-${text(kunde.name)}-${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`
  );

  const ids = fahrten.map((f: any) => f.id);

  await supabase
    .from("fahrten")
    .update({
      archiviert: true,
      archiviert_am: new Date().toISOString(),
      pdf_name: filename,
    })
    .in("id", ids);

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}