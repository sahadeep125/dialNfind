// Calls every API endpoint as guest, customer, provider and admin against a seeded dev database.
// It writes data, so run `pnpm --filter server db:seed` afterwards to restore the demo state.
const B = process.env.API_URL ?? "http://localhost:4000/api/v1";
let pass = 0, fail = 0;
const results = [];
async function call(method, path, { token, body, expect = [200, 201], label } = {}) {
  const res = await fetch(B + path, { method, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => null);
  const ok = (Array.isArray(expect) ? expect : [expect]).includes(res.status);
  ok ? pass++ : fail++;
  results.push(`${ok ? "ok  " : "FAIL"} ${res.status} ${method} ${path}${label ? " (" + label + ")" : ""}${ok ? "" : " -> " + JSON.stringify(json).slice(0, 200)}`);
  return json;
}
const login = async (email) => (await call("POST", "/auth/login", { body: { email, password: "password123" } })).token;
const admin = await login("admin@dialnfind.com");
const cust = await login("demo@dialnfind.com");
const prov = await login("provider@dialnfind.com");

// public
await call("GET", "/health");
await call("GET", "/stats");
await call("GET", "/plans");
await call("GET", "/app-config");
const cats = (await call("GET", "/categories")).categories;
const cat = await call("GET", `/categories/${cats[0].slug}`);
await call("GET", "/locations?q=sevoke");
await call("GET", "/search/providers?q=tv%20repair&lat=26.7338&lng=88.4325");
await call("GET", "/search/suggest?q=plum");
await call("GET", "/search/popular");
const featured = (await call("GET", "/providers/featured?city=Siliguri")).results;
const me = await call("GET", "/provider/me", { token: prov });
const slug = me.provider.slug;
const detail = (await call("GET", `/providers/${slug}`)).provider;
results.push(`     serviceDetails on profile: ${JSON.stringify(detail.serviceDetails)}`);
await call("GET", `/providers/${slug}/reviews`);
await call("GET", `/providers/${slug}/similar`);
await call("POST", `/providers/${slug}/report`, { body: { reason: "Smoke test report" } });
await call("POST", "/contact", { body: { name: "Smoke Test", email: "smoke@example.com", message: "Testing the contact form end to end." } });

// customer
await call("GET", "/auth/me", { token: cust });
await call("PATCH", "/auth/me", { token: cust, body: { name: "Ananya Sen" } });
await call("GET", "/me/overview", { token: cust });
await call("GET", "/me/favorites", { token: cust });
await call("PUT", `/me/favorites/${featured[1].id}`, { token: cust });
await call("DELETE", `/me/favorites/${featured[1].id}`, { token: cust });
const addr = (await call("POST", "/me/addresses", { token: cust, body: { label: "Other", addressLine: "Hill Cart Road", city: "Siliguri", state: "West Bengal", pincode: "734001" } })).address;
await call("GET", "/me/addresses", { token: cust });
await call("PATCH", `/me/addresses/${addr.id}`, { token: cust, body: { isDefault: true } });
await call("DELETE", `/me/addresses/${addr.id}`, { token: cust });
await call("GET", "/me/reviews", { token: cust });
// Account deletion: a fresh customer confirms with their password and can no longer sign in.
const temp = (await call("POST", "/auth/register", { body: { name: "Smoke Delete", email: `smoke.delete.${Date.now()}@example.com`, password: "password123", role: "customer", acceptTerms: true } })).token;
await call("DELETE", "/auth/me", { token: temp, body: { password: "wrong-password1" }, expect: 400, label: "delete account wrong password" });
await call("DELETE", "/auth/me", { token: temp, body: { password: "password123" } });
await call("GET", "/auth/me", { token: temp, expect: 401, label: "deleted account is signed out" });
await call("DELETE", "/auth/me", { token: prov, body: { password: "password123" }, expect: 403, label: "providers cannot self-delete" });
await call("GET", "/me/contacts", { token: cust });

// email links, sessions and rate limits
await call("POST", "/auth/forgot-password", { body: { email: "nobody.here@example.com" }, label: "forgot password answers the same for unknown emails" });
await call("POST", "/auth/forgot-password", { body: { email: "demo@dialnfind.com" } });
await call("POST", "/auth/reset-password", { body: { token: "x".repeat(43), newPassword: "password456" }, expect: 400, label: "reset needs a real token" });
await call("POST", "/auth/verify-email", { body: { token: "x".repeat(43) }, expect: 400, label: "verify needs a real token" });
const second = await login("demo@dialnfind.com");
await call("POST", "/auth/logout", { token: second });
await call("GET", "/auth/me", { token: second, expect: 401, label: "token stops working after sign-out" });
await call("GET", "/auth/me", { token: cust, label: "other sign-ins stay active" });
const staffExp = JSON.parse(Buffer.from(admin.split(".")[1], "base64url").toString()).exp - Math.floor(Date.now() / 1000);
results.push(`     staff session lifetime: ${Math.round(staffExp / 3600)} h`);
staffExp <= 12 * 3600 + 5 ? pass++ : (fail++, results.push("FAIL staff sessions should last at most 12 h"));
for (let i = 0; i < 10; i++) await fetch(B + "/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "brute.force@example.com", password: "wrong" }) });
await call("POST", "/auth/login", { body: { email: "brute.force@example.com", password: "wrong" }, expect: 429, label: "11th login attempt in 15 min is blocked" });
const notes = await call("GET", "/me/notifications", { token: cust });
results.push(`     customer unread notifications: ${notes.unread}`);
await call("POST", "/me/notifications/read", { token: cust, body: {} });
// lead with details (lead questions)
const leadAttr = cat.category.attributes.find((a) => a.appliesTo === "lead");
const lead = await call("POST", "/leads", { token: cust, body: { providerId: me.provider.id, channel: "call", source: "search", categorySlug: cats[0].slug, details: leadAttr ? [{ attributeId: leadAttr.id, value: leadAttr.optionsJson[0] }] : [] } });
await call("POST", "/leads", { body: { providerId: me.provider.id, channel: "call", categorySlug: cats[0].slug, details: [{ attributeId: 999999, value: "x" }] }, expect: 400, label: "bad detail rejected" });
await call("PATCH", `/leads/${lead.lead.id}/response`, { token: cust, body: { responded: true } });
await call("POST", "/leads", { body: { providerId: featured[2].id, channel: "whatsapp" }, label: "guest" });
const other = featured.find((p) => p.id !== me.provider.id && p.slug !== featured[1].slug) ?? featured[3];
const rv = await call("POST", "/reviews", { token: cust, body: { providerId: other.id, rating: 4, reviewText: "Smoke test review, prompt and polite service." }, expect: [201, 409] });
const myReviews = (await call("GET", "/me/reviews", { token: cust })).reviews;
const r0 = myReviews[0];
await call("PATCH", `/reviews/${r0.id}`, { token: cust, body: { rating: r0.rating, reviewText: (r0.reviewText ?? "Good work overall, would call again.") } });
await call("POST", `/reviews/${r0.id}/report`, { body: { reason: "Smoke test flag" } });
await call("POST", "/auth/change-password", { token: cust, body: { currentPassword: "password123", newPassword: "password123" } });

// provider
await call("GET", "/provider/profile", { token: prov });
await call("PATCH", "/provider/profile", { token: prov, body: { isAvailable: true } });
await call("GET", "/provider/dashboard?days=30", { token: prov });
const leads = await call("GET", "/provider/leads", { token: prov });
results.push(`     newest lead details: ${JSON.stringify(leads.leads[0].details)}`);
const prevs = await call("GET", "/provider/reviews?filter=unreplied", { token: prov });
if (prevs.reviews[0]) await call("PUT", `/provider/reviews/${prevs.reviews[0].id}/reply`, { token: prov, body: { reply: "Thank you, glad we could help." } });
const profile = (await call("GET", "/provider/profile", { token: prov })).provider;
await call("PUT", "/provider/hours", { token: prov, body: { hours: profile.businessHours } });
await call("PUT", "/provider/service-areas", { token: prov, body: { serviceAreas: profile.serviceAreas.map(({ areaName }) => ({ areaName })) } });
const attrs = await call("GET", "/provider/attributes", { token: prov });
results.push(`     attribute groups: ${JSON.stringify(attrs.groups.map((g) => [g.title, g.attributes.map((a) => a.label)]))}`);
const g0 = attrs.groups[0], a0 = g0.attributes[0];
await call("PUT", "/provider/attributes", { token: prov, body: { values: [{ providerServiceId: g0.providerServiceId, attributeId: a0.id, value: ["Samsung", "LG"] }] } });
await call("PUT", "/provider/attributes", { token: prov, body: { values: [{ providerServiceId: g0.providerServiceId, attributeId: a0.id, value: ["NotABrand"] }] }, expect: 400, label: "invalid option rejected" });
// services save keeps attribute answers (drop anchor service, re-add)
const svcs = profile.services.map(({ categoryId, subcategoryId, startingPrice, priceUnit, isPrimary }) => ({ categoryId, subcategoryId, startingPrice, priceUnit, isPrimary }));
await call("PUT", "/provider/services", { token: prov, body: { services: svcs.slice(1).map((s, i) => ({ ...s, isPrimary: i === 0 })) } });
const after = await call("GET", "/provider/attributes", { token: prov });
results.push(`     answer after removing anchor service: ${JSON.stringify(after.groups[0].attributes[0].value)}`);
await call("PUT", "/provider/services", { token: prov, body: { services: svcs } });
const pf = (await call("POST", "/provider/portfolio", { token: prov, body: { title: "Smoke photo", imageUrl: "https://example.com/a.jpg" } })).item;
await call("PATCH", `/provider/portfolio/${pf.id}`, { token: prov, body: { title: "Smoke photo 2" } });
await call("DELETE", `/provider/portfolio/${pf.id}`, { token: prov });
await call("GET", "/provider/verifications", { token: prov });
const upload = await (await fetch(B + "/uploads?purpose=document", { method: "POST", headers: { "content-type": "application/pdf", authorization: `Bearer ${prov}` }, body: Buffer.from("%PDF-1.4\n% smoke test document\n") })).json();
results.push(`     document upload returns a signed link: ${/\/files\/documents\/.+\?exp=\d+&sig=/.test(upload.url)}`);
const unsigned = upload.url.split("?")[0];
const signedRes = await fetch(upload.url);
signedRes.status === 200 ? pass++ : (fail++, results.push(`FAIL signed document link -> ${signedRes.status}`));
const unsignedRes = await fetch(unsigned);
unsignedRes.status === 403 ? pass++ : (fail++, results.push(`FAIL unsigned document link should be 403, got ${unsignedRes.status}`));
const tampered = await fetch(upload.url.replace(/sig=./, "sig=x"));
tampered.status === 403 ? pass++ : (fail++, results.push(`FAIL tampered document link should be 403, got ${tampered.status}`));
await call("POST", "/provider/verifications", { token: prov, body: { type: "location", documentUrl: "https://example.com/bill.pdf" }, expect: 400, label: "outside links are not accepted as documents" });
const ver = (await call("POST", "/provider/verifications", { token: prov, body: { type: "location", documentUrl: upload.url } })).verification;
const sub = await call("GET", "/provider/subscription", { token: prov });
await call("GET", "/provider/sponsored", { token: prov });
const catIds = [...new Set(profile.services.map((s) => s.categoryId))];
await call("POST", "/provider/sponsored/request", { token: prov, body: { categoryId: catIds[0], days: 7, budget: 1000 }, expect: 409, label: "duplicate campaign blocked" });
await call("POST", "/provider/sponsored/request", { token: prov, body: { categoryId: catIds[0], days: 7, budget: 100 }, expect: 400, label: "below minimum" });
await call("POST", "/provider/subscription/request", { token: prov, body: { planId: sub.plans[sub.plans.length - 1].id, note: "Smoke test" }, expect: 201, label: "plan request opens a ticket" });
await call("POST", "/provider/subscription/checkout", { token: prov, body: { planId: 1 }, expect: 404, label: "checkout removed" });
await call("POST", "/provider/claims/1/verify", { token: prov, body: { code: "123456" }, expect: 404, label: "claim code removed" });
// Social sign-in: forged tokens are refused (501 when GOOGLE_CLIENT_IDS / APPLE_CLIENT_IDS are not set).
await call("POST", "/auth/google", { body: { idToken: "x".repeat(40) }, expect: [401, 501], label: "forged Google token refused" });
await call("POST", "/auth/apple", { body: { idToken: "x".repeat(40), role: "provider" }, expect: [401, 501], label: "forged Apple token refused" });
await call("POST", "/auth/google", { body: {}, expect: [400], label: "missing Google token" });
await call("POST", "/auth/apple/callback", { body: { state: "evil.abc", id_token: "x" }, expect: [400, 501], label: "Apple callback only returns to our apps" });
await call("POST", "/auth/apple/notifications", { body: { payload: "x".repeat(40) }, expect: [400, 501], label: "unsigned Apple notification refused" });
const meUser = (await call("GET", "/auth/me", { token: cust })).user;
if (meUser.hasPassword !== true || !Array.isArray(meUser.linkedAccounts)) { fail++; results.push("FAIL /auth/me should report hasPassword and linkedAccounts"); } else pass++;
const sp = (await call("GET", "/provider/sponsored", { token: prov })).listings[0];
await call("PATCH", `/provider/sponsored/${sp.id}`, { token: prov, body: { status: "paused" } });
await call("PATCH", `/provider/sponsored/${sp.id}`, { token: prov, body: { status: "active" } });
await call("GET", "/provider/claims/search?q=electronics&city=Siliguri", { token: prov });
await call("GET", "/me/notifications", { token: prov });
await call("GET", "/admin/overview", { token: prov, expect: 403, label: "provider blocked from admin" });

// admin
await call("GET", "/admin/overview", { token: admin });
await call("GET", "/admin/providers?status=active", { token: admin });
await call("PATCH", `/admin/providers/${me.provider.id}`, { token: admin, body: { status: "active" } });
await call("GET", "/admin/claims", { token: admin });
await call("GET", "/admin/verifications", { token: admin });
await call("PATCH", `/admin/verifications/${ver.id}`, { token: admin, body: { decision: "approved" } });
const flags = (await call("GET", "/admin/flags", { token: admin })).flags;
await call("PATCH", `/admin/flags/${flags[0].id}`, { token: admin, body: { status: "dismissed" } });
await call("GET", "/admin/flags?status=dismissed", { token: admin });
await call("PATCH", `/admin/reviews/${r0.id}`, { token: admin, body: { status: "published" } });
await call("GET", "/admin/settings", { token: admin });
await call("PUT", "/admin/settings", { token: admin, body: { values: { sponsored_cpc: "5", min_review_length: "20" } } });
await call("POST", "/reviews", { token: cust, body: { providerId: featured[3].id, rating: 4, reviewText: "Too short text" }, expect: 400, label: "admin minimum review length applies" });
await call("PUT", "/admin/settings", { token: admin, body: { values: { min_review_length: null } } });
await call("PUT", "/admin/settings", { token: admin, body: { values: { "plugin.razorpay.key_secret": "x" } }, expect: 400, label: "plugin keys are gone" });
await call("PUT", "/admin/settings", { token: admin, body: { values: { not_a_setting: "x" } }, expect: 400, label: "unknown setting rejected" });
await call("GET", "/admin/contact-messages", { token: admin });

// admin console: team, roles, tickets, operations
await call("GET", "/admin/me", { token: admin });
await call("GET", "/admin/me", { token: cust, expect: 403, label: "customer blocked from admin" });
const roles = (await call("GET", "/admin/roles", { token: admin })).roles;
const role = (await call("POST", "/admin/roles", { token: admin, body: { name: "Smoke Role", permissions: ["support"] } })).role;
await call("POST", "/admin/roles", { token: admin, body: { name: "Escalate", permissions: ["team"] }, expect: 400, label: "team module not assignable" });
const invited = await call("POST", "/admin/team", { token: admin, body: { name: "Smoke Staff", email: "smoke.staff@example.com", roleId: role.id } });
const staff = (await call("POST", "/auth/login", { body: { email: "smoke.staff@example.com", password: invited.temporaryPassword } })).token;
await call("GET", "/admin/tickets", { token: staff, label: "staff with support can list tickets" });
await call("GET", "/admin/providers", { token: staff, expect: 403, label: "staff without providers blocked" });
await call("GET", "/admin/team", { token: staff, expect: 403, label: "staff cannot open team" });
await call("PATCH", `/admin/team/${invited.member.id}`, { token: admin, body: { roleId: roles[0].id } });
await call("POST", `/admin/team/${invited.member.id}/reset-password`, { token: admin });
await call("DELETE", `/admin/roles/${role.id}`, { token: admin });
await call("DELETE", `/admin/team/${invited.member.id}`, { token: admin });
await call("GET", "/admin/team", { token: admin });
const tickets = await call("GET", "/admin/tickets?status=active", { token: admin });
await call("GET", "/admin/tickets/assignees", { token: admin });
const tk = tickets.tickets[0];
await call("GET", `/admin/tickets/${tk.id}`, { token: admin });
await call("PATCH", `/admin/tickets/${tk.id}`, { token: admin, body: { priority: "high", assignedToId: null } });
await call("POST", `/admin/tickets/${tk.id}/messages`, { token: admin, body: { body: "Internal smoke note", isInternal: true } });
await call("POST", `/admin/tickets/${tk.id}/messages`, { token: admin, body: { body: "Smoke reply to the customer" } });
await call("GET", "/admin/analytics?days=30", { token: admin });
await call("GET", "/admin/leads?days=30", { token: admin });
await call("GET", "/admin/reviews?status=published", { token: admin });
await call("GET", `/admin/providers/${me.provider.id}`, { token: admin });
await call("GET", "/admin/subscriptions", { token: admin });
await call("GET", "/admin/categories", { token: admin });
await call("POST", "/admin/notifications/preview", { token: admin, body: { audience: "providers" } });
await call("GET", "/admin/notifications/broadcasts", { token: admin });

// help desk as a customer
const myTicket = (await call("POST", "/support/tickets", { token: cust, body: { subject: "Smoke ticket", category: "account", message: "Testing the help desk from the smoke test." } })).ticket;
await call("GET", "/support/tickets", { token: cust });
const seen = await call("GET", `/support/tickets/${myTicket.id}`, { token: cust });
await call("POST", `/support/tickets/${myTicket.id}/messages`, { token: cust, body: { body: "Adding more detail." } });
await call("GET", `/support/tickets/${myTicket.id}`, { token: prov, expect: 404, label: "other users cannot read a ticket" });
await call("POST", `/support/tickets/${myTicket.id}/close`, { token: cust });
await call("POST", `/support/tickets/${myTicket.id}/messages`, { token: cust, body: { body: "After close" }, expect: 400, label: "closed ticket rejects replies" });
results.push(`     customer sees ${seen.messages.length} message(s) on a new ticket`);
const users = await call("GET", "/admin/users?role=customer&q=a", { token: admin });
const victim = users.users.find((u) => u.email !== "demo@dialnfind.com");
await call("PATCH", `/admin/users/${victim.id}`, { token: admin, body: { status: "suspended" } });
await call("PATCH", `/admin/users/${victim.id}`, { token: admin, body: { status: "active" } });
await call("GET", "/admin/activity-logs", { token: admin });
await call("GET", "/admin/search-insights?days=30", { token: admin });
const badge = (await call("POST", "/admin/badges", { token: admin, body: { name: "Smoke Badge", criteriaDescription: "Test" } })).badge;
await call("GET", "/admin/badges", { token: admin });
await call("PATCH", `/admin/badges/${badge.id}`, { token: admin, body: { name: "Smoke Badge 2" } });
await call("POST", `/admin/providers/${me.provider.id}/badges`, { token: admin, body: { badgeId: badge.id } });
await call("DELETE", `/admin/providers/${me.provider.id}/badges/${badge.id}`, { token: admin });
await call("DELETE", `/admin/badges/${badge.id}`, { token: admin });
const plan = (await call("POST", "/admin/plans", { token: admin, body: { name: "Smoke Plan", price: 49, features: ["One"] } })).plan;
await call("PATCH", `/admin/plans/${plan.id}`, { token: admin, body: { isActive: false } });
await call("GET", "/admin/plans", { token: admin });
await call("GET", "/admin/transactions?type=sponsored_ad", { token: admin });
await call("GET", "/admin/sponsored", { token: admin });
const today = new Date().toISOString().slice(0, 10);
const asp = (await call("POST", "/admin/sponsored", { token: admin, body: { providerId: featured[4].id, categoryId: cats[1].id, startDate: today, endDate: today, budget: 0 } })).listing;
await call("PATCH", `/admin/sponsored/${asp.id}`, { token: admin, body: { status: "completed" } });
const newCat = (await call("POST", "/categories", { token: admin, body: { name: "Smoke Category" } })).category;
const sub1 = (await call("POST", `/categories/${newCat.id}/subcategories`, { token: admin, body: { name: "Smoke Sub" } })).subcategory;
await call("PATCH", `/categories/subcategories/${sub1.id}`, { token: admin, body: { name: "Smoke Sub 2" } });
const at = (await call("POST", `/categories/${newCat.id}/attributes`, { token: admin, body: { appliesTo: "provider", label: "Smoke", fieldType: "boolean" } })).attribute;
await call("PATCH", `/categories/attributes/${at.id}`, { token: admin, body: { label: "Smoke 2" } });
await call("DELETE", `/categories/attributes/${at.id}`, { token: admin });
await call("DELETE", `/categories/subcategories/${sub1.id}`, { token: admin });
await call("PATCH", `/categories/${newCat.id}`, { token: admin, body: { description: "x" } });
await call("DELETE", `/categories/${newCat.id}`, { token: admin });
await call("POST", "/categories", { token: prov, body: { name: "Nope" }, expect: 403, label: "provider cannot create category" });
// provider sees verification + review notifications
const pn = await call("GET", "/me/notifications", { token: prov });
results.push(`     provider latest notifications: ${JSON.stringify(pn.notifications.slice(0, 4).map((n) => n.title))}`);
const spAfter = (await call("GET", "/provider/sponsored", { token: prov })).listings[0];
results.push(`     sponsored clicks ${sp.clicks} -> ${spAfter.clicks}, impressions ${sp.impressions} -> ${spAfter.impressions}`);

// admin tools: listings, import, ownership, users, disputes, payments, export, bulk
const newListing = { businessName: "Smoke Test Electricals", phone: "9876512340", city: "Siliguri", state: "West Bengal", locality: "Hakimpara", latitude: 26.71, longitude: 88.42, services: [{ categoryId: cats[0].id, isPrimary: true }] };
const created = (await call("POST", "/admin/providers", { token: admin, body: newListing })).provider;
await call("POST", "/admin/providers", { token: admin, body: newListing, expect: [201], label: "duplicate names get their own slug" });
await call("GET", `/admin/providers/${created.id}/profile`, { token: admin });
await call("PATCH", `/admin/providers/${created.id}/profile`, { token: admin, body: { description: "Wiring and repairs", serviceRadiusKm: 12 } });
await call("PUT", `/admin/providers/${created.id}/hours`, { token: admin, body: { hours: [{ dayOfWeek: 1, openTime: "09:00", closeTime: "18:00" }] } });
await call("PUT", `/admin/providers/${created.id}/service-areas`, { token: admin, body: { serviceAreas: [{ areaName: "Hakimpara" }] } });
await call("PUT", `/admin/providers/${created.id}/services`, { token: admin, body: { services: [{ categoryId: cats[1].id, isPrimary: true }] } });
await call("POST", `/admin/providers/${created.id}/owner`, { token: admin, body: { email: "demo@dialnfind.com" }, label: "give listing to a customer account" });
await call("DELETE", `/admin/providers/${created.id}/owner`, { token: admin });
await call("POST", "/admin/providers/bulk", { token: admin, body: { ids: [created.id], action: "suspend" } });
await call("DELETE", `/admin/providers/${created.id}`, { token: admin, body: { confirmName: "wrong name" }, expect: 400, label: "delete needs the exact name" });
await call("DELETE", `/admin/providers/${created.id}`, { token: admin, body: { confirmName: newListing.businessName } });
const csv = `business_name,phone,category,subcategory,city,state,locality,latitude,longitude\nImport One Plumbing,9876512341,${cats[0].slug},,Siliguri,West Bengal,Pradhan Nagar,26.72,88.41\nBad Row,123,nope,,Siliguri,West Bengal,,,\n`;
const dry = await call("POST", "/admin/providers/import", { token: admin, body: { csv, dryRun: true } });
results.push(`     import dry run: ${dry.valid}/${dry.total} valid, errors: ${JSON.stringify(dry.rows[1]?.errors)}`);
const imported = await call("POST", "/admin/providers/import", { token: admin, body: { csv, dryRun: false } });
imported.created === 1 ? pass++ : (fail++, results.push(`FAIL import created ${imported.created}`));
await call("POST", "/admin/providers/import", { token: admin, body: { csv: "name,phone\nx,y\n" }, expect: 400, label: "import needs the template columns" });

const someone = (await call("GET", "/admin/users?role=customer&pageSize=5", { token: admin })).users.find((u) => u.email !== "demo@dialnfind.com");
await call("GET", `/admin/users/${someone.id}`, { token: admin });
await call("POST", `/admin/users/${someone.id}/sign-out`, { token: admin });
await call("POST", "/admin/users/bulk", { token: admin, body: { ids: [someone.id], action: "suspend" } });
await call("POST", "/admin/users/bulk", { token: admin, body: { ids: [someone.id], action: "reactivate" } });
await call("GET", `/admin/users/${(await call("GET", "/admin/me", { token: admin })).user.id}`, { token: admin, label: "admin can view own record" });

const disputedLead = (await call("POST", "/leads", { token: cust, body: { providerId: me.provider.id, channel: "call", source: "profile" } })).lead;
await call("POST", `/provider/leads/${disputedLead.id}/dispute`, { token: prov, body: { reason: "Wrong number, the caller wanted someone else" } });
await call("POST", `/provider/leads/${disputedLead.id}/dispute`, { token: prov, body: { reason: "Reporting the same contact twice" }, expect: 409, label: "a contact is reported once" });
const openDisputes = await call("GET", "/admin/leads?dispute=open", { token: admin });
results.push(`     open lead disputes: ${openDisputes.openDisputes}`);
await call("PATCH", `/admin/leads/${disputedLead.id}/dispute`, { token: admin, body: { decision: "accepted" } });
await call("PATCH", `/admin/leads/${disputedLead.id}/dispute`, { token: admin, body: { decision: "rejected" }, expect: 400, label: "a dispute is decided once" });

const tx = (await call("POST", "/admin/transactions", { token: admin, body: { providerId: me.provider.id, type: "subscription", amount: 599, reference: "UPI-SMOKE-1" } })).transaction;
await call("PATCH", `/admin/transactions/${tx.id}`, { token: admin, body: { status: "refunded", note: "Smoke test refund" } });
await call("PATCH", `/admin/transactions/${tx.id}`, { token: admin, body: { status: "failed", note: "Twice" }, expect: 400, label: "refund only once" });
const planForGrant = (await call("GET", "/admin/plans", { token: admin })).plans.find((p) => Number(p.price) > 0 && p.isActive);
await call("POST", `/admin/providers/${me.provider.id}/subscription`, { token: admin, body: { planId: planForGrant.id, months: 1, payment: { amount: Number(planForGrant.price), reference: "UPI-SMOKE-2" } } });
await call("POST", "/admin/reviews/bulk", { token: admin, body: { ids: [r0.id], status: "published" } });

for (const entity of ["providers", "users", "leads", "reviews", "transactions", "subscriptions"]) {
  const res = await fetch(`${B}/admin/export/${entity}`, { headers: { authorization: `Bearer ${admin}` } });
  const text = await res.text();
  const ok = res.status === 200 && res.headers.get("content-type")?.startsWith("text/csv") && text.split("\r\n").length > 2;
  ok ? pass++ : fail++;
  results.push(`${ok ? "ok  " : "FAIL"} ${res.status} GET /admin/export/${entity} (${text.split("\r\n").length - 2} rows)`);
}
const opsRes = await fetch(`${B}/admin/export/providers`, { headers: { authorization: `Bearer ${cust}` } });
opsRes.status === 403 ? pass++ : (fail++, results.push(`FAIL customer export should be 403, got ${opsRes.status}`));
const msgs = (await call("GET", "/admin/contact-messages", { token: admin })).messages;
if (msgs[0]) await call("POST", `/admin/contact-messages/${msgs[0].id}/ticket`, { token: admin, label: "old contact message becomes a ticket" });

// search and location: provider travel distance, map places, reverse lookup
const near = await call("GET", "/search/providers?lat=26.87&lng=88.43&sort=distance&pageSize=50");
const strict = await call("GET", "/search/providers?lat=26.87&lng=88.43&radiusKm=15&sort=distance&pageSize=50");
// Beyond 15 km a provider still shows when a locality they serve is inside the radius (both searches), or,
// without an explicit radius, when they travel that far; so the default search finds at least as many.
results.push(`     default search ${near.total} vs explicit 15 km ${strict.total}`);
near.total >= strict.total ? pass++ : (fail++, results.push("FAIL the default search should include providers who travel further"));
const places = (await call("GET", "/locations?q=darjeeling")).locations;
results.push(`     location search falls back to the map: ${JSON.stringify(places.slice(0, 2).map((l) => `${l.kind}:${l.label}`))}`);
const here = (await call("GET", "/locations/reverse?lat=26.7338&lng=88.4325")).location;
results.push(`     reverse lookup: ${here.label}`);

console.log(results.join("\n"));
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
