import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const token = req.headers.get('x-admin-token');
  if (token !== 'liberty-logout-2026') {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const listRes = await fetch(`${url}/auth/v1/admin/users?per_page=200`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const data = await listRes.json();
  const users = data.users || [];
  const results: any[] = [];
  for (const u of users) {
    const r = await fetch(`${url}/auth/v1/admin/users/${u.id}/logout`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    results.push({ id: u.id, email: u.email, status: r.status });
  }
  return new Response(JSON.stringify({ count: results.length, results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
