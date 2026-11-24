-- Small kitchen appliance repairs people search for by name ("mixer grinder repair near me"), as services
-- under Home Appliances, so each gets its own page and search finds them. Safe on a live database: it only
-- adds rows, skips any slug that already exists, and leaves the team's own edits alone.
-- To reverse: DELETE FROM "subcategories" WHERE "slug" IN ('mixer-grinder-repair', 'kitchen-chimney-service', 'gas-stove-and-induction-repair');

INSERT INTO "subcategories" ("category_id", "name", "slug", "profession_name", "display_order", "is_active", "updated_at")
SELECT c."id", s."name", s."slug", s."profession_name",
       COALESCE((SELECT MAX(x."display_order") FROM "subcategories" x WHERE x."category_id" = c."id"), 0) + s."ord",
       TRUE, CURRENT_TIMESTAMP
FROM "categories" c
CROSS JOIN (VALUES
  ('Mixer Grinder Repair', 'mixer-grinder-repair', 'Mixer Grinder Repair Technician', 1),
  ('Kitchen Chimney Service', 'kitchen-chimney-service', 'Chimney Technician', 2),
  ('Gas Stove & Induction Repair', 'gas-stove-and-induction-repair', 'Gas Stove Repair Technician', 3)
) AS s("name", "slug", "profession_name", "ord")
WHERE c."slug" = 'home-appliances'
  AND NOT EXISTS (SELECT 1 FROM "subcategories" e WHERE e."slug" = s."slug");
