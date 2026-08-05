# UOB Credit AI — 5-Minute Product Video Script

**Runtime:** ~5:00 · **Voiceover:** 704 words — 4:51 read at 145 wpm, landing at
5:03 with a short pause between scenes · **Format:** screen recording + narration

If you read faster than 145 wpm you'll come in under five minutes; hold the
Scene 8 visuals a beat longer to fill.

Two personas, one platform: the SME applicant and the credit approver. The
narration is written to be read aloud — short sentences, no jargon.

**Before you record:** the browser tab still reads "OCR Financial Statement
Analyzer" (`frontend/index.html:7`). Change it, or crop the tab bar out.

---

## Scene 1 — The problem (0:00–0:40)

**On screen:** No UI yet. A plain title card, then a slow scroll through one of
the mock bank statement PDFs in the repo root (e.g.
`mock_uob_sme_statement.pdf`) — dense, unstructured, page after page of
transaction lines.

**Voiceover:**

> A small business in Singapore needs eighty thousand dollars to take on a
> bigger order. The owner knows the business is good for it. Proving that to a
> bank is the hard part.
>
> So they gather six months of bank statements, tax notices, company filings,
> guarantor documents — and then they wait. Often two to three weeks.
>
> On the other side sits a credit approver with a stack of PDFs like this one,
> reading line by line, retyping numbers, checking whether what was declared
> matches what the statements show.
>
> Both sides are doing work a computer should do.

---

## Scene 2 — What we built (0:40–1:05)

**On screen:** `DemoProfileSelector` — the three demo companies with their
expected outcomes (Nexus → Approve, Vortex → Review, Orion → Reject). Then click
into `LoanLandingPage`, the UOB BizMoney page.

**Voiceover:**

> We built UOB Credit AI to do it. An SME applies in minutes. The system reads
> their documents, scores the risk, and hands an approver a decision with the
> evidence behind it.
>
> One thing up front: the statement analysis and the decisioning are real,
> working code. The external connections — Singpass, ACRA, the credit bureau —
> are simulated, built as swappable clients so the real APIs drop straight in.
>
> Let's follow one application through.

---

## Scene 3 — Applying (1:05–1:45)

**On screen:** `SingpassLogin` → "Simulate QR Scan" → `MyInfoReview` with the
retrieved company profile, the property question, and the site-visit map.

**Voiceover:**

> The applicant logs in with Singpass. Company details arrive already filled —
> name, registration number, address, directors. Nothing retyped.
>
> Note what is *not* here. This step retrieves company data only. No personal
> information about anyone.
>
> That matters more than it sounds. An earlier version of this build let one
> applicant's login expose every director's date of birth and income. That is
> not how it works in reality, and not how it works now.

---

## Scene 4 — Guarantors, done properly (1:45–2:20)

**On screen:** `PgSelection` coverage meter, then `PgVerification` — send a link,
"Invite sent — awaiting completion", "Simulate remote completion", tick each
guarantor's separate bureau consent. Try Continue while one is incomplete: it
stays disabled.

**Voiceover:**

> Unsecured lending needs personal guarantors. The rules are strict: anyone
> holding twenty-five percent or more, ranked until at least half the ownership
> is covered. The meter tracks it live.
>
> Each guarantor then verifies themselves. In the room, Singpass. If not, they
> get their own link. Each gives bureau consent separately — nobody consents on
> another's behalf.
>
> And the application cannot proceed until all of them are done. Watch the
> Continue button stay grey. That is a compliance rule enforced, not described.

---

## Scene 5 — Six statements, read automatically (2:20–2:55)

**On screen:** `DocumentUploader` — drag the six monthly PDFs in deliberately
shuffled. Each returns labelled with its own detected month. Drop a duplicate to
show the "Duplicate month" chip.

**Voiceover:**

