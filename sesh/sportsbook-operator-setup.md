# Sesh — sportsbook-only operator setup

Decision document: licensing, business structure, crypto banking, and a firm
sportsbook provider recommendation for a bootstrapped, crypto-first, sportsbook-only book.

All figures are indicative, drawn from public 2026 sources listed at the end. Every
number that matters here is quote-based in practice — treat these as the budget you
open negotiations with, not the invoice you will receive.

Nothing in this document proposes operating without a licence, misrepresenting the
business to a financial institution, or serving a market where doing so is an offence.
The "grey area" here is jurisdictional arbitrage plus disciplined geo-blocking, which
is how essentially every offshore book operates, and it is compliant. The boundaries
that cannot be skirted are flagged explicitly in §7.

---

## 0. Where the code lives

There is no GitHub repo for `sesh-sooty.vercel.app`.

- Vercel project `sesh` (`prj_zJczttqLP7JxKduRP9FqHl2w9zv1`), team **Golden ratio**
  (`team_vB3wbEdLSw3nMF7B2mIZb6Xu`), created 2026-09. `link: null` — deployed direct
  from local, never connected to git.
- Sibling project `seshbook` (`prj_zbBCIeGrt7GTl1hZuWQ6ouddvjpc`), also unlinked.
- The whole site is one self-contained `index.html` — no build step, no dependencies.

**Action:** get it into version control before it is edited again. There is currently
one copy of this file and it is on somebody's laptop.

---

## 1. The finding that changes the plan

**Sportsbook-only does not make the licence cheaper.**

Anjouan, Curaçao and Costa Rica all issue a *single* licence covering sportsbook,
casino, poker and crypto together. There is no cheaper sportsbook-only tier to drop
down to — unlike Malta, none of these jurisdictions charges per vertical.

So "focus down on sportsbook only" is a **product and go-to-market decision, not a
cost saving**. It costs exactly the same to be licensed for both. That has two
consequences:

1. Take the licence that covers both anyway. Ship sportsbook only. Keep casino as a
   switch you can flip in week 20 without re-licensing.
2. Understand what you are giving up by not flipping it: sportsbook holds roughly
   3–8% of turnover, casino holds far more and holds it *predictably*. A pure book is
   low-margin, high-variance, and needs real volume before the maths works. Most
   crypto books that look like sportsbooks make their money on the casino tab.

This is the one place I would push back on the brief. The rest of this document
assumes you have heard that and still want sportsbook-first — which is a defensible
call, because sportsbook is what acquires the audience and casino is what monetises
it later.

---

## 2. Licensing — recommendation: **Anjouan**

### The comparison

| | **Anjouan** | **Curaçao (LOK)** | **Costa Rica** |
|---|---|---|---|
| What it is | Real gaming licence | Real gaming licence | **Not a gaming licence** |
| Year 1 all-in | €22,000–25,000 | €70,000–110,000 | US$10,000–20,000 |
| Annual after | €17,000 | €47,450 | US$1,000–2,500 |
| GGR tax | 0% | 0% | 0% |
| Timeline | 4–8 weeks | Months | 4–8 weeks |
| Local substance | None required | Local director, real office, decisions made in Curaçao | Local company |
| Covers sportsbook | Yes, plus casino/poker/crypto | Yes | N/A |
| PSPs will onboard you | Specialist iGaming PSPs only | Broadly | **Mostly no** |

### Recommendation

**Direct Anjouan licence, held by an Anjouan IBC.** ~€17,000/year at base
(€13,300 licence + €1,700 ISP monitoring + €2,000 compliance officer/key person
authorisation), €22,000–25,000 in year one once IBC formation is included. 4–8 weeks.
No residency requirement on the UBO or director.

Take the **direct licence, not a sublicence**. Sublicences are cheaper up front and
leave you as a tenant of someone else's compliance record — if the master licensee
has a problem, you have a problem, and you cannot move your PSP relationships.

### Why not Costa Rica, even though it is cheapest

