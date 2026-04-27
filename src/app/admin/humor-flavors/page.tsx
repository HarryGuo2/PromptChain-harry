import { requireAdminUser } from '@/lib/admin-auth'
import { HumorFlavorsAdmin } from '@/components/humor-flavors-admin'

export default async function HumorFlavorsPage() {
  const { supabase } = await requireAdminUser()

  const { data: flavors } = await supabase
    .from('humor_flavors')
    .select('id, slug, description')
    .order('created_datetime_utc', { ascending: false })

  const flavorIds = (flavors ?? []).map((f) => f.id)

  // Scope steps to the loaded flavor ids so we don't hit PostgREST's default
  // ~1000-row cap and silently truncate steps for the newest flavors. We also
  // set an explicit safety ceiling well above any realistic step count.
  const { data: steps } =
    flavorIds.length > 0
      ? await supabase
          .from('humor_flavor_steps')
          .select(
            'id, humor_flavor_id, order_by, llm_model_id, llm_input_type_id, llm_output_type_id, humor_flavor_step_type_id, llm_temperature, llm_system_prompt, llm_user_prompt, description'
          )
          .in('humor_flavor_id', flavorIds)
          .order('humor_flavor_id', { ascending: true })
          .order('order_by', { ascending: true })
          .limit(50000)
      : { data: [] as never[] }

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
