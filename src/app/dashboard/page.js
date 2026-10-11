import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const { data: maps, error } = await supabase
    .from('concept_maps')
    .select('id, title, created_at, updated_at')
    .order('updated_at', { ascending: false });

  async function signOut() {
    'use server';
    const client = await createClient();
    await client.auth.signOut();
    redirect('/login');
  }

  return <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
    <div className="mx-auto max-w-5xl">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-sm font-semibold text-sky-400">VISIONAIRE CANVAS AI</p><h1 className="mt-2 text-3xl font-bold">Your learning maps</h1><p className="mt-2 text-slate-400">Signed in as {user.email}</p></div>
        <form action={signOut}><button className="rounded-lg border border-slate-700 px-4 py-2">Log out</button></form>
      </header>
      <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-xl font-semibold">Saved maps</h2>
        {error ? <p className="mt-4 text-rose-300">Could not load maps. Check that you ran the Supabase SQL setup.</p>
          : !maps?.length ? <p className="mt-4 text-slate-400">No saved maps yet. Open the map workspace to create your first one.</p>
          : <ul className="mt-4 grid gap-3 sm:grid-cols-2">{maps.map(map => <li key={map.id} className="rounded-xl border border-slate-700 p-4"><h3 className="font-semibold">{map.title}</h3><p className="mt-1 text-xs text-slate-400">Updated {new Date(map.updated_at).toLocaleString()}</p><Link className="mt-3 inline-block text-sm text-sky-400 underline" href={`/?map=${map.id}`}>Open map</Link></li>)}</ul>}
        <p className="mt-6 text-sm text-slate-400">Map creation and loading must be connected to your workspace before these links can restore a saved map.</p>
        <Link href="/" className="mt-4 inline-block rounded-lg bg-sky-500 px-4 py-2 font-semibold text-slate-950">Open workspace</Link>
      </section>
    </div>
  </main>;
}
