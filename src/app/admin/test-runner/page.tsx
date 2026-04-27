import { requireAdminUser } from '@/lib/admin-auth'
import { TestRunnerForm } from '@/components/test-runner-form'

const STEP_PAGE_SIZE = 1000

// Supabase enforces a hard ~1000-row cap per request, so we page through
// the steps table with explicit `.range()` calls until drained instead of
// relying on a single `.limit(N)` to return all rows.
async function fetchAllStepFlavorIds(
  supabase: Awaited<ReturnType<typeof requireAdminUser>>['supabase']
): Promise<{ humor_flavor_id: number }[]> {
  const all: { humor_flavor_id: number }[] = []
  let from = 0
  while (true) {
    const to = from + STEP_PAGE_SIZE - 1
    const { data, error } = await supabase
      .from('humor_flavor_steps')
      .select('humor_flavor_id')
      .range(from, to)
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break
    all.push(...(data as { humor_flavor_id: number }[]))
    if (data.length < STEP_PAGE_SIZE) break
    from += STEP_PAGE_SIZE
  }
  return all
}

export default async function TestRunnerPage() {
  const { supabase } = await requireAdminUser()

  const { data: flavors } = await supabase
    .from('humor_flavors')
    .select('id, slug')
    .order('slug', { ascending: true })

  const flavorSteps = await fetchAllStepFlavorIds(supabase)

  const flavorStepCountByFlavorId = flavorSteps.reduce<Record<number, number>>((acc, row) => {
    const flavorId = Number(row.humor_flavor_id)
    acc[flavorId] = (acc[flavorId] || 0) + 1
    return acc
  }, {})

  const flavorsWithStepCounts = (flavors || []).map((flavor) => ({
    ...flavor,
    stepCount: flavorStepCountByFlavorId[Number(flavor.id)] || 0,
  }))

  return (
    <main className="container space-y-4">
      <div className="card">
        <h1 className="text-2xl font-bold">Run Pipeline Test</h1>
        <p className="text-slate-600 mt-1">
          Upload a test image, optionally pick a flavor, and execute the full caption pipeline.
        </p>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold">Pipeline flow</h2>
        <ul className="mt-3 list-disc list-inside text-slate-700">
          <li>Generate presigned upload URL</li>
          <li>Upload image bytes to returned URL</li>
          <li>Register uploaded image URL</li>
          <li>Generate captions (optionally scoped by humor flavor)</li>
        </ul>
      </div>

      <TestRunnerForm flavors={flavorsWithStepCounts} />
    </main>
  )
}
