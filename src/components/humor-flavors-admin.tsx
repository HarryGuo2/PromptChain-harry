'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

interface FlavorRow {
  id: number
  slug: string
  description: string | null
}

interface StepRow {
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

interface LlmModelOption {
  id: number
  name: string | null
  provider_model_id: string | null
}

interface SlugOption {
  id: number
  slug: string | null
  description: string | null
}

interface FlavorFormState {
  id: string
  slug: string
  description: string
}

interface StepFormState {
  id: string
  order_by: string
  llm_model_id: string
  llm_input_type_id: string
  llm_output_type_id: string
  humor_flavor_step_type_id: string
  llm_temperature: string
  description: string
  llm_system_prompt: string
  llm_user_prompt: string
}

interface HumorFlavorsAdminProps {
  initialFlavors: FlavorRow[]
  initialSteps: StepRow[]
  llmModels: LlmModelOption[]
  llmInputTypes: SlugOption[]
  llmOutputTypes: SlugOption[]
  stepTypes: SlugOption[]
}

const emptyFlavorForm: FlavorFormState = {
  id: '',
  slug: '',
  description: '',
}

function toStepForm(step: StepRow): StepFormState {
  return {
    id: String(step.id),
    order_by: String(step.order_by),
    llm_model_id: String(step.llm_model_id),
    llm_input_type_id: String(step.llm_input_type_id),
    llm_output_type_id: String(step.llm_output_type_id),
    humor_flavor_step_type_id: String(step.humor_flavor_step_type_id),
    llm_temperature: step.llm_temperature == null ? '' : String(step.llm_temperature),
    description: step.description ?? '',
    llm_system_prompt: step.llm_system_prompt ?? '',
    llm_user_prompt: step.llm_user_prompt ?? '',
  }
}

export function HumorFlavorsAdmin({
  initialFlavors,
  initialSteps,
  llmModels,
  llmInputTypes,
  llmOutputTypes,
  stepTypes,
}: HumorFlavorsAdminProps) {
  const supabase = useMemo(() => createClient(), [])
  const [flavors, setFlavors] = useState<FlavorRow[]>(initialFlavors)
  const [steps, setSteps] = useState<StepRow[]>(initialSteps)
  const [selectedFlavorId, setSelectedFlavorId] = useState<number | null>(initialFlavors[0]?.id ?? null)
  const [selectedStepId, setSelectedStepId] = useState<number | null>(null)
  const [flavorSearch, setFlavorSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [newFlavor, setNewFlavor] = useState<FlavorFormState>(emptyFlavorForm)
  const [editingFlavor, setEditingFlavor] = useState<FlavorFormState>(emptyFlavorForm)
  const [newStep, setNewStep] = useState<StepFormState>({
    id: '',
    order_by: '',
    llm_model_id: llmModels[0]?.id ? String(llmModels[0].id) : '',
    llm_input_type_id: llmInputTypes[0]?.id ? String(llmInputTypes[0].id) : '',
    llm_output_type_id: llmOutputTypes[0]?.id ? String(llmOutputTypes[0].id) : '',
    humor_flavor_step_type_id: stepTypes[0]?.id ? String(stepTypes[0].id) : '',
    llm_temperature: '',
    description: '',
    llm_system_prompt: '',
    llm_user_prompt: '',
  })
  const [editingStep, setEditingStep] = useState<StepFormState | null>(null)

  const selectedFlavorSteps = steps
    .filter((step) => step.humor_flavor_id === selectedFlavorId)
    .sort((a, b) => a.order_by - b.order_by)
  const selectedFlavor = flavors.find((item) => item.id === selectedFlavorId) ?? null
  const normalizedFlavorSearch = flavorSearch.trim().toLowerCase()
  const filteredFlavors = normalizedFlavorSearch
    ? flavors.filter(
        (flavor) =>
          flavor.slug.toLowerCase().includes(normalizedFlavorSearch) ||
          String(flavor.id).includes(normalizedFlavorSearch)
      )
    : flavors

  const refreshData = async () => {
    const [flavorsResult, stepsResult] = await Promise.all([
      supabase
        .from('humor_flavors')
        .select('id, slug, description')
        .order('created_datetime_utc', { ascending: false }),
      supabase
        .from('humor_flavor_steps')
        .select(
          'id, humor_flavor_id, order_by, llm_model_id, llm_input_type_id, llm_output_type_id, humor_flavor_step_type_id, llm_temperature, llm_system_prompt, llm_user_prompt, description'
        )
        .order('humor_flavor_id', { ascending: true })
        .order('order_by', { ascending: true }),
    ])

    if (flavorsResult.error) throw new Error(flavorsResult.error.message)
    if (stepsResult.error) throw new Error(stepsResult.error.message)

    const nextFlavors = (flavorsResult.data ?? []) as FlavorRow[]
    const nextSteps = (stepsResult.data ?? []) as StepRow[]
    setFlavors(nextFlavors)
    setSteps(nextSteps)

    if (!nextFlavors.find((item) => item.id === selectedFlavorId)) {
      setSelectedFlavorId(nextFlavors[0]?.id ?? null)
      setSelectedStepId(null)
    }
  }

  const runMutation = async (mutation: () => Promise<void>, successText: string) => {
    setLoading(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    try {
      await mutation()
      await refreshData()
      setSuccessMessage(successText)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error.')
    } finally {
      setLoading(false)
    }
  }

  const upsertStepFromForm = async (stepId: number, form: StepFormState) => {
    const payload = {
      order_by: Number(form.order_by),
      llm_model_id: Number(form.llm_model_id),
      llm_input_type_id: Number(form.llm_input_type_id),
      llm_output_type_id: Number(form.llm_output_type_id),
      humor_flavor_step_type_id: Number(form.humor_flavor_step_type_id),
      llm_temperature: form.llm_temperature.trim() === '' ? null : Number(form.llm_temperature),
      description: form.description.trim() === '' ? null : form.description,
      llm_system_prompt: form.llm_system_prompt.trim() === '' ? null : form.llm_system_prompt,
      llm_user_prompt: form.llm_user_prompt.trim() === '' ? null : form.llm_user_prompt,
    }

    const result = await supabase.from('humor_flavor_steps').update(payload).eq('id', stepId)
    if (result.error) throw new Error(result.error.message)
  }

  const updateStepOrder = async (stepId: number, targetOrder: number) => {
    const currentStep = selectedFlavorSteps.find((item) => item.id === stepId)
    if (!currentStep) return
    const fromOrder = currentStep.order_by
    const swapStep = selectedFlavorSteps.find((item) => item.order_by === targetOrder)

    const tempOrder = -9999
    const moveCurrent = await supabase
      .from('humor_flavor_steps')
      .update({ order_by: tempOrder })
      .eq('id', stepId)
    if (moveCurrent.error) throw new Error(moveCurrent.error.message)

    if (swapStep) {
      const moveSwap = await supabase
        .from('humor_flavor_steps')
        .update({ order_by: fromOrder })
        .eq('id', swapStep.id)
      if (moveSwap.error) throw new Error(moveSwap.error.message)
    }

    const moveCurrentToTarget = await supabase
      .from('humor_flavor_steps')
      .update({ order_by: targetOrder })
      .eq('id', stepId)
    if (moveCurrentToTarget.error) throw new Error(moveCurrentToTarget.error.message)
  }

  useEffect(() => {
    if (!selectedFlavor) {
      setEditingFlavor(emptyFlavorForm)
      return
    }
    setEditingFlavor({
      id: String(selectedFlavor.id),
      slug: selectedFlavor.slug,
      description: selectedFlavor.description ?? '',
    })
  }, [selectedFlavor?.id, selectedFlavor?.slug, selectedFlavor?.description])

  useEffect(() => {
    if (!selectedStepId) {
      setEditingStep(null)
      return
    }
    const step = steps.find((item) => item.id === selectedStepId) ?? null
    setEditingStep(step ? toStepForm(step) : null)
  }, [selectedStepId, steps])

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <h2 className="text-lg font-semibold">Humor flavor CRUD</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Create a flavor, then select it to manage step prompts and order.
        </p>
        <div className="rounded-md border border-slate-200 p-3 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
          1) Create or select a flavor. 2) Edit selected flavor details. 3) Create/edit/reorder steps below.
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <input
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
            placeholder="Optional explicit ID"
            value={newFlavor.id}
            onChange={(event) => setNewFlavor((current) => ({ ...current, id: event.target.value }))}
          />
          <input
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
            placeholder="Slug"
            value={newFlavor.slug}
            onChange={(event) => setNewFlavor((current) => ({ ...current, slug: event.target.value }))}
          />
        </div>
        <textarea
          className="w-full min-h-20 rounded-md border border-slate-300 bg-white p-2 text-sm dark:border-slate-600 dark:bg-slate-900"
          placeholder="Description"
          value={newFlavor.description}
          onChange={(event) => setNewFlavor((current) => ({ ...current, description: event.target.value }))}
        />
        <button
          className="btn btn-primary"
          disabled={loading || newFlavor.slug.trim() === ''}
          onClick={() =>
            runMutation(async () => {
              const payload = {
                slug: newFlavor.slug.trim(),
                description: newFlavor.description.trim() === '' ? null : newFlavor.description.trim(),
                ...(newFlavor.id.trim() ? { id: Number(newFlavor.id) } : {}),
              }
              const result = await supabase.from('humor_flavors').insert(payload)
              if (result.error) throw new Error(result.error.message)
              setNewFlavor(emptyFlavorForm)
            }, 'Created humor flavor.')
          }
        >
          Create flavor
        </button>