Costa Rica is the genuine grey-area play and it is worth understanding precisely why
it fails here. Costa Rica does not issue gambling licences at all. Operators register
a local company and hold a **municipal data-processing permit** (*licencia de
procesamiento de datos*), ~US$3,000–4,000, and operate under ordinary commercial law
on the basis that games of chance are prohibited under Law 3 of 1922 but the statute
is not enforced against operators who do not serve Costa Rican residents.

It is cheap and it is fast. The cost lands somewhere else:

- **You have nothing to show a counterparty.** Sportsbook engines, crypto PSPs, KYC
  vendors and EMIs all ask "which regulator?" A municipal data-processing permit is
  not an answer that passes KYB at Betby, CoinsPaid or any EMI worth having.
- **No domestic banking.** No transactions through Costa Rican banks, no services to
  Costa Rican residents.
- Serving a single Costa Rican resident converts the lawful data-processing company
  into a participant in prohibited gaming, and the permit is the first thing you lose.

Costa Rica is for operators who already have processing relationships and want a
cheap shell. For a first book that needs vendors to say yes, it is a false economy —
you save €15k on the licence and then cannot buy the engine.

### The honest case against Anjouan

You should go in knowing all three of these:

1. **Union-law tension.** Gambling is prohibited under the Comorian penal code at
   union level. Anjouan licenses under its own 2005 island legislation and autonomous
   authority. The relationship between the two is unresolved. In practice this affects
   how third parties treat you more than it affects the licence's day-to-day validity.
2. **Verification is patchy.** Licence-verification links have been reported returning
   404s, which players and affiliates notice.
3. **Mainstream payments will not touch it.** Stripe, Adyen, PayPal, the card schemes —
   all no. Build the payment architecture around iGaming specialists from day one and
   never plan around a mainstream processor changing its mind.

None of these are dealbreakers for a crypto-first book. All three are dealbreakers if
you were planning card deposits as the primary rail.

### Geo-blocking is the compliance spine

This is the compliant version of "skirting every boundary": you do not licence into
every market, you **decline** every market you are not licensed for, at the IP layer.

Block, at minimum: **United States, United Kingdom, Netherlands, France, Spain,
Austria, Germany, Australia, Comoros**, plus every FATF-blacklisted jurisdiction.
Keep the list in config, review it quarterly, and log the blocks — the log is the
evidence that the controls were real.

Two corollaries that people get wrong:

- **Geo-blocking is not just IP.** Payment-method geography, KYC document country and
  registration address all have to agree. An IP block with no document check is
  decoration.
- **Marketing is in scope.** Do not buy traffic into a blocked market, do not let
  affiliates do it, and put it in the affiliate terms with a clawback.

**Australia specifically.** The site prices in A$, which suggests an Australian
operator or Australian founders. Australia is on the block list and must stay there.
Under the Interactive Gambling Act 2001 it is an offence to provide online casino to
Australians, and online sports betting requires an Australian state or territory
licence — an offshore licence does not cover it, and the ACMA actively pursues and
site-blocks offshore operators taking Australian customers. There is no grey area
here to work, and this is the boundary most likely to bite you personally. See §7.

---

## 3. Business structure — two entities

```
        Founders (personal, tax-resident at home)
                        |
         +--------------+---------------+
         |                              |
   SERVICES CO                     ANJOUAN IBC
   (home jurisdiction              (the licensed operator)
    or Cyprus/UAE/BVI)
   - dev, design, marketing        - holds the gaming licence
   - support staff                 - holds the domain + brand
   - owns the Sesh codebase/IP     - holds PSP + player funds
   - invoices the IBC              - holds engine + data contracts
   - banks normally                - carries player liability
   - Zengo Business sits here      - geo-controls + KYC live here
```

### Why two

- **The operator stays thin.** The IBC holds the licence, the player liability and the
  vendor contracts. If the book fails, the failure is ring-fenced.
- **The services company banks like a normal business.** A software and marketing
  services company can hold an ordinary business account and an ordinary crypto
  treasury account. The gambling operator cannot. This is the single most useful thing
  the structure buys you.
