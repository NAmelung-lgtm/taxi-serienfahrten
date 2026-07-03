import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { bereich, passwort } = await request.json();

  const richtigesPasswort =
    bereich === "fahrer"
      ? process.env.FAHRER_PASSWORT
      : process.env.BUERO_PASSWORT;

  return NextResponse.json({
    ok: passwort === richtigesPasswort,
  });
}