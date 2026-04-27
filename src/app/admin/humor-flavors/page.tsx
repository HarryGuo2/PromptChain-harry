import { requireAdminUser } from '@/lib/admin-auth'
import { HumorFlavorsAdmin } from '@/components/humor-flavors-admin'

const STEP_PAGE_SIZE = 1000

const STEP_COLUMNS =
  'id, humor_flavor_id, order_by, llm_model_id, llm_input_type_id, llm_output_type_id, humor_flavor_step_type_id, llm_temperature, llm_system_prompt, llm_user_prompt, description'

type StepRow = {
  id: number
  humor_flavor_id: number
  order_by: number
  llm_model_id: number
  llm_input_type_id: number
  llm_output_type_id: number
  humor_flavor_step_type_id: number
  llm_temperature: number | null
  llm_system_prompt: string | null
  llm_user_prompt: string | null
  description: string | null
}

// Supabase enforces a hard ~1000-row cap per request, so a single
// `.limit(N)` call cannot return more rows than that. We page through
// the steps table with explicit `.range()` calls until drained.
async function fetchAllSteps(
  supabase: Awaited<ReturnType<typeof requireAdminUser>>['supabase']
): Promise<StepRow[]> {
  const all: StepRow[] = []
  let from = 0
  while (true) {
    const to = from + STEP_PAGE_SIZE - 1
    const { data, error } = await supabase
      .from('humor_flavor_steps')
      .select(STEP_COLUMNS)
      .order('humor_flavor_id', { ascending: true })
      .order('order_by', { ascending: true })
      .range(from, to)
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break
    all.push(...(data as unknown as StepRow[]))
    if (data.length < STEP_PAGE_SIZE) break
    from += STEP_PAGE_SIZE
  }
  return all
}

export default async function HumorFlavorsPage() {
  const { supabase } = await requireAdminUser()

  const { data: flavors } = await supabase
    .from('humor_flavors')
    .select('id, slug, description')
    .order('created_datetime_utc', { ascending: false })

  const steps = await fetchAllSteps(supabase)

  const { data: llmModels } = await supabase
    .from('llm_models')
    .select('id, name, provider_model_id')
    .order('id', { ascending: true })

  const { data: llmInputTypes } = await supabase
    .from('llm_input_types')
    .select('id, slug, description')
    .order('id', { ascending: true })

  const { data: llmOutputTypes } = await supabase
    .from('llm_output_types')
    .select('id, slug, description')
    .order('id', { ascending: true })

  const { data: stepTypes } = await supabase
    .from('humor_flavor_step_types')
    .select('id, slug, description')
    .order('id', { ascending: true })

  return (
    <main className="container space-y-4">
      <div className="card">
        <h1 className="text-2xl font-bold">Flavor Builder</h1>
        <p className="text-slate-600 mt-1">
          Create and edit humor flavors and their ordered prompt-chain steps.
        </p>
      </div>

      <HumorFlavorsAdmin
        initialFlavors={flavors || []}
        initialSteps={steps || []}
        llmModels={llmModels || []}
        llmInputTypes={llmInputTypes || []}
        llmOutputTypes={llmOutputTypes || []}
        stepTypes={stepTypes || []}
      />
    </main>
  )
}
