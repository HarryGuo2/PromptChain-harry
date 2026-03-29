const allowedImageContentTypes = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
])

function getApiBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_PROMPT_CHAIN_API_BASE_URL
  if (!baseUrl) {
    throw new Error('Missing NEXT_PUBLIC_PROMPT_CHAIN_API_BASE_URL')
  }
  return baseUrl
}

function getAuthHeaders(jwtAccessToken: string) {
  return {
    Authorization: `Bearer ${jwtAccessToken}`,
    ...(process.env.NEXT_PUBLIC_PROMPT_CHAIN_API_KEY
      ? { 'x-api-key': process.env.NEXT_PUBLIC_PROMPT_CHAIN_API_KEY }
      : {}),
  }
}

export function assertSupportedImageContentType(contentType: string) {
  if (!allowedImageContentTypes.has(contentType)) {
    throw new Error(
      `Unsupported image content type: ${contentType}. Supported types: ${Array.from(
        allowedImageContentTypes
      ).join(', ')}`
    )
  }
}

export interface PresignedUploadResponse {
  presignedUrl: string
  cdnUrl: string
}

export async function generatePresignedUrl(
  jwtAccessToken: string,
  contentType: string
): Promise<PresignedUploadResponse> {
  assertSupportedImageContentType(contentType)

  const response = await fetch(`${getApiBaseUrl()}/pipeline/generate-presigned-url`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(jwtAccessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ contentType }),
  })

  if (!response.ok) {
    throw new Error(`Presigned URL error ${response.status}: ${await response.text()}`)
  }

  return response.json()
}

export async function uploadImageToPresignedUrl(
  presignedUrl: string,
  file: File
): Promise<void> {
  const response = await fetch(presignedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
    },
    body: file,
  })

  if (!response.ok) {
    throw new Error(`Upload error ${response.status}: ${await response.text()}`)
  }
}

export interface RegisterImageResponse {
  imageId: string
  now: number
}

export async function registerImageUrl(
  jwtAccessToken: string,
  imageUrl: string
): Promise<RegisterImageResponse> {
  const response = await fetch(`${getApiBaseUrl()}/pipeline/upload-image-from-url`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(jwtAccessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageUrl,
      isCommonUse: false,
    }),
  })

  if (!response.ok) {
    throw new Error(`Register image error ${response.status}: ${await response.text()}`)
  }

  return response.json()
}

export interface GenerateCaptionsPayload {
  imageId: string
  humorFlavorId?: number
}

export async function generateCaptionsWithRestApi(
  jwtAccessToken: string,
  payload: GenerateCaptionsPayload
) {
  const response = await fetch(`${getApiBaseUrl()}/pipeline/generate-captions`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(jwtAccessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Generate captions error ${response.status}: ${await response.text()}`)
  }

  return response.json()
}
