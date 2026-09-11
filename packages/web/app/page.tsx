"use client";

import Link from "next/link";
import { useState } from "react";

import { todayUtcYyyymmdd } from "@aletheia/credential";
import type { DocumentExtractionResult } from "@aletheia/extraction/browser";

import { DEFAULT_CONTEXT_LABEL, contextIdFromLabel } from "@/lib/context";
import { DEPLOYMENT, etherscanTx } from "@/lib/deployment";
import { extractImage, extractPdf, extractText } from "@/lib/extraction";
import { proveAgeInBrowser } from "@/lib/prove";
import { loadMockIssuer, signReviewedCredential } from "@/lib/sign";
import {
  connectDevSigner,
  connectInjected,
  devSignerAvailable,
  submitAgeClaim,
  type Signer,
} from "@/lib/submit";

type InputTab = "text" | "pdf" | "image";

interface ReviewForm {
  documentNumber: string;
  nationalityAlpha3: string;
  nationality: string; // ISO numeric, as text for the input
  dateOfBirth: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  sex: string;
}

interface Outcome {
  hash: string;
  verificationId: string;
  subject: string;
  nullifier: string;
  identityNullifier: string;
  documentKey: string;
  minimumAge: number;
  /** The block the transaction was mined in, handed to the verifier view to watch indexing. */
  block: string;
}

// A specimen TD3 MRZ with valid ICAO check digits (the repo's extraction fixture): DOB
// 1988-05-15, expiry 2030-01-02. Not a real person.
const SAMPLE_MRZ =
  "P<INDRASHMI<<DEVI<<<<<<<<<<<<<<<<<<<<<<<<<<<\nJ8369854<4IND8805153F3001020<<<<<<<<<<<<<<<4";

function yyyymmddToInput(value: number): string {
  const s = value.toString().padStart(8, "0");
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

function inputToYyyymmdd(value: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) throw new Error(`date must be YYYY-MM-DD, got ${JSON.stringify(value)}`);
  return Number(`${m[1]}${m[2]}${m[3]}`);
}

