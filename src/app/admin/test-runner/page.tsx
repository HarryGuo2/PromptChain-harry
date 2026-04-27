import { requireAdminUser } from '@/lib/admin-auth'
import { TestRunnerForm } from '@/components/test-runner-form'

export default async function TestRunnerPage() {
  const { supabase } = await requireAdminUser()

  const { data: flavors } = await supabase
    .from('humor_flavors')
    .select('id, slug')
    .order('slug', { ascending: true })
    .limit(50000)

  const flavorIds = (flavors ?? []).map((f) => f.id)

  // Scope step lookup to the visible flavor ids and set an explicit
  // ceiling so PostgREST's default ~1000-row cap can't silently truncate
  // step counts for the newest flavors.
  const { data: flavorSteps } =
    flavorIds.length > 0
      ? await supabase
          .from('humor_flavor_steps')
          .select('humor_flavor_id')
          .in('humor_flavor_id', flavorIds)
          .limit(50000)
      : { data: [] as { humor_flavor_id: number }[] }

  const flavorStepCountByFlavorId = (flavorSteps || []).reduce<Record<number, number>>((acc, row) => {
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
