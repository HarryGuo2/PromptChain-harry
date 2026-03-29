import { requireAdminUser } from '@/lib/admin-auth'
import { TestRunnerForm } from '@/components/test-runner-form'

export default async function TestRunnerPage() {
  const { supabase } = await requireAdminUser()

  const { data: flavors } = await supabase
    .from('humor_flavors')
    .select('id, slug')
    .order('slug', { ascending: true })

  return (
    <main className="container space-y-4">
      <div className="card">
        <h1 className="text-2xl font-bold">Prompt Chain Test Runner</h1>
        <p className="text-slate-600 mt-1">
          Upload an image, optionally select a humor flavor, then run the 4-step caption
          pipeline API flow.
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

      <TestRunnerForm flavors={flavors || []} />
    </main>
  )
}