- **Vendors get a clean counterparty.** Engine, odds feed and KYC contracts sit with
  the licensed entity, which is what their KYB expects.
- **It survives growth.** Adding a second brand means a second IBC under the same
  services company, not a rebuild.

### Setup order and cost

| Step | What | Cost | Time |
|---|---|---|---|
| 1 | Tax advice in your home jurisdiction **before anything else** | A$3,000–8,000 | 1–2 wks |
| 2 | Services company (or use an existing one) | A$0–2,000 | 1 wk |
| 3 | Anjouan IBC | included below | 1–2 wks |
| 4 | Anjouan licence application + compliance officer | €22,000–25,000 y1 | 4–8 wks |
| 5 | PSP + KYC vendor KYB (needs the licence) | — | 2–4 wks |
| 6 | Engine contract (needs the licence) | $5,000–15,000 setup | 2–4 wks |

Step 1 is first for a reason, and it is not a formality — see §7.

---

## 4. Crypto banking — split it into three jobs

The mistake is looking for one provider. There are three distinct jobs and no single
provider does all three for a gambling operator.

### Job 1 — Player deposits and withdrawals (the PSP)

This is not banking. It is a merchant processor that happens to handle crypto.

| Provider | Cost | Notes |
|---|---|---|
| **CoinsPaid** | ~1% per transaction | The iGaming standard. 20+ coins, custody, instant swaps, payouts, does fiat conversion. Runs real operator vetting — an Anjouan licence passes, nothing passes without one. |
| **NOWPayments** | 0.5–1% | Lighter onboarding, 300+ coins, non-custodial option available. Good fallback and good second rail. |
| **BTCPay Server** | $0 fees, ~$30/mo hosting | Self-hosted, you hold keys. BTC/Lightning first. Zero fees, but you own the key management and the theft risk. |

**Recommendation: CoinsPaid primary, NOWPayments as second rail.** Never run one
processor. The day CoinsPaid pauses your account for a review is the day you need
NOWPayments already integrated and tested, not the day you start the KYB.

### Job 2 — Treasury and operational float

This is where Zengo Business fits, and the placement matters.

**Zengo Business** is an MPC-secured self-custody wallet with role-based permissions,
multi-user approval workflows, batch transactions, a treasury dashboard and audit-ready
CSV export. Launched Sept 2025. Fiat rails come via **Iron.xyz** and **MoonPay virtual
accounts** for US and EU entities, with corporate cards via Wirex on the 2026 roadmap.
No seed phrase, which for a small team is a genuine operational-risk reduction.

**Recommendation: yes to Zengo Business — held by the SERVICES COMPANY, not the IBC.**

The reason is the fiat rail. Zengo's fiat leg runs through Iron and MoonPay, and their
KYB is not going to clear a licensed offshore gambling operator. Onboard the entity
they can actually approve — a software and marketing services company — and let the IBC
pay it in stablecoin for services rendered. That is an ordinary intercompany
arrangement, invoiced and documented, and it is the whole point of the two-entity
structure.

For the **operator's own** float, do not go looking for a wallet with a fiat rail.
Keep working balance in the CoinsPaid merchant account and reserve in self-custody
(multisig, 2-of-3, keys held separately). If you want the same MPC governance on the
IBC side that Zengo gives the services company, **MPCVault** is the closest equivalent
without the fiat-rail KYB dependency.

### Job 3 — Fiat off-ramp for the operator

The hard one, and the part where honest expectation-setting matters most.

Named iGaming-tolerant options as of 2026:

- **Bankera** — crypto-friendly EMI, dedicated IBANs, multi-currency, explicitly strong
  risk appetite for iGaming. Best first call for a hybrid fiat+crypto operator.
- **Orbital** — fiat IBANs plus institutional USDT/USDC/BTC wallets. Built for exactly
  the hybrid crypto-book/PSP-settlement flow.
- **Moneybase** (Malta, MFSA) — onboards licensed and pre-licensed iGaming. Strongest
  if you ever move the structure into the EU.
