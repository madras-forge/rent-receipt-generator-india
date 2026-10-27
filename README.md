[**Create your rent receipt →**](https://madras-forge.github.io/rent-receipt-generator-india/)  https://madras-forge.github.io/rent-receipt-generator-india/

# Rent Receipt Generator – India

Create Indian rent receipts with a live preview and print or save them as PDF.

## Why this tool exists

Millions of Indian salaried tenants need rent receipts every year for HRA claims. Most existing tools are ad-heavy, ask for sign-ups, or upload your data. This tool is free, private, and runs in the browser.

## Features

- Indian currency formatting and amounts in words
- UPI, bank transfer, cash and cheque payments
- PAN format checks, automatic suggestions and opt-out
- Signature line, optional stamp space and next-month receipts

## Screenshot

![Rent receipt form and completed sample receipt](docs/screenshot.png)

## Run locally

1. Download or clone the repository.
2. Open `index.html` in a browser (`dist/index.html` in the authoring checkout).

No installation, server or build step is needed.

## Usage

1. Enter the tenant, landlord, property and payment details.
2. Review the PAN suggestion and receipt preview.
3. Complete required fields, then select **Print / Save PDF**.

## Tax and PAN guidance

**Last verified: 2026-10-28**

- For employer/HRA documentation, landlord PAN is required when actual annual rent exceeds ₹1,00,000. [Official guidance](https://www.incometaxindia.gov.in/documents/d/guest/form-124-faqs)
- The automatic suggestion uses rent × 12. Adjust the annual total if needed; opting out does not waive employer requirements.
- PAN checks cover structure only, not issuance, the final check letter or ownership. [PAN structure guidance](https://www.incometaxindia.gov.in/documents/d/guest/1-permanent-account-number-pan-pdf)

## Privacy

Form details stay in the page's memory. No uploads, analytics or saved drafts. Refreshing or closing the page clears the form. Keep real personal data out of screenshots, issues and pull requests.

## Hosting

Upload `index.html`, `style.css` and `app.js` to the GitHub repository root.

Under **Settings → Pages**, choose **Deploy from a branch → main → / (root)** and save.

## Contributing

First-time contributors are welcome. Open an issue or submit a focused pull request describing your change and how you checked it. Include official sources for changes to tax or state guidance.

## Roadmap

- Expand verified state-specific guidance
- Generate receipts for multiple months
- Improve accessibility and add Indian-language interfaces

## Limitations

- State-specific guidance is incomplete; check applicable requirements.
- The tool does not verify payments, identities or signatures, or calculate HRA eligibility.
- A stamp box is only a placeholder and does not pay stamp duty.
- Review the PDF or print preview before use.

**Disclaimer:** This is a general receipt, not legal or tax advice or a prescribed statutory form.
