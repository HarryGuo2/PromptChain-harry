'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import {
  assertSupportedImageContentType,
  generateCaptionsWithRestApi,
  generatePresignedUrl,
  registerImageUrl,
  uploadImageToPresignedUrl,
} from '@/lib/prompt-chain-api'

interface FlavorOption {
  id: number
  slug: string
}

interface TestRunnerFormProps {
  flavors: FlavorOption[]
}

type PipelineStep =
  | 'idle'
  | 'auth'
  | 'presign'
  | 'upload'
  | 'register'
  | 'generate'
  | 'done'

export function TestRunnerForm({ flavors }: TestRunnerFormProps) {
  const supabase = useMemo(() => createClient(), [])
  const [selectedFlavorId, setSelectedFlavorId] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [pipelineStep, setPipelineStep] = useState<PipelineStep>('idle')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [resultJson, setResultJson] = useState<unknown>(null)
  const [registeredImageId, setRegisteredImageId] = useState<string | null>(null)
  const [uploadedCdnUrl, setUploadedCdnUrl] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const onRun = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)
    setResultJson(null)
    setRegisteredImageId(null)
    setUploadedCdnUrl(null)
    setSuccessMessage(null)

    if (!selectedFile) {
      setErrorMessage('Choose an image file first.')
      return
    }

    try {
      assertSupportedImageContentType(selectedFile.type)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unsupported image type.')
      return
    }

    setIsSubmitting(true)
    try {
      setPipelineStep('auth')
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const accessToken = session?.access_token
      if (!accessToken) {
        throw new Error('Missing Supabase access token. Please sign in again.')
      }

      setPipelineStep('presign')
      const { presignedUrl, cdnUrl } = await generatePresignedUrl(accessToken, selectedFile.type)
      setUploadedCdnUrl(cdnUrl)

      setPipelineStep('upload')
      await uploadImageToPresignedUrl(presignedUrl, selectedFile)

      setPipelineStep('register')
      const { imageId } = await registerImageUrl(accessToken, cdnUrl)
      setRegisteredImageId(imageId)

      setPipelineStep('generate')
      const payload = {
        imageId,
        ...(selectedFlavorId ? { humorFlavorId: Number(selectedFlavorId) } : {}),
      }
      const response = await generateCaptionsWithRestApi(accessToken, payload)
      setResultJson(response)
      setPipelineStep('done')
      setSuccessMessage('Caption pipeline completed successfully.')
    } catch (error) {
      setPipelineStep('idle')
      setErrorMessage(error instanceof Error ? error.message : 'Failed to run caption pipeline.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="card space-y-4">
      <h2 className="text-lg font-semibold">Test Controls</h2>
      <form className="space-y-4" onSubmit={onRun}>
        <div>
          <label className="block text-sm mb-1" htmlFor="flavor-id">
            Humor flavor (optional)
          </label>
          <select
            id="flavor-id"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
            value={selectedFlavorId}
            onChange={(event) => setSelectedFlavorId(event.target.value)}
          >
            <option value="">Use API default behavior</option>
            {flavors.map((flavor) => (
              <option key={flavor.id} value={flavor.id}>
                #{flavor.id} - {flavor.slug}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1" htmlFor="image-file">
            Test image
          </label>
          <input
            id="image-file"
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic"
            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
          />
          {selectedFile ? (
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              Selected file: {selectedFile.name}
            </p>
          ) : null}
        </div>

        <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Running pipeline...' : 'Generate captions'}
        </button>
      </form>

      <div className="text-sm text-slate-600 dark:text-slate-300">
        Current step:{' '}
        <span className="font-medium">
          {pipelineStep === 'idle' ? 'waiting' : pipelineStep}
        </span>
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

      {uploadedCdnUrl ? (
        <div className="text-sm">
          Uploaded CDN URL: <span className="font-mono break-all">{uploadedCdnUrl}</span>
        </div>
      ) : null}

      {registeredImageId ? (
        <div className="text-sm">
          Registered image ID: <span className="font-mono">{registeredImageId}</span>
        </div>
      ) : null}

      {resultJson ? (
        <div className="space-y-2">
          <h3 className="font-medium">API response</h3>
          <pre className="max-h-96 overflow-auto rounded-md border border-slate-300 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-900">
            {JSON.stringify(resultJson, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  )
}