- **Bank Frick** / **AMINA** (Liechtenstein/Switzerland) — real crypto banks, realistic
  for gambling, but expect substance requirements and minimums a bootstrapped book will
  struggle with in year one. Revisit at scale.

**Do not bother with:** Clear Junction (publicly lists gambling under "do not accept",
and banks payment firms rather than operators), and every mainstream neobank — Wise,
Revolut Business, Mercury, Airwallex, Stripe. They will offboard a gambling operator on
discovery, freeze the balance during the review, and they are not wrong to.

**This is a hard boundary, not a grey area:** do not describe the business as anything
other than what it is on a KYB form. Misrepresenting your business model to a regulated
financial institution to obtain an account is fraud in every jurisdiction that matters,
it is the single most common way small operators lose everything at once, and it is not
recoverable. Get a "no" from ten providers honestly and take the eleventh. The list
above exists precisely so you do not have to lie to anyone.

### The recommended stack

| Layer | Provider | Held by |
|---|---|---|
| Player deposits/withdrawals | CoinsPaid (+ NOWPayments backup) | Anjouan IBC |
| Operator working float | CoinsPaid merchant balance | Anjouan IBC |
| Operator cold reserve | Self-custody multisig (or MPCVault) | Anjouan IBC |
| Company treasury + fiat off-ramp | **Zengo Business** | Services company |
| Operator fiat IBAN (when needed) | Bankera or Orbital | Anjouan IBC |
| Card on-ramp (optional, later) | Mercuryo | Anjouan IBC |

Card on-ramps stay optional and stay late. A crypto-native audience deposits from
wallets and exchanges at 0% cost to you on day one. A card ramp costs 3–5% and drags
your entire compliance surface into card-scheme territory. Add it when the funnel data
says casual players are bouncing at deposit, not before.

---

## 5. Sportsbook provider — firm recommendation: **Betby**

### The filter

For a bootstrapped, crypto-first, Anjouan-licensed, sportsbook-only book, the provider
must clear five bars:

1. Will onboard an **Anjouan** licence
2. Setup under ~$15,000
3. **Revenue share, not a large monthly minimum** — this is the one that actually
   decides it
4. Crypto-native operator base
5. Sportsbook is their core product, not a module bolted to a casino platform

### The recommendation

**Primary: Betby (betby.gg).** Sportsbook-only specialist with a crypto-native
operator base. Its differentiator is operational control that matters to a small book
— precise market suspension and closure tied to live event status, which is what keeps
settlement outcomes consistent and stops a thin-staffed book getting picked off in
running. Integrates as iframe or API in weeks, not months. Revenue-share model.

**Negotiate against: Altenar.** The other genuinely sportsbook-pure option (Isle of
Man, in-house sportsbook module, founded 2011). Stronger in regulated markets, which
cuts both ways — it means better product governance and it means their KYB may prefer a
better licence than Anjouan. Run both processes in parallel; the quote you get from one
is the leverage you have on the other.

**Budget floor if both minimums are too high:** BetConstruct publishes ~€10–15k turnkey
setup at roughly 10–30% revenue share, which is the most transparent entry pricing in
the market. NuxGame ($10–30k setup) and UltraPlay are the other realistic fallbacks,
both crypto-capable.

### What not to do

**Do not take a casino-first platform** — SoftSwiss, SoftGamings, Slotegrator — for a
sportsbook-only book. Their sportsbook is a module, and in SoftSwiss's case the Betby
module carries its own revenue share **stacked on top of** the platform share. You end
up paying two rev shares for one product you are not fully using. If you later flip the
casino switch, revisit this; today it is the wrong shape.

**Do not build the engine.** Ground-up placement, live pricing, risk and settlement is
4–6+ months and six figures, with a daily trading operation attached forever. Settlement
edge cases alone are a career. Own the brand, the players and the platform; rent the
engine. This is already the position on the Sesh landing page and it is correct.

### Negotiation playbook

Public pricing is thin because everything is quote-based. Go in asking for:

