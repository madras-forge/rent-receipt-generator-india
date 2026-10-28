/*
 * Pure receipt helpers shared by the browser app and Node tests.
 * This is a classic script so index.html still works when opened directly.
 * These functions never read the DOM, store personal data, or make requests.
 */
const ReceiptUtils = (() => {
  "use strict";

  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const SHORT_MONTH_NAMES = MONTH_NAMES.map((month) => month.slice(0, 3));
  const MAX_AMOUNT = 999999999.99;

  function toIsoDate(date) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")].join("-");
  }

  // Parse calendar dates locally: UTC conversion can shift an Indian rent date.
  function parseDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day, 12);
    return toIsoDate(date) === value ? date : null;
  }

  function formatDate(value, fallback = "Date pending") {
    const date = parseDate(value);
    return date ? date.toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    }) : fallback;
  }

  function monthLabel(key) {
    const date = parseDate(`${key}-01`);
    return date ? `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}` : "Month pending";
  }

  function monthPeriod(key) {
    const start = parseDate(`${key}-01`);
    if (!start) throw new Error("Expected a calendar month in YYYY-MM format.");
    return {
      from: toIsoDate(start),
      to: toIsoDate(new Date(start.getFullYear(), start.getMonth() + 1, 0, 12)),
    };
  }

  // Each picker covers one Indian financial year, including its March boundary.
  function financialYearMonths(startYear) {
    if (!Number.isInteger(startYear) || startYear < 1900 || startYear > 2199) return [];
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(startYear, index + 3, 1, 12);
      return toIsoDate(date).slice(0, 7);
    });
  }

  function advanceMonth(value) {
    const date = parseDate(value);
    if (!date) return "";
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const nextLastDay = new Date(date.getFullYear(), date.getMonth() + 2, 0).getDate();
    const day = date.getDate() === lastDay ? nextLastDay : Math.min(date.getDate(), nextLastDay);
    return toIsoDate(new Date(date.getFullYear(), date.getMonth() + 1, day, 12));
  }

  function receiptNumberAt(base, offset) {
    const value = String(base || "").trim();
    const match = value.match(/(\d+)$/);
    if (!match) return `${value || "RN"}-${String(offset + 1).padStart(3, "0")}`;
    const next = String(Number(match[1]) + offset).padStart(match[1].length, "0");
    return value.slice(0, -match[1].length) + next;
  }

  function toCents(value) {
    if (value === "" || value === null || value === undefined) return null;
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0.01 || amount > MAX_AMOUNT) return null;
    const cents = Math.round(amount * 100);
    return Math.abs(cents / 100 - amount) < 0.0000001 ? cents : null;
  }

  function formatMoney(value) {
    const number = Number(value);
    return new Intl.NumberFormat("en-IN", {
      style: "currency", currency: "INR", minimumFractionDigits: 2,
    }).format(Number.isFinite(number) ? number : 0);
  }

  function smallNumberInWords(number) {
    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
      "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    let text = "";
    if (number >= 100) {
      text = `${ones[Math.floor(number / 100)]} Hundred `;
      number %= 100;
    }
    return (text + (number < 20 ? ones[number] : `${tens[Math.floor(number / 10)]} ${ones[number % 10]}`)).trim();
  }

  function amountInWords(value) {
    if (value === "" || Number(value) === 0) return "Zero Rupees Only";
    const cents = toCents(value);
    if (cents === null) return "Enter a valid amount";
    let rupees = Math.floor(cents / 100);
    const paise = cents % 100;
    const parts = [];
    for (const [divisor, label] of [[10000000, "Crore"], [100000, "Lakh"], [1000, "Thousand"]]) {
      if (rupees >= divisor) {
        parts.push(`${smallNumberInWords(Math.floor(rupees / divisor))} ${label}`);
        rupees %= divisor;
      }
    }
    if (rupees) parts.push(smallNumberInWords(rupees));
    return `${parts.join(" ") || "Zero"} Rupees${paise ? ` and ${smallNumberInWords(paise)} Paise` : ""} Only`;
  }

  // This checks structure only. No issuance, check-letter or ownership lookup occurs.
  function panFormatError(value) {
    if (!value) return "";
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value)) {
      return "Enter 5 letters, 4 digits and 1 final letter, e.g. ABCPS1234F (illustrative only).";
    }
    if (!"ABCFGHJLPT".includes(value[3])) {
      return "Check the fourth PAN character: P is for an individual; A, B, C, F, G, H, J, L and T identify other holder types.";
    }
    return value.slice(5, 9) === "0000" ? "The four PAN digits must be from 0001 to 9999; 0000 is not valid." : "";
  }

  function monthToken(value) {
    const date = parseDate(value);
    return date ? SHORT_MONTH_NAMES[date.getMonth()] + String(date.getFullYear()).slice(-2) : "";
  }

  // Use the earliest/latest rent dates, never the payment date or tenant's identity.
  function pdfFilename(receipts) {
    const starts = receipts.map((receipt) => receipt.from).filter(parseDate).sort();
    const ends = receipts.map((receipt) => receipt.to).filter(parseDate).sort();
    if (!starts.length || !ends.length) return "Rent_Receipt.pdf";
    const first = monthToken(starts[0]);
    const last = monthToken(ends[ends.length - 1]);
    return `Rent_Receipt_${first}${first === last ? "" : `-${last}`}.pdf`;
  }

  return Object.freeze({
    MAX_AMOUNT, toIsoDate, parseDate, formatDate, monthLabel, monthPeriod,
    financialYearMonths, advanceMonth, receiptNumberAt, toCents, formatMoney,
    amountInWords, panFormatError, pdfFilename,
  });
})();

// Optional CommonJS export lets contributors run tests without a bundler.
if (typeof module !== "undefined" && module.exports) module.exports = ReceiptUtils;
