import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { csvLine, parseCsv } from "../../../src/lib/csv.js";
import { financialYear, splitGst, stateCodeFor, stateName, GSTIN_PATTERN } from "../../../src/lib/gst.js";
import { DAY_NAMES, formatHours, isOpenNow, localNow, localToday, todayHoursLabel, type HoursRow } from "../../../src/lib/hours.js";
import { entitlementsFor, planCodeForEntitlements, planTier } from "../../../src/lib/plans.js";
import { pageMeta, paginationSchema } from "../../../src/lib/pagination.js";
import { num, toPlain } from "../../../src/lib/serialize.js";
import { idParam, parse } from "../../../src/lib/validate.js";
import { z } from "zod";
import {
  badRequest, billingDetailsRequired, conflict, emailUnverified, forbidden, HttpError, notConfigured, notFound, unauthorized, upgradeRequired,
} from "../../../src/lib/errors.js";
import { email, httpUrl, normalizePhone, optionalPhone, optionalUrl, password, personName, phone, pincode } from "../../../src/lib/rules.js";

describe("csv", () => {
  it("parses quoted fields, escaped quotes, CRLF, BOM and drops blank rows", () => {
    const text = '﻿name,note\r\n"Sharma, TV","said ""hi""\nthere"\n\n,\nlast,row';
    expect(parseCsv(text)).toEqual([
      ["name", "note"],
      ["Sharma, TV", 'said "hi"\nthere'],
      ["last", "row"],
    ]);
  });
  it("keeps a trailing row without a newline and handles a lone CR", () => {
    expect(parseCsv("a,b\rc,")).toEqual([["a", "b"], ["c", ""]]);
    expect(parseCsv("")).toEqual([]);
  });
  it("treats a quote inside an unquoted field as text", () => {
    expect(parseCsv('ab"c')).toEqual([['ab"c']]);
  });
  it("writes lines with quoting, dates, nulls and formula protection", () => {
    const d = new Date("2026-01-02T03:04:05.000Z");
    expect(csvLine(["a", null, undefined, 3, d, 'x"y', "a,b", "=SUM(A1)", "-1", "+1", "@x", "\tx", "l\nb"])).toBe(
      `a,,,3,${d.toISOString()},"x""y","a,b",'=SUM(A1),'-1,'+1,'@x,'\tx,"l\nb"\r\n`,
    );
    expect(csvLine(["\rx"])).toBe(`"'\rx"\r\n`);
  });
});

describe("gst", () => {
  it("maps codes and names", () => {
    expect(stateName("27")).toBe("Maharashtra");
    expect(stateName("99")).toBeNull();
    expect(stateName(null)).toBeNull();
    expect(stateCodeFor("  jammu & kashmir ")).toBe("01");
    expect(stateCodeFor("Nowhere")).toBeNull();
    expect(stateCodeFor(undefined)).toBeNull();
    expect(GSTIN_PATTERN.test("27ABCDE1234F1Z5")).toBe(true);
  });
  it("computes the financial year around April", () => {
    expect(financialYear(new Date("2026-09-25T00:00:00Z"), "Asia/Kolkata")).toBe("2026-27");
    expect(financialYear(new Date("2026-03-31T12:00:00Z"), "Asia/Kolkata")).toBe("2025-26");
    expect(financialYear(new Date("2099-06-01T00:00:00Z"), "UTC")).toBe("2099-00");
  });
  it("splits intra and inter state tax", () => {
    expect(splitGst(118, 18, true)).toEqual({ taxable: 100, cgst: 9, sgst: 9, igst: 0 });
    expect(splitGst(118, 18, false)).toEqual({ taxable: 100, cgst: 0, sgst: 0, igst: 18 });
    expect(splitGst(599, 18, true)).toEqual({ taxable: 507.63, cgst: 45.69, sgst: 45.68, igst: 0 });
  });
});