- **No monthly minimum for the first 6 months**, stepping in after. This is the single
  highest-value ask for a bootstrapped book and it is frequently granted, because the
  provider's marginal cost of carrying you is near zero.
- **Revenue share calculated on NGR after PSP fees**, not on gross. The difference is
  ~1% of turnover — material at low margin.
- **Setup fee deferred or amortised** across the first 12 months.
- **Margin control in your hands** where the provider allows it. Your edge as a
  brand-led book is pricing sharper than the incumbents on the events your audience
  actually cares about.
- **A clean exit clause** — 90 days' notice, player data portable, no lock-in past
  24 months. Assume you will want to move in year two.
- Ask directly, in writing, in the first call: **"do you onboard Anjouan-licensed
  operators?"** Ask before you pay for the licence if you can. A yes in email is worth
  more than any of the above.

---

## 6. Budget and 90-day plan

### Year-one budget

| Line | Cost |
|---|---|
| Tax and legal advice (home jurisdiction) | A$3,000–8,000 |
| Anjouan IBC + licence, year one | €22,000–25,000 |
| Anjouan renewal, year two onward | €17,000/yr |
| Platform build (per Sesh pricing, full package worst case) | A$16,000 |
| Sportsbook engine setup | US$5,000–15,000 |
| Odds/results feed, if separate | US$30–800/mo |
| Crypto PSP | 0.5–1% of volume |
| KYC checks | ~US$1–2 per verification |
| Hosting and CDN | US$100–300/mo |
| **Subtotal, ex-bankroll** | **≈ A$70,000–120,000** |
| **Player bankroll / float** | **US$50,000–150,000+** |

**The bankroll is the real capital requirement and nobody's pricing page mentions it.**
A sportsbook must be able to pay every winner on the worst weekend of the season, before
settlement, before the next deposit lands. Undercapitalised books do not fail because
the software broke — they fail because a favourite-heavy Saturday cleaned out the float
and withdrawals started queuing. Queued withdrawals kill a crypto brand in 48 hours,
because the community talks. Budget the float first and treat it as untouchable.

### 90 days

| Weeks | Track |
|---|---|
| 1–2 | Tax advice. Services company. Get the Sesh codebase into a repo. Written "do you take Anjouan?" from Betby and Altenar. |
| 2–4 | Anjouan IBC formation. Licence application filed. Compliance officer appointed. |
| 4–8 | Licence in flight. Engine contract negotiated and signed. CoinsPaid + NOWPayments KYB started. KYC vendor selected. Build starts against the engine sandbox. |
| 8–10 | Licence issued. PSP live. Geo-block list implemented and logged. Zengo Business onboarded under the services company. |
| 10–12 | Soft launch, capped stakes, invite-only. Watch settlement accuracy and withdrawal latency above all else. |
| 12+ | Lift caps. Open marketing into non-blocked markets only. |

### Changes to the landing page

The site currently sells "sportsbook **and casino**". If the position is sportsbook-only,
the copy needs a pass: the hero sub, the "Two ways to build it" lede, the build-fee line
item "Sportsbook + casino template site", and the footer all reference casino. Keep the
licence covering both; just stop selling both.

---

## 7. What I would push back on

Four things, in order of how likely they are to hurt.

**1. Australia.** The A$ pricing points at Australian founders. Australia is blocked and
stays blocked, and unlike the other items on the block list there is no structuring
around it. The Interactive Gambling Act 2001 makes providing online casino to Australians
an offence; online sports betting requires an Australian state or territory licence and
an Anjouan licence does not substitute. The ACMA pursues and site-blocks offshore
operators taking Australian customers, and enforcement reaches individuals, not just
entities. Taking Australian players is the one decision in this document that could
attach personally to you. Do not take Australian players, do not let affiliates send
them, and do not accept "they used a VPN" as an answer — check documents, not just IPs.

**2. Personal tax residence follows you.** An Anjouan IBC does not make its profits
untaxed to an Australian-resident controller. Australia's controlled foreign company
rules can attribute the IBC's income to you personally whether or not it is distributed,
and non-disclosure of control of a foreign company is where offshore structures actually
come apart. Structure it properly, declare it, pay what is owed on the services income
at home. This is why tax advice is step 1 and not step 6 — A$5,000 spent here is the
highest-return line in the whole budget.