export default function Page() {
  const [tab, setTab] = useState<InputTab>("text");
  const [rawText, setRawText] = useState("");
  const [extraction, setExtraction] = useState<DocumentExtractionResult | null>(null);
  const [form, setForm] = useState<ReviewForm | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [minimumAge, setMinimumAge] = useState(18);

  const [signer, setSigner] = useState<Signer | null>(null);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  function say(line: string) {
    setLog((prev) => [...prev, line]);
  }

  function reset() {
    setExtraction(null);
    setForm(null);
    setConfirmed(false);
    setOutcome(null);
    setError(null);
    setLog([]);
  }

  function applyExtraction(result: DocumentExtractionResult) {
    setExtraction(result);
    setConfirmed(false);
    setOutcome(null);
    if (result.ok) {
      const f = result.fields;
      setForm({
        documentNumber: f.documentNumber,
        nationalityAlpha3: f.nationalityAlpha3,
        nationality: String(f.nationality),
        dateOfBirth: yyyymmddToInput(f.dateOfBirth),
        expiryDate: yyyymmddToInput(f.expiryDate),
        sex: f.sex,
      });
    } else {
      setForm(null);
    }
  }

  async function onExtract(runner: () => Promise<DocumentExtractionResult> | DocumentExtractionResult) {
    setError(null);
    setBusy(true);
    try {
      applyExtraction(await runner());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function connect(kind: "injected" | "dev") {
    setError(null);
    try {
      const s = kind === "dev" ? connectDevSigner() : await connectInjected();
      setSigner(s);
      say(`wallet connected (${s.kind}): ${s.address}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function proveAndSubmit() {
    if (!signer || !form) return;
    setError(null);
    setOutcome(null);
    setBusy(true);
    setLog([]);
    try {
      const reviewed = {
        documentNumber: form.documentNumber.trim().toUpperCase(),
        nationality: Number(form.nationality),
        dateOfBirth: inputToYyyymmdd(form.dateOfBirth),
        expiryDate: inputToYyyymmdd(form.expiryDate),
      };

      say("loading mock-dev issuer keystore (from this origin)…");
      const issuer = await loadMockIssuer();

      say("deriving documentKey and signing the credential on-device…");
      const { signed, documentKey } = await signReviewedCredential({
        issuer,
        fields: reviewed,
        subject: signer.address,
      });
      say(`documentKey: ${documentKey.toString()}`);

      const currentDate = todayUtcYyyymmdd();
      const contextId = contextIdFromLabel(DEFAULT_CONTEXT_LABEL);
      say(`proving age ≥ ${minimumAge} on ${currentDate} (this runs in your browser, ~a few seconds)…`);
      const proof = await proveAgeInBrowser(signed, { minimumAge, currentDate, contextId });
      say("proof produced and verified locally.");

      say("simulating submitAgeClaim on Sepolia…");
      const result = await submitAgeClaim(signer, proof.calldata);
      say(`submitted: ${result.hash}`);
      say("mined. reading ClaimVerified event…");

      const e = result.event;
      if (e.issuerId.toLowerCase() !== DEPLOYMENT.mockIssuerId.toLowerCase()) {
        throw new Error("the emitted issuerId is not the registered mock-dev issuer");
      }
      setOutcome({
        hash: result.hash,
        verificationId: result.verificationId,
        subject: e.subject,
        nullifier: e.nullifier,
        identityNullifier: e.identityNullifier,
        documentKey: documentKey.toString(),
        minimumAge,
        block: result.receipt.blockNumber.toString(),
      });
      say("done — real proof, real transaction, real event.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const extractionFailed = extraction && !extraction.ok ? extraction : null;

  return (
    <main>
      <nav className="nav">
        <Link href="/" data-active="true">
          Holder
        </Link>
        <Link href="/verify">Verifier</Link>
      </nav>

      <h1>Aletheia — holder flow</h1>
      <p className="sub">
        Extract a passport MRZ, review it, prove an age claim, and submit it to Sepolia. Everything
        runs on this device.
      </p>

      <div className="mock-banner">
        <span className="badge-mock">mock-dev</span> This issuer verifies no identity. A credential
        signed here proves issuance by a mock issuer and nothing more — never a verified identity.
      </div>

      {/* 1. Input */}
      <section className="step" data-done={Boolean(extraction?.ok)}>
        <h2>
          <span className="n">1</span> Load a passport
        </h2>
        <div className="tabs">
          <button data-active={tab === "text"} onClick={() => setTab("text")}>
            Paste MRZ
          </button>
          <button data-active={tab === "pdf"} onClick={() => setTab("pdf")}>
            PDF
          </button>
          <button data-active={tab === "image"} onClick={() => setTab("image")}>
            Image
          </button>
        </div>

        {tab === "text" && (
          <>
            <label>The two MRZ lines (bottom of the passport data page)</label>
            <textarea
              value={rawText}
              spellCheck={false}
              placeholder={SAMPLE_MRZ}
              onChange={(ev) => setRawText(ev.target.value)}
            />
            <div>
              <button disabled={busy || rawText.trim().length === 0} onClick={() => onExtract(() => extractText(rawText))}>
                Extract
              </button>
              <button
                className="secondary"
                style={{ marginLeft: 8 }}
                disabled={busy}
                onClick={() => setRawText(SAMPLE_MRZ)}
              >
                Use sample MRZ
              </button>
            </div>
            <p className="hint">The sample is a specimen passport (immihelp.com), not a real person.</p>
          </>
        )}

        {tab === "pdf" && (
          <>
            <label>A PDF whose text layer carries the MRZ</label>
            <input
              type="file"
              accept="application/pdf"
              disabled={busy}
              onChange={(ev) => {
                const file = ev.target.files?.[0];
                if (file) void onExtract(() => extractPdf(file));
              }}
            />
            <p className="hint">Read locally via pdf.js; document JavaScript is disabled.</p>
          </>
        )}

        {tab === "image" && (
          <>
            <label>A photo or scan of the data page</label>
            <input
              type="file"
              accept="image/*"
              disabled={busy}
              onChange={(ev) => {
                const file = ev.target.files?.[0];
                if (file) void onExtract(() => extractImage(file));
              }}
            />
            <p className="hint">OCR runs on-device (tesseract.js, offline). A clean, cropped MRZ reads best.</p>
          </>
        )}

        {extractionFailed && (
          <div>
            {extractionFailed.issues.map((i, idx) => (
              <p className="issue" key={`d${idx}`}>
                {i.code}: {i.detail}
              </p>
            ))}
            {extractionFailed.mrz.map((i, idx) => (
              <p className="issue" key={`m${idx}`}>
                {i.field} — {i.code}: {i.detail}
              </p>
            ))}
            {extractionFailed.mrzLines.length > 0 && (
              <p className="mono">{extractionFailed.mrzLines.join("\n")}</p>
            )}
          </div>
        )}
      </section>

      {/* 2. Review */}
      {form && (
        <section className="step" data-done={confirmed}>
          <h2>
            <span className="n">2</span> Review &amp; correct
          </h2>
          <p className="hint">
            Extraction is untrusted input. Confirm every field — it is what the issuer will sign.
          </p>
          <div className="row">
            <div>
              <label>Document number</label>
              <input
                value={form.documentNumber}
                onChange={(e) => setForm({ ...form, documentNumber: e.target.value, })}
                disabled={confirmed}
              />
            </div>
            <div>
              <label>Nationality (ISO 3166-1 numeric) — {form.nationalityAlpha3}</label>
              <input
                value={form.nationality}
                onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                disabled={confirmed}
              />
            </div>
            <div>
              <label>Date of birth</label>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                disabled={confirmed}
              />
            </div>
            <div>
              <label>Expiry date</label>
              <input
                type="date"
                value={form.expiryDate}
                onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                disabled={confirmed}
              />
            </div>
          </div>
          {!confirmed ? (
            <button onClick={() => setConfirmed(true)}>These fields are correct</button>
          ) : (
            <button className="secondary" onClick={() => setConfirmed(false)}>
              Edit again
            </button>
          )}
        </section>
      )}

      {/* 3. Claim + wallet */}
      {confirmed && form && (
        <section className="step" data-done={Boolean(outcome)}>
          <h2>
            <span className="n">3</span> Prove &amp; submit
          </h2>

          <label>Prove age at least</label>
          <input
            type="number"
            min={0}
            max={120}
            value={minimumAge}
            onChange={(e) => setMinimumAge(Number(e.target.value))}
            style={{ width: 120 }}
          />

          <div style={{ marginTop: 14 }}>
            {signer ? (
              <p className="hint">
                Wallet ({signer.kind}): <span className="mono">{signer.address}</span>
              </p>
            ) : (
              <>
                <button onClick={() => connect("injected")}>Connect wallet</button>
                {devSignerAvailable && (
                  <button className="secondary" style={{ marginLeft: 8 }} onClick={() => connect("dev")}>
                    Use dev signer
                  </button>
                )}
              </>
            )}
          </div>

          <button disabled={!signer || busy} onClick={() => void proveAndSubmit()}>
            {busy ? "Working…" : "Prove age & submit to Sepolia"}
          </button>

          {log.length > 0 && <div className="log">{log.join("\n")}</div>}
        </section>
      )}

      {outcome && (
        <section className="step" data-done>
          <h2>
            <span className="n">✓</span> Verified on Sepolia <span className="badge-mock">mock-dev</span>
          </h2>
          <div className="kv">
            <span className="k">Claim</span>
            <span className="ok">age ≥ {outcome.minimumAge}</span>
            <span className="k">Transaction</span>
            <span className="mono">
              <a href={etherscanTx(outcome.hash)} target="_blank" rel="noreferrer">
                {outcome.hash}
              </a>
            </span>
            <span className="k">verificationId</span>
            <span className="mono">{outcome.verificationId}</span>
            <span className="k">subject (wallet)</span>
            <span className="mono">{outcome.subject}</span>
            <span className="k">nullifier</span>
            <span className="mono">{outcome.nullifier}</span>
            <span className="k">identityNullifier</span>
            <span className="mono">{outcome.identityNullifier}</span>
            <span className="k">documentKey</span>
            <span className="mono">{outcome.documentKey}</span>
          </div>
          <p className="hint" style={{ marginTop: 14 }}>
            The transaction carried only the proof and its public signals. Your date of birth,
            nationality, expiry and document number never left this device.
          </p>
          <p style={{ marginTop: 14 }}>
            <Link href={`/verify?watch=${outcome.verificationId}&block=${outcome.block}`}>
              See this in the verifier view →
            </Link>{" "}
            <span className="hint">
              (it starts as pending and turns verified once the subgraph indexes the block, without a
              reload)
            </span>
          </p>
          <button className="secondary" onClick={reset}>
            Start over
          </button>
        </section>
      )}

      {error && <p className="error">{error}</p>}
    </main>
  );
}
