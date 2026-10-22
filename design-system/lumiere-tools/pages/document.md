# Override: printable documents (receipt, invoice, quotation, PromptPay card)

Overrides `MASTER.md` for anything that leaves the app as paper, PDF or an image sent in chat.
The surrounding tool UI still follows Master (dark glass); only the document surface changes.

## Why a light surface

Documents are printed, forwarded in LINE and opened on other people's devices. A dark, translucent
surface prints poorly, wastes toner and loses contrast in screenshots. The document is therefore an
opaque white sheet; the brand carries through the warm ink colour and the gold accent rule.

## Tokens (document only)

| Role | Value | Contrast on #FFF | Use |
|---|---|---|---|
| Paper | `#FFFFFF` | — | Sheet background, always opaque |
| Ink | `#1C1917` (stone-900, same as Master primitive) | 17.5:1 | Titles, totals, table header fill |
| Body | `#1F2937` | 14.7:1 | Body text |
| Secondary | `#4B5563` | 7.6:1 | Addresses, meta, captions (≥ 12.5px) |
| Muted label | `#6B7280` | 4.8:1 | Uppercase field labels only |
| Rule | `#E5E7EB` | decorative | Row dividers |
| Accent | `#A8843F` (gold-600) | 3.5:1 — **non-text only** | Left rule on the amount-in-words block |
| Accent wash | `#F6F1E6` | — | Background of amount-in-words |
| PromptPay navy | `#0B1F3A` | 16.5:1 | PromptPay card header and QR modules |

Gold is never used for text on paper (gold-600 is only 3.5:1 on white).

## Layout

- A4 at 96 dpi: 794 × 1123 px, 64 / 60 px margins. Preview scales the sheet to the panel width with
  `transform: scale()`; export renders an unscaled clone off-screen at 2× for crisp PDF/PNG.
- Header: seller block left, document title + number + dates right, 3 px ink rule below.
- Items table: ink header row, right-aligned tabular numbers, first column centred row number.
- Totals right (280 px), amount-in-words + notes + payment (bank / PromptPay QR) left.
- Signature lines at the foot, two columns.
- Font: IBM Plex Sans Thai (Thai + Latin in one face), falling back to Sarabun / system.

## QR codes

- Quiet zone of 4 modules, navy modules on white, `image-rendering: pixelated` so scanners read it
  after scaling. Minimum rendered size 110 px on paper, 200 px on screen.
- Amount and payee shown as text beside/below the QR — never rely on the QR alone. ID is masked
  (`081-xxx-5678`) on shared images.

## Interaction rules carried from Master

- Every field has a visible label; validation messages sit directly under the field
  (`aria-describedby`), e.g. PromptPay ID length / checksum.
- Saving a document records the issued number; “เลขที่ถัดไป” always gives last issued + 1.
- Destructive actions (delete row with data, reset trip, restore backup) confirm first; restore
  offers a one-step undo.
