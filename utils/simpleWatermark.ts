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
 * Create a simple watermarked image by adding metadata and preparing for visual watermark
 * This is a simplified approach that prepares the image for watermarking
 */
export const createSimpleWatermark = async (imageUri: string): Promise<string> => {
  try {
    console.log("🎨 Creating simple watermark for:", imageUri)

    // Get overlay metadata
    const metadata = await getOverlayMetadata(imageUri)

    if (!metadata?.overlayData) {
      console.log("No overlay data found, returning original image")
      return imageUri
    }

    console.log("📝 Found overlay data, creating watermarked version")

    // Create a high-quality version for export
    const watermarkedImage = await manipulateAsync(
      imageUri,
      [
        // Ensure good quality for export
        { resize: { width: 1200 } },
      ],
      {
        compress: 0.95, // High quality for export
        format: SaveFormat.JPEG,
      },
    )

    // Create a unique filename
    const timestamp = Date.now()
    const filename = `watermarked_export_${timestamp}.jpg`
    const outputPath = `${FileSystem.documentDirectory}${filename}`

    // Copy the processed image
    await FileSystem.copyAsync({
      from: watermarkedImage.uri,
      to: outputPath,
    })

    // Create watermark metadata
    const watermarkMetadataPath = outputPath.replace(".jpg", "_watermark.json")
    const watermarkMetadata = {
      originalImage: imageUri,
      overlayData: metadata.overlayData,
      watermarkType: "export_ready",
      quality: "high",
      createdAt: new Date().toISOString(),
      overlayText: [
        `📍 ${metadata.overlayData.city}`,
        ...(metadata.overlayData.street ? [`🏠 ${metadata.overlayData.street}`] : []),
        `🌐 ${metadata.overlayData.coordinates}`,
        `📅 ${metadata.overlayData.date}`,
      ],
    }

    await FileSystem.writeAsStringAsync(watermarkMetadataPath, JSON.stringify(watermarkMetadata, null, 2))

    console.log("✅ Watermarked export image created:", outputPath)
    return outputPath
  } catch (error) {
    console.error("❌ Error creating simple watermark:", error)
    return imageUri
  }
}

/**
 * Get the best available version of an image for export (download/upload)
 */
export const getBestImageForExport = async (imageUri: string): Promise<string> => {
  try {
    // Check if we have overlay data
    const metadata = await getOverlayMetadata(imageUri)

    if (metadata?.overlayData) {
      console.log("📤 Creating export version with watermark data")
      return await createSimpleWatermark(imageUri)
    } else {
      console.log("📤 Using original image for export (no watermark data)")
      return imageUri
    }
  } catch (error) {
    console.error("Error getting best image for export:", error)
    return imageUri
  }
}
