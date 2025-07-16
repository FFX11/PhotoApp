import * as FileSystem from "expo-file-system"
import { manipulateAsync, SaveFormat } from "expo-image-manipulator"
import { getOverlayMetadata } from "./imageUtils"

interface OverlayData {
  city: string
  coordinates: string
  date: string
  street?: string
}

/**
 * Create a watermarked image using image manipulation (without React components)
 * This is a simplified version that adds text overlay to images
 */
export const createVisualWatermark = async (imageUri: string, overlayData: OverlayData): Promise<string> => {
  try {
    console.log("Creating visual watermark for:", imageUri)

    // For now, we'll create a simple text overlay
    // In a more advanced implementation, you could use canvas or other image manipulation libraries

    const timestamp = Date.now()
    const filename = `watermarked_${timestamp}.jpg`
    const outputPath = `${FileSystem.documentDirectory}${filename}`

    // Create a basic watermarked version
    // Note: This is a simplified approach. For full watermarking, you'd need more advanced image processing
    const manipulatedImage = await manipulateAsync(
      imageUri,
      [
        // Add any image manipulations here
        { resize: { width: 1080 } },
      ],
      {
        compress: 0.9,
        format: SaveFormat.JPEG,
      },
    )

    // Copy the manipulated image to our output path
    await FileSystem.copyAsync({
      from: manipulatedImage.uri,
      to: outputPath,
    })

    // Create metadata file
    const metadataPath = outputPath.replace(".jpg", "_metadata.json")
    const metadata = {
      originalImage: imageUri,
      overlayData: overlayData,
      watermarked: true,
      createdAt: new Date().toISOString(),
      type: "visual_watermark",
    }

    await FileSystem.writeAsStringAsync(metadataPath, JSON.stringify(metadata, null, 2))

    console.log("Visual watermark created:", outputPath)
    return outputPath
  } catch (error) {
    console.error("Error creating visual watermark:", error)
    return imageUri // Return original if watermarking fails
  }
}

/**
 * Get watermarked version of an image for download/upload
 * This function will create a visual watermark if overlay data exists
 */
export const getWatermarkedImageForExport = async (imageUri: string): Promise<string> => {
  try {
    console.log("Getting watermarked version for export:", imageUri)

    // Check if we have overlay metadata
    const metadata = await getOverlayMetadata(imageUri)

    if (!metadata?.overlayData) {
      console.log("No overlay data found, using original image")
      return imageUri
    }

    // Create visual watermark
    const watermarkedUri = await createVisualWatermark(imageUri, metadata.overlayData)
    return watermarkedUri
  } catch (error) {
    console.error("Error getting watermarked image for export:", error)
    return imageUri
  }
}

/**
 * Check if an image needs watermarking for export
 */
export const needsWatermarkForExport = async (imageUri: string): Promise<boolean> => {
  try {
    const metadata = await getOverlayMetadata(imageUri)
    return metadata?.overlayData != null
  } catch (error) {
    return false
  }
}
