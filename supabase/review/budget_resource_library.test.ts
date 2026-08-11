import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { RESOURCE_UPLOAD_MIME_TYPES } from "../../src/features/resources/resourceUpload";

const sql = readFileSync(
  resolve(process.cwd(), "supabase", "review", "budget_resource_library.sql"),
  "utf8",
);

const policyNames = [
  "authenticated read public resources",
  "admins insert resources",
  "admins update resources",
  "admins delete resources",
  "authenticated read public resource files",
  "admins insert budget resource files",
  "admins update budget resource files",
  "admins delete budget resource files",
];

describe("budget resource library review SQL", () => {
  it("prevents authenticated users from granting themselves admin access", () => {
    expect(sql).toContain(
      "revoke insert, update on table public.profiles from authenticated;",
    );
    expect(sql).toContain(
      "grant select (user_id, school_id, display_name, is_admin) on table public.profiles to authenticated;",
    );
    expect(sql).toContain(
      "grant insert (user_id, school_id, display_name, role) on table public.profiles to authenticated;",
    );
    expect(sql).not.toMatch(
      /grant\s+(?:insert|update)[^;]*\bis_admin\b[^;]*\bto\s+authenticated/i,
    );
  });

  it("can safely recreate every resource policy during review reruns", () => {
    for (const name of policyNames) {
      expect(sql).toContain(
        `drop policy if exists "${name}" on ${
          name.includes("files") ? "storage.objects" : "public.budget_resources"
        };`,
      );
    }
  });

  it("uses a private bucket and grants authenticated reads only for public resources or admins", () => {
    expect(sql).toContain(
      "values ('budget-resources', 'budget-resources', false, 31457280, array[",
    );
    expect(sql).toMatch(
      /create policy "authenticated read public resource files" on storage\.objects\s+for select to authenticated using \(bucket_id = 'budget-resources' and \(exists \(\s+select 1 from public\.budget_resources r where r\.storage_path = name and r\.is_public\s+\) or exists \(\s+select 1 from public\.profiles p where p\.user_id = \(select auth\.uid\(\)\) and p\.is_admin\s+\)\)\);/s,
    );
  });

  it("keeps Storage and the client upload contract on the same MIME types", () => {
    const allowedMimeTypes = Array.from(
      sql.matchAll(/'([^']+\/[^']+)'/g),
      (match) => match[1],
    ).filter((mimeType) => mimeType.startsWith("application/"));

    expect(allowedMimeTypes.slice(-RESOURCE_UPLOAD_MIME_TYPES.length)).toEqual(
      RESOURCE_UPLOAD_MIME_TYPES,
    );
  });

  it("updates budget resource timestamps through a non-definer trigger function", () => {
    expect(sql).toMatch(
      /create or replace function public\.set_budget_resources_updated_at\(\)\s+returns trigger\s+language plpgsql\s+set search_path = ''\s+as \$\$\s+begin\s+new\.updated_at = now\(\);\s+return new;\s+end;\s+\$\$;/s,
    );
    expect(sql).toContain(
      "drop trigger if exists set_budget_resources_updated_at on public.budget_resources;",
    );
    expect(sql).toContain(
      "before update on public.budget_resources for each row execute function public.set_budget_resources_updated_at();",
    );
    expect(sql).not.toMatch(/set_budget_resources_updated_at[\s\S]*security definer/i);
  });
});
