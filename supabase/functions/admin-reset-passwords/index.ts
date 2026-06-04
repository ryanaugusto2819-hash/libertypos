// One-off admin tool to reset passwords. Protected by a shared token.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GUARD = "liberty-reset-2026";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (url.searchParams.get("token") !== GUARD) {
    return new Response("forbidden", { status: 403 });
  }
  const { users } = await req.json(); // [{ id, password }]
  const results: any[] = [];
  for (const u of users) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${u.id}`, {
      method: "PUT",
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password: u.password }),
    });
    results.push({ id: u.id, status: r.status, body: await r.text() });
  }
  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json" },
  });
});