        <div className="space-y-2">
          <h3 className="font-medium">Select flavor to edit</h3>
          {flavors.length === 0 ? (
            <div className="rounded-md border border-slate-200 p-3 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
              No humor flavors yet. Create your first flavor above.
            </div>
          ) : null}
          {flavors.length > 0 ? (
            <>
              <input
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 w-full"
                placeholder="Search flavors by id or slug"
                value={flavorSearch}
                onChange={(event) => setFlavorSearch(event.target.value)}
              />
              <select
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 w-full"
                value={selectedFlavorId ?? ''}
                onChange={(event) => {
                  const nextId = Number(event.target.value)
                  setSelectedFlavorId(Number.isNaN(nextId) ? null : nextId)
                  setSelectedStepId(null)
                }}
                disabled={loading}
              >
                {filteredFlavors.length === 0 ? (
                  <option value="">No matching flavors</option>
                ) : null}
                {filteredFlavors.map((flavor) => (
                  <option key={flavor.id} value={flavor.id}>
                    #{flavor.id} - {flavor.slug}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Showing {filteredFlavors.length} of {flavors.length} flavors
              </p>
            </>
          ) : null}
        </div>

        {selectedFlavor ? (
          <div className="rounded-md border border-slate-200 p-3 dark:border-slate-700 space-y-2">
            <h3 className="font-medium">Edit selected flavor #{selectedFlavor.id}</h3>
            <input
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 w-full"
              value={editingFlavor.slug}
              onChange={(event) => setEditingFlavor((current) => ({ ...current, slug: event.target.value }))}
            />
            <textarea
              className="w-full min-h-20 rounded-md border border-slate-300 bg-white p-2 text-sm dark:border-slate-600 dark:bg-slate-900"
              value={editingFlavor.description}
              onChange={(event) =>
                setEditingFlavor((current) => ({ ...current, description: event.target.value }))
              }
            />
            <div className="flex gap-2">
              <button
                className="btn btn-primary"
                disabled={loading || editingFlavor.slug.trim() === ''}
                onClick={() =>
                  runMutation(async () => {
                    const result = await supabase
                      .from('humor_flavors')
                      .update({
                        slug: editingFlavor.slug.trim(),
                        description:
                          editingFlavor.description.trim() === '' ? null : editingFlavor.description.trim(),
                      })
                      .eq('id', selectedFlavor.id)
                    if (result.error) throw new Error(result.error.message)
                  }, `Updated flavor #${selectedFlavor.id}.`)
                }
              >
                Save selected flavor
              </button>
              <button
                className="btn"
                disabled={loading}
                onClick={() =>
                  runMutation(async () => {
                    const result = await supabase.from('humor_flavors').delete().eq('id', selectedFlavor.id)
                    if (result.error) throw new Error(result.error.message)
                    setSelectedStepId(null)
                  }, `Deleted flavor #${selectedFlavor.id}.`)
                }
              >
                Delete selected flavor
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="card space-y-3">
        <h2 className="text-lg font-semibold">Humor flavor step CRUD + reorder</h2>
        <div className="text-sm">
          Selected flavor ID: <span className="font-medium">{selectedFlavorId ?? 'none selected'}</span>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Use move up/down for quick reorder, or edit the order field directly and save.
        </p>

        {selectedFlavorId ? (
          <div className="rounded-md border border-slate-200 p-3 dark:border-slate-700 space-y-2">
            <h3 className="font-medium">Create step</h3>
            <div className="grid gap-2 md:grid-cols-3">
              <input
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                placeholder="Optional explicit step ID"
                value={newStep.id}
                onChange={(event) => setNewStep((current) => ({ ...current, id: event.target.value }))}
              />
              <input
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                placeholder="Order (optional)"
                value={newStep.order_by}
                onChange={(event) => setNewStep((current) => ({ ...current, order_by: event.target.value }))}
              />
              <input
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                placeholder="Temperature (optional)"
                value={newStep.llm_temperature}
                onChange={(event) =>
                  setNewStep((current) => ({ ...current, llm_temperature: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <select
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                value={newStep.llm_model_id}
                onChange={(event) => setNewStep((current) => ({ ...current, llm_model_id: event.target.value }))}
              >
                {llmModels.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.id} - {item.name || item.provider_model_id || 'unnamed model'}
                  </option>
                ))}
              </select>
              <select
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                value={newStep.humor_flavor_step_type_id}
                onChange={(event) =>
                  setNewStep((current) => ({ ...current, humor_flavor_step_type_id: event.target.value }))
                }
              >
                {stepTypes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.id} - {item.slug || item.description || 'step type'}
                  </option>
                ))}
              </select>
              <select
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                value={newStep.llm_input_type_id}
                onChange={(event) =>
                  setNewStep((current) => ({ ...current, llm_input_type_id: event.target.value }))
                }
              >
                {llmInputTypes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.id} - {item.slug || item.description || 'input type'}
                  </option>
                ))}
              </select>
              <select
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                value={newStep.llm_output_type_id}
                onChange={(event) =>
                  setNewStep((current) => ({ ...current, llm_output_type_id: event.target.value }))
                }
              >
                {llmOutputTypes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.id} - {item.slug || item.description || 'output type'}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              className="w-full min-h-16 rounded-md border border-slate-300 bg-white p-2 text-sm dark:border-slate-600 dark:bg-slate-900"
              placeholder="Step description"
              value={newStep.description}
              onChange={(event) => setNewStep((current) => ({ ...current, description: event.target.value }))}
            />
            <textarea
              className="w-full min-h-24 rounded-md border border-slate-300 bg-white p-2 text-sm dark:border-slate-600 dark:bg-slate-900"
              placeholder="LLM system prompt"
              value={newStep.llm_system_prompt}
              onChange={(event) =>
                setNewStep((current) => ({ ...current, llm_system_prompt: event.target.value }))
              }
            />
            <textarea
              className="w-full min-h-24 rounded-md border border-slate-300 bg-white p-2 text-sm dark:border-slate-600 dark:bg-slate-900"
              placeholder="LLM user prompt"
              value={newStep.llm_user_prompt}
              onChange={(event) => setNewStep((current) => ({ ...current, llm_user_prompt: event.target.value }))}
            />
            <button
              className="btn btn-primary"
              disabled={
                loading ||
                !newStep.llm_model_id ||
                !newStep.llm_input_type_id ||
                !newStep.llm_output_type_id ||
                !newStep.humor_flavor_step_type_id
              }
              onClick={() =>
                runMutation(async () => {
                  const nextOrder =
                    selectedFlavorSteps.length > 0
                      ? selectedFlavorSteps[selectedFlavorSteps.length - 1].order_by + 1
                      : 1
                  const payload = {
                    humor_flavor_id: selectedFlavorId,
                    order_by: newStep.order_by.trim() ? Number(newStep.order_by) : nextOrder,
                    llm_model_id: Number(newStep.llm_model_id),
                    llm_input_type_id: Number(newStep.llm_input_type_id),
                    llm_output_type_id: Number(newStep.llm_output_type_id),
                    humor_flavor_step_type_id: Number(newStep.humor_flavor_step_type_id),
                    llm_temperature: newStep.llm_temperature.trim() ? Number(newStep.llm_temperature) : null,
                    description: newStep.description.trim() ? newStep.description.trim() : null,
                    llm_system_prompt: newStep.llm_system_prompt.trim() ? newStep.llm_system_prompt.trim() : null,
                    llm_user_prompt: newStep.llm_user_prompt.trim() ? newStep.llm_user_prompt.trim() : null,
                    ...(newStep.id.trim() ? { id: Number(newStep.id) } : {}),
                  }
                  const result = await supabase.from('humor_flavor_steps').insert(payload)
                  if (result.error) throw new Error(result.error.message)
                  setNewStep((current) => ({
                    ...current,
                    id: '',
                    order_by: '',
                    llm_temperature: '',
                    description: '',
                    llm_system_prompt: '',
                    llm_user_prompt: '',
                  }))
                }, 'Created flavor step.')
              }
            >
              Create step
            </button>
          </div>
        ) : null}

