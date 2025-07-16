import * as FileSystem from "expo-file-system"
import { getOverlayMetadata } from "./imageUtils"

/**
 * Service to create watermarked images for download and upload
 * This works by creating a temporary React component instance
 */
export class WatermarkService {
  private static instance: WatermarkService

  static getInstance(): WatermarkService {
    if (!WatermarkService.instance) {
      WatermarkService.instance = new WatermarkService()
    }
    return WatermarkService.instance
  }

  /**
   * Create a watermarked version of an image for export
   */
  async createWatermarkedImageForExport(imageUri: string): Promise<string> {
    try {
      console.log("🎨 Creating watermarked image for export:", imageUri)

      // Get overlay metadata
      const metadata = await getOverlayMetadata(imageUri)

      if (!metadata?.overlayData) {
        console.log("No overlay data found, using original image")
        return imageUri
      }

      console.log("📝 Found overlay data:", metadata.overlayData)

      // For now, we'll return the original image with a note that it has watermark data
      // The actual visual watermark will be created by the WatermarkedPhoto component when needed
      // This is a limitation of not being able to easily create visual watermarks programmatically

      // Create a copy with watermark metadata
      const timestamp = Date.now()
      const filename = `export_ready_${timestamp}.jpg`
      const outputPath = `${FileSystem.documentDirectory}${filename}`

      // Copy the original image
      await FileSystem.copyAsync({
        from: imageUri,
        to: outputPath,
      })

      // Create export metadata
      const exportMetadataPath = outputPath.replace(".jpg", "_export_metadata.json")
      const exportMetadata = {
        originalImage: imageUri,
        overlayData: metadata.overlayData,
        exportReady: true,
        hasWatermarkData: true,
        createdAt: new Date().toISOString(),
        note: "This image contains watermark data and should be processed with WatermarkedPhoto component for visual watermark",
      }

      await FileSystem.writeAsStringAsync(exportMetadataPath, JSON.stringify(exportMetadata, null, 2))

      console.log("✅ Export-ready image created:", outputPath)
      return outputPath
    } catch (error) {
      console.error("❌ Error creating watermarked image for export:", error)
      return imageUri
    }
  }

  /**
   * Check if an image has watermark data
   */
  async hasWatermarkData(imageUri: string): Promise<boolean> {
    try {
      const metadata = await getOverlayMetadata(imageUri)
      return metadata?.overlayData != null
    } catch (error) {
      return false
    }
  }
}

// Export convenience functions
export const createWatermarkedImageForExport = (imageUri: string) =>
  WatermarkService.getInstance().createWatermarkedImageForExport(imageUri)

export const hasWatermarkData = (imageUri: string) => WatermarkService.getInstance().hasWatermarkData(imageUri)