describe("hours", () => {
  // 2026-09-28 is a Monday. 04:30 UTC = 10:00 IST.
  const mondayTen = new Date("2026-09-28T04:30:00Z");
  const row = (dayOfWeek: number, openTime: string | null, closeTime: string | null, is24x7 = false): HoursRow => ({ dayOfWeek, openTime, closeTime, is24x7 });

  it("reads local day and time", () => {
    expect(localNow(mondayTen)).toEqual({ day: 1, time: "10:00" });
    expect(localNow(new Date("2026-09-28T18:30:00Z"))).toEqual({ day: 2, time: "00:00" });
    expect(localNow().day).toBeGreaterThanOrEqual(0);
    expect(DAY_NAMES[1]).toBe("Monday");
  });
  it("gives today's local date as UTC midnight", () => {
    expect(localToday(0, new Date("2026-09-28T20:00:00Z")).toISOString()).toBe("2026-09-29T00:00:00.000Z");
    expect(localToday(-1, mondayTen).toISOString()).toBe("2026-09-27T00:00:00.000Z");
    expect(localToday()).toBeInstanceOf(Date);
  });
  it("decides whether a business is open", () => {
    expect(isOpenNow([], mondayTen)).toBe(false);
    expect(isOpenNow([row(3, null, null, true)], mondayTen)).toBe(true);
    expect(isOpenNow([row(1, "09:00", "18:00")], mondayTen)).toBe(true);
    expect(isOpenNow([row(1, "11:00", "18:00")], mondayTen)).toBe(false);
    expect(isOpenNow([row(1, null, null)], mondayTen)).toBe(false);
    expect(isOpenNow([row(2, "09:00", "18:00")], mondayTen)).toBe(false);
    // Overnight window opened today
    expect(isOpenNow([row(1, "08:00", "02:00")], mondayTen)).toBe(true);
    expect(isOpenNow([row(1, "20:00", "02:00")], mondayTen)).toBe(false);
    // Yesterday's overnight window still running at 01:00 Monday IST
    const mondayOne = new Date("2026-09-27T19:30:00Z");
    expect(isOpenNow([row(0, "20:00", "02:00")], mondayOne)).toBe(true);
    expect(isOpenNow([row(0, "20:00", "00:30")], mondayOne)).toBe(false);
    expect(isOpenNow([row(0, "09:00", "18:00")], mondayOne)).toBe(false);
    expect(isOpenNow([row(0, null, "02:00")], mondayOne)).toBe(false);
    expect(isOpenNow([row(1, "09:00", "18:00")])).toEqual(expect.any(Boolean));
  });
  it("formats hours", () => {
    expect(formatHours(undefined)).toBe("Closed");
    expect(formatHours(row(1, null, null, true))).toBe("Open 24 hours");
    expect(formatHours(row(1, "09:00", null))).toBe("Closed");
    expect(formatHours(row(1, "00:00", "12:30"))).toBe("12 AM - 12:30 PM");
    expect(formatHours(row(1, "09:05", "18:00"))).toBe("9:05 AM - 6 PM");
    expect(todayHoursLabel([row(4, null, null, true)], mondayTen)).toBe("Open 24 hours");
    expect(todayHoursLabel([row(1, "09:00", "18:00")], mondayTen)).toBe("9 AM - 6 PM");
    expect(todayHoursLabel([])).toBe("Closed");
  });
});

describe("plans", () => {
  it("maps codes and entitlements", () => {
    expect(entitlementsFor("business")).toEqual(["provider_pro", "provider_business"]);
    expect(entitlementsFor(null)).toEqual([]);
    expect(entitlementsFor("weird")).toEqual([]);
    expect(planCodeForEntitlements(["provider_business"])).toBe("business");
    expect(planCodeForEntitlements(["provider_pro"])).toBe("pro");
    expect(planCodeForEntitlements([])).toBe("free");
    expect(planTier("pro")).toBe("pro");
    expect(planTier("business")).toBe("business");
    expect(planTier("free")).toBeNull();
  });
});

describe("pagination", () => {
  it("parses and describes pages", () => {
    expect(paginationSchema.parse({})).toEqual({ page: 1, pageSize: 12 });
    expect(pageMeta(2, 10, 0)).toEqual({ page: 2, pageSize: 10, total: 0, totalPages: 1 });
    expect(pageMeta(1, 10, 21).totalPages).toBe(3);
  });
});

