/**
 * Compress an image file using the Canvas API.
 * Only compresses if the file is larger than the threshold (default 500KB).
 * Outputs as WebP for best size/quality ratio, falling back to JPEG.
 */

const DEFAULT_THRESHOLD = 500 * 1024 // 500KB
const MAX_DIMENSION = 2048 // Max width or height
const INITIAL_QUALITY = 0.85

export async function compressImage(
  file: File,
  threshold: number = DEFAULT_THRESHOLD,
): Promise<File> {
  // Skip compression for small files or non-image types
  if (file.size <= threshold || !file.type.startsWith('image/')) {
    return file
  }

  // Skip GIFs (animated) - can't compress without losing frames
  if (file.type === 'image/gif') {
    return file
  }

  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      // Calculate dimensions (scale down if too large)
      let { width, height } = img
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(file)
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      // Try WebP first (better compression), fallback to JPEG
      const outputType = 'image/webp'
      const fallbackType = 'image/jpeg'

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            // If compression didn't help, try fallback format
            canvas.toBlob(
              (fallbackBlob) => {
                if (!fallbackBlob || fallbackBlob.size >= file.size) {
                  // Compression didn't reduce size, return original
                  resolve(file)
                  return
                }
                const ext = fallbackType === 'image/jpeg' ? '.jpg' : '.webp'
                const newName = file.name.replace(/\.[^.]+$/, ext)
                resolve(new File([fallbackBlob], newName, { type: fallbackType }))
              },
              fallbackType,
              INITIAL_QUALITY,
            )
            return
          }

          const newName = file.name.replace(/\.[^.]+$/, '.webp')
          resolve(new File([blob], newName, { type: outputType }))
        },
        outputType,
        INITIAL_QUALITY,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file) // Return original on error
    }

    img.src = url
  })
}