        <div className="space-y-3">
          {selectedFlavorId && selectedFlavorSteps.length === 0 ? (
            <div className="rounded-md border border-slate-200 p-3 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
              No steps yet for this flavor. Create one above.
            </div>
          ) : null}
          {selectedFlavorSteps.map((step, index) => (
            <div key={step.id} className="rounded-md border border-slate-200 p-3 dark:border-slate-700">
              <div className="mb-2 text-sm font-medium">
                Step #{step.id} - order {step.order_by}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {step.description?.trim() || '(No step description)'}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button className="btn" disabled={loading} onClick={() => setSelectedStepId(step.id)}>
                  Edit step
                </button>
                <button
                  className="btn"
                  disabled={loading}
                  onClick={() =>
                    runMutation(async () => {
                      const result = await supabase.from('humor_flavor_steps').delete().eq('id', step.id)
                      if (result.error) throw new Error(result.error.message)
                      if (selectedStepId === step.id) setSelectedStepId(null)
                    }, `Deleted step #${step.id}.`)
                  }
                >
                  Delete step
                </button>
                <button
                  className="btn"
                  disabled={loading || index === 0}
                  onClick={() =>
                    runMutation(async () => {
                      await updateStepOrder(step.id, step.order_by - 1)
                    }, `Moved step #${step.id} up.`)
                  }
                >
                  Move up
                </button>
                <button
                  className="btn"
                  disabled={loading || index === selectedFlavorSteps.length - 1}
                  onClick={() =>
                    runMutation(async () => {
                      await updateStepOrder(step.id, step.order_by + 1)
                    }, `Moved step #${step.id} down.`)
                  }
                >
                  Move down
                </button>
              </div>
            </div>
          ))}
        </div>

