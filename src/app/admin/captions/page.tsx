import { requireAdminUser } from '@/lib/admin-auth'

const PAGE_SIZE = 25

type SearchParamsInput =
  | Promise<Record<string, string | string[] | undefined>>
  | Record<string, string | string[] | undefined>
  | undefined

function asSingleValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0]
  return value
}

function toPositiveInt(value: string | undefined, fallback: number) {
  if (!value) return fallback
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) return fallback
  return parsed
}

export default async function CaptionsPage({ searchParams }: { searchParams?: SearchParamsInput }) {
  const { supabase } = await requireAdminUser()
  const resolvedSearchParams = await Promise.resolve(searchParams)

  const selectedFlavorId = toPositiveInt(asSingleValue(resolvedSearchParams?.flavorId), 0)
  const currentPage = toPositiveInt(asSingleValue(resolvedSearchParams?.page), 1)
  const rangeFrom = (currentPage - 1) * PAGE_SIZE
  const rangeTo = rangeFrom + PAGE_SIZE - 1

  let captionsQuery = supabase
    .from('captions')
    .select('id, content, humor_flavor_id, created_datetime_utc', { count: 'exact' })
    .order('created_datetime_utc', { ascending: false })
    .range(rangeFrom, rangeTo)

  if (selectedFlavorId > 0) {
    captionsQuery = captionsQuery.eq('humor_flavor_id', selectedFlavorId)
  }

  const [{ data: captions, count }, { data: flavors }] = await Promise.all([
    captionsQuery,
    supabase
      .from('humor_flavors')
      .select('id, slug')
      .order('slug', { ascending: true })
      .limit(50000),
  ])

  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const hasPreviousPage = currentPage > 1
  const hasNextPage = currentPage < totalPages

  const buildPageHref = (page: number) => {
    const params = new URLSearchParams()
    if (selectedFlavorId > 0) {
      params.set('flavorId', String(selectedFlavorId))
    }
    params.set('page', String(page))
    return `/admin/captions?${params.toString()}`
  }

  const flavorOptions = flavors || []
  type CaptionRow = {
    id: string
    content: string | null
    humor_flavor_id: number | null
    created_datetime_utc: string
  }

  return (
    <main className="container space-y-4">
      <div className="card">
        <h1 className="text-2xl font-bold">Caption History</h1>
        <p className="text-slate-600 mt-1">
          Browse saved caption results, filter by flavor, and page through history.
        </p>
      </div>
      <div className="card">
        <form className="mb-4 flex items-end gap-2" action="/admin/captions" method="GET">
          <div>
            <label className="mb-1 block text-sm" htmlFor="flavorId">
              Humor flavor
            </label>
            <select
              id="flavorId"
              name="flavorId"
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
              defaultValue={selectedFlavorId > 0 ? String(selectedFlavorId) : ''}
            >
              <option value="">All flavors</option>
              {flavorOptions.map((flavor: { id: number; slug: string }) => (
                <option key={flavor.id} value={flavor.id}>
                  #{flavor.id} - {flavor.slug}
                </option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" type="submit">
            Apply filter
          </button>
          <a className="btn" href="/admin/captions">
            Clear
          </a>
        </form>

        <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
          Active flavor filter:{' '}
          <span className="font-medium">
            {selectedFlavorId > 0
              ? `#${selectedFlavorId}`
              : 'All flavors'}
          </span>
        </p>

        <div className="space-y-2 text-sm">
          {(captions || []).map((item: CaptionRow) => (
            <div key={item.id} className="border-b border-slate-200 pb-2">
              <div className="font-medium">{item.content || '(empty caption)'}</div>
              <div className="text-slate-500">
                flavor #{item.humor_flavor_id} • {new Date(item.created_datetime_utc).toLocaleString()}
              </div>
            </div>
          ))}
          {(captions || []).length === 0 ? (
            <div className="text-slate-600 dark:text-slate-300">No captions found for this filter.</div>
          ) : null}
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm">
          <a
            className={`btn ${hasPreviousPage ? '' : 'pointer-events-none opacity-50'}`}
            href={hasPreviousPage ? buildPageHref(currentPage - 1) : '#'}
          >
            Previous
          </a>
          <span>
            Page {Math.min(currentPage, totalPages)} of {totalPages} ({totalCount} total)
          </span>
          <a
            className={`btn ${hasNextPage ? '' : 'pointer-events-none opacity-50'}`}
            href={hasNextPage ? buildPageHref(currentPage + 1) : '#'}
          >
            Next
          </a>
        </div>
      </div>
    </main>
  )
}