> Now the documents. Six months of bank statements.
>
> They go in out of order. Each one comes back labelled with the month the
> system read out of the file itself — not from the filename. Repeat a month and
> it says so. Skip one and it refuses to continue.
>
> This is genuine text extraction. Separate parsers for DBS, OCBC, Maybank and
> UOB, because every bank lays its statements out differently. Credits and
> debits are told apart by tracking the running balance down the page.

---

## Scene 6 — The approver's view (2:55–3:45)

**On screen:** `CreditApproverDashboard` queue with live metric tiles, then one
continuous scroll through `CreditDecisionWorkbench`: Financial Indicators, the
Existing Debt panel, `TamperingDetailsPage` with its four flag types.

**Voiceover:**

> Here is the other half of the product: the approver's queue, and behind it,
> the decision workbench.
>
> Revenue, annualised from the statements. Debt service coverage. A
> probability-of-default band. Every number traceable to a document you can open
> right here.
>
> Then this panel. The applicant declared no existing loans. The engine found a
> payment going out to another lender in all six months, and flagged it.
> Undeclared debt, caught by arithmetic.
>
> And this one looks for credit kiting — money cycled in to make revenue look
> bigger than it is. Round-number transfers. Cash that leaves again days later.
> Deposits timed just before the statement closes. Every flag names the
> transaction that triggered it.

---

## Scene 7 — Decision, with a human at the end (3:45–4:20)

**On screen:** The "Final Assessment Summary" panel — the AI decision chip,
rationale, positive and negative factors. Then the approver's Approve / Reject
controls, then `CreditApproverHistory`.

**Voiceover:**

> All of that feeds a rules engine that returns approve, reject, or refer for
> review. Blacklisted industries and failed bureau grades are hard stops. Thin
> debt coverage or a kiting flag sends it to a human.
>
> Alongside it, a language model reads the same case file and writes a second
> opinion — a decision, a rationale, the factors for and against.
>
> But the approver decides. The system recommends and shows its work; a person
> signs, and every decision is logged.

---

## Scene 8 — The bigger idea (4:20–5:00)

**On screen:** `AccountingDashboard` — the Bukku accounting software. Wait for
the UOB campaign modal to appear on its own. Financing Portal step 1 (NACE
cascade), step 2 (the six named data items). Then the two-step progress bar
beside the four-step one.

**Voiceover:**

> One last thing — the part we would build next.
>
> This is not a bank website. It is accounting software, where a small business
> already keeps its books. Wait a moment, and the loan offer comes to them.
>
> They pick their industry, see exactly which six pieces of data would be
> shared, and consent. From there the application is two steps instead of four,
> and they upload nothing — the statements arrive through the partner. That feed
> is simulated here, but everything downstream is real.
>
> That is the shift. Not a faster form. Credit that reaches the business where
> it already works.

---

## Filming notes

- **Seed first.** `.venv/bin/python -m scripts.seed_demo` gives the approver
  queue a populated portfolio. There are already 39 applications in
  `innovation_challenge.db`.
- **Pick your case.** Nexus → approve, Vortex → review, Orion → reject. Scenes
  3–7 assume Nexus; Scene 6's caught-debt beat needs a case where the applicant
  declared "NIL".
- **The LLM panel takes 5–10 seconds** and needs `HF_TOKEN` (already in `.env`).
  Free tier is 30 requests/day — don't burn them on rehearsals. Without it the
  panel shows the rules-engine reason instead, which is a fine shot too.
- **Do not read from either README on camera.** Both still describe the older
  OCR command-line tool. `docs/BUILD_OVERVIEW.md` is the accurate reference.
- **Claims kept honest on purpose:** the bureau grade is random per call, the
  ACRA/litigation/IC checks return fixed values, and the Bukku feed is six
  static PDFs re-uploaded by the browser. The script never says otherwise —
  saying "simulated" out loud costs nothing and protects everything else.

---

## If you need a shorter cut

For a 3-minute version, drop Scene 4 (guarantors) to two sentences and merge
Scenes 5 and 6. Keep Scene 1, the caught-debt beat in Scene 6, and Scene 8 —
those three are what people remember.
