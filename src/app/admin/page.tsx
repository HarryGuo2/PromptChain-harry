import { requireAdminUser } from '@/lib/admin-auth'

export default async function AdminHomePage() {
  await requireAdminUser()

  return (
    <main className="container space-y-4">
      <div className="card">
        <h1 className="text-2xl font-bold">Prompt Chain Admin</h1>
        <p className="text-slate-600 mt-1">
          Manage humor flavors, test generation pipeline calls, and review generated captions.
        </p>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold">Core Routes</h2>
        <ul className="mt-3 list-disc list-inside text-slate-700">
          <li><a href="/admin/humor-flavors" className="underline">Flavor Builder</a></li>
          <li><a href="/admin/test-runner" className="underline">Run Pipeline Test</a></li>
          <li><a href="/admin/captions" className="underline">Caption History</a></li>
        </ul>
      </div>
    </main>
  )
}