        {editingStep ? (
          <div className="rounded-md border border-slate-200 p-3 dark:border-slate-700">
            <h3 className="mb-2 font-medium">Edit selected step #{editingStep.id}</h3>
            <div className="grid gap-2 md:grid-cols-3">
              <input
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                value={editingStep.order_by}
                onChange={(event) =>
                  setEditingStep((current) => (current ? { ...current, order_by: event.target.value } : null))
                }
              />
              <input
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                placeholder="Temperature"
                value={editingStep.llm_temperature}
                onChange={(event) =>
                  setEditingStep((current) =>
                    current ? { ...current, llm_temperature: event.target.value } : null
                  )
                }
              />
            </div>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <select
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                value={editingStep.llm_model_id}
                onChange={(event) =>
                  setEditingStep((current) =>
                    current ? { ...current, llm_model_id: event.target.value } : null
                  )
                }
              >
                {llmModels.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.id} - {item.name || item.provider_model_id || 'unnamed model'}
                  </option>
                ))}
              </select>
              <select
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                value={editingStep.humor_flavor_step_type_id}
                onChange={(event) =>
                  setEditingStep((current) =>
                    current ? { ...current, humor_flavor_step_type_id: event.target.value } : null
                  )
                }
              >
                {stepTypes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.id} - {item.slug || item.description || 'step type'}
                  </option>
                ))}
              </select>
              <select
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                value={editingStep.llm_input_type_id}
                onChange={(event) =>
                  setEditingStep((current) =>
                    current ? { ...current, llm_input_type_id: event.target.value } : null
                  )
                }
              >
                {llmInputTypes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.id} - {item.slug || item.description || 'input type'}
                  </option>
                ))}
              </select>
              <select
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                value={editingStep.llm_output_type_id}
                onChange={(event) =>
                  setEditingStep((current) =>
                    current ? { ...current, llm_output_type_id: event.target.value } : null
                  )
                }
              >
                {llmOutputTypes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.id} - {item.slug || item.description || 'output type'}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              className="mt-2 w-full min-h-16 rounded-md border border-slate-300 bg-white p-2 text-sm dark:border-slate-600 dark:bg-slate-900"
              value={editingStep.description}
              onChange={(event) =>
                setEditingStep((current) => (current ? { ...current, description: event.target.value } : null))
              }
            />
            <textarea
              className="mt-2 w-full min-h-24 rounded-md border border-slate-300 bg-white p-2 text-sm dark:border-slate-600 dark:bg-slate-900"
              value={editingStep.llm_system_prompt}
              onChange={(event) =>
                setEditingStep((current) =>
                  current ? { ...current, llm_system_prompt: event.target.value } : null
                )
              }
            />
            <textarea
              className="mt-2 w-full min-h-24 rounded-md border border-slate-300 bg-white p-2 text-sm dark:border-slate-600 dark:bg-slate-900"
              value={editingStep.llm_user_prompt}
              onChange={(event) =>
                setEditingStep((current) => (current ? { ...current, llm_user_prompt: event.target.value } : null))
              }
            />
            <div className="mt-2 flex gap-2">
              <button
                className="btn btn-primary"
                disabled={loading}
                onClick={() =>
                  runMutation(async () => {
                    await upsertStepFromForm(Number(editingStep.id), editingStep)
                  }, `Updated step #${editingStep.id}.`)
                }
              >
                Save selected step
              </button>
              <button className="btn" disabled={loading} onClick={() => setSelectedStepId(null)}>
                Close editor
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {errorMessage ? (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          {successMessage}
        </div>
      ) : null}
    </div>
  )
}