**3. Anjouan's durability.** You are building on a licence whose legal foundation is
contested at union level and whose verification infrastructure is unreliable. It is the
right call today on cost and speed. Treat it as a two-to-three-year position, not a
permanent one: keep the corporate structure portable, avoid vendor contracts that tie to
the jurisdiction, and revisit Curaçao or an EU licence the moment revenue supports the
€70–110k.

**4. Sportsbook-only economics.** Covered in §1. Low margin, high variance, volume
business. The licence covers casino anyway. I would ship sportsbook-first as planned and
hold the casino switch as the monetisation lever for month six, rather than ruling it out
now.

---

## Sources

Licensing:
[Anjouan vs Curaçao comparison (iGaming Compliance)](https://www.igamingcompliance.blog/curacao-vs-anjouan-gaming-licence-in-2026-an-honest-comparison/) ·
[Offshore gaming licences compared (Point Legal)](https://www.thepointlegal.com/guides/offshore-gaming-licences-compared) ·
[Curaçao licence cost and LOK framework (Point Legal)](https://www.thepointlegal.com/guides/curacao-gaming-licence) ·
[Gambling licence costs, all jurisdictions (Track360)](https://track360.io/blog/gambling-license-cost-comparison-all-jurisdictions-2026) ·
[Anjouan licence guide (SOFTSWISS)](https://www.softswiss.com/knowledge-base/anjouan-igaming-licence-guide/) ·
[Anjouan restricted countries and payment realities (Gambling Law Index)](https://gamblinglawindex.com/knowledge/anjouan-gambling-licence-restricted-countries-payment-realities-2026/) ·
[Anjouan structuring lessons (Global Law Experts)](https://globallawexperts.com/the-anjouan-gaming-licence-what-weve-learned-from-structuring-dozens-of-offshore-gambling-operations/) ·
[Costa Rica: what nobody tells you (Legarithm)](https://legarithm.io/services/costa-rica/licenses/gambling-licenses/) ·
[Costa Rica sportsbooks explained (Punter2Pro)](https://punter2pro.com/costa-rica-sportsbook-casino-licence/)

Banking and payments:
[Banking for iGaming: accounts, EMIs, treasury providers](https://igamingpaymentsolutions.com/banking) ·
[Banking for iGaming companies (Legarithm)](https://legarithm.io/igaming-banking-solutions/) ·
[iGaming bank accounts 2026 (Licence Gaming)](https://licencegaming.com/igaming/igaming-bank-account-2026-banks-that-work-with-operators/) ·
[Crypto gambling licence jurisdictions (Legarithm)](https://legarithm.io/crypto-gambling-license-2026/) ·
[Zengo Business](https://zengo.com/business/) ·
[Zengo Business with MoonPay virtual accounts and Iron (MoonPay)](https://www.moonpay.com/newsroom/moonpay-zengo-iron) ·
[Best crypto business accounts (Zengo)](https://zengo.com/best-crypto-business-account/)

Sportsbook providers:
[Top sportsbook software providers (TIG)](https://www.tigsportsbook.com/blog/best-sportsbook-software-providers/) ·
[Sportsbook software providers comparison (Limeup)](https://limeup.io/blog/sportsbook-software-providers/) ·
[Turnkey vs white-label operator guide (Track360)](https://track360.io/blog/turnkey-sportsbook-software-operator-guide) ·
[Real cost structure of sportsbook platforms, build vs buy](https://dev.to/nexxgames/the-real-cost-structure-of-sportsbook-platforms-in-2026-build-vs-buy-18no) ·
[Platform pricing models (Smartbet)](https://smartbet.llc/blog/typical-pricing-models-for-sports-betting-platforms) ·
[Cost to start a betting website (LSports)](https://www.lsports.eu/blog/how-much-to-start-a-gambling-betting-website/)