describe("serialize", () => {
  it("turns prisma values into plain JSON values", () => {
    const d = new Date("2026-01-01T00:00:00Z");
    expect(toPlain(null)).toBeNull();
    expect(toPlain(undefined)).toBeUndefined();
    expect(toPlain({ id: 5n, at: d, price: new Prisma.Decimal("1.50"), list: [1n, "x"], skip: undefined, nested: { ok: true } })).toEqual({
      id: 5, at: d.toISOString(), price: 1.5, list: [1, "x"], nested: { ok: true },
    });
    expect(num(null)).toBeNull();
    expect(num(undefined)).toBeNull();
    expect(num(3n)).toBe(3);
    expect(num(new Prisma.Decimal("2.25"))).toBe(2.25);
    expect(num("7")).toBe(7);
  });
});

describe("validate", () => {
  it("parses or throws a 400 with field details", () => {
    const schema = z.object({ a: z.string() });
    expect(parse(schema, { a: "x" })).toEqual({ a: "x" });
    expect(() => parse(schema, {})).toThrow(/a: Required/);
    expect(() => parse(z.string(), 1)).toThrow(/input: Expected string/);
    const noIssues = { safeParse: () => ({ success: false, error: { issues: [] } }) } as unknown as z.ZodTypeAny;
    expect(() => parse(noIssues, 1)).toThrow("Invalid input");
    expect(idParam("12")).toBe(12n);
    expect(() => idParam(12)).toThrow("Invalid id");
    expect(() => idParam("1a")).toThrow("Invalid id");
  });
});

describe("errors", () => {
  it("builds http errors", () => {
    expect(new HttpError(418, "tea").code).toBe("error");
    expect(badRequest("x", 1)).toMatchObject({ status: 400, code: "bad_request", details: 1 });
    expect(unauthorized()).toMatchObject({ status: 401, message: "Authentication required" });
    expect(forbidden()).toMatchObject({ status: 403 });
    expect(emailUnverified()).toMatchObject({ status: 403, code: "email_unverified" });
    expect(notFound()).toMatchObject({ status: 404, message: "Not found" });
    expect(conflict("dup")).toMatchObject({ status: 409 });
    expect(billingDetailsRequired()).toMatchObject({ code: "billing_details_required" });
    expect(notConfigured("no")).toMatchObject({ status: 501 });
    expect(upgradeRequired("pay", "provider_pro", "analytics")).toMatchObject({ status: 402, details: { entitlement: "provider_pro", feature: "analytics" } });
  });
});

describe("rules", () => {
  it("normalizes phone numbers", () => {
    expect(normalizePhone("+91 98765-43210")).toBe("+919876543210");
    expect(normalizePhone("09876543210")).toBe("+919876543210");
    expect(normalizePhone("(022) 2345 6789")).toBe("+912223456789");
    expect(normalizePhone("0123456789")).toBeNull();
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("abc")).toBeNull();
    expect(phone.parse(" 9876543210 ")).toBe("+919876543210");
    expect(phone.safeParse("123").success).toBe(false);
    expect(optionalPhone.parse("")).toBeNull();
    expect(optionalPhone.parse(null)).toBeNull();
    expect(optionalPhone.parse("9876543210")).toBe("+919876543210");
  });
  it("checks names, emails, passwords, pincodes and links", () => {
    expect(personName.safeParse("Ravi O'Neil").success).toBe(true);
    expect(personName.safeParse("R2").success).toBe(false);
    expect(email.parse(" A@B.co ")).toBe("a@b.co");
    expect(password.safeParse("abcdefg1").success).toBe(true);
    expect(password.safeParse("abcdefgh").success).toBe(false);
    expect(pincode.safeParse("400001").success).toBe(true);
    expect(pincode.safeParse("012345").success).toBe(false);
    expect(httpUrl.safeParse("https://x.com").success).toBe(true);
    expect(httpUrl.safeParse("ftp://x.com").success).toBe(false);
    expect(optionalUrl.parse("")).toBeNull();
    expect(optionalUrl.parse(null)).toBeNull();
    expect(optionalUrl.parse("http://a.b")).toBe("http://a.b");
  });
});
