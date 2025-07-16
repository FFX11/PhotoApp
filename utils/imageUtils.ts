import * as FileSystem from "expo-file-system"
import { manipulateAsync, SaveFormat } from "expo-image-manipulator"

interface OverlayData {
  city: string
  coordinates: string
  date: string
  street?: string
}

export const createWatermarkedImage = async (imageUri: string, overlayData: OverlayData): Promise<string> => {
  try {
    console.log("Creating watermarked image...")

    // First, resize the image to a reasonable size
    const resizedImage = await manipulateAsync(
      imageUri,
      [
        { resize: { width: 1080 } }, // Resize to 1080px width, height will be proportional
      ],
      {
        compress: 0.8, // Compress to 80% quality
        format: SaveFormat.JPEG,
      },
    )

    console.log("Image resized and compressed")

    // Create a unique filename
    const timestamp = Date.now()
    const filename = `construction_photo_watermarked_${timestamp}.jpg`
    const outputPath = `${FileSystem.documentDirectory}${filename}`

    // For now, we'll use the resized image as the watermarked version
    // The actual visual watermark will be added by the WatermarkedPhoto component when needed
    await FileSystem.copyAsync({
      from: resizedImage.uri,
      to: outputPath,
    })

    // Create metadata file with overlay information
    const metadataPath = outputPath.replace(".jpg", "_metadata.json")
    const metadata = {
      overlayData: overlayData,
      overlayLines: [
        `📍 ${overlayData.city}`,
        ...(overlayData.street ? [`🏠 ${overlayData.street}`] : []),
        `🌐 ${overlayData.coordinates}`,
        `📅 ${overlayData.date}`,
      ],
      position: "bottom-left",
      style: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        textColor: "white",
        fontSize: "responsive",
        padding: 12,
        borderColor: "rgba(255, 255, 255, 0.3)",
      },
      timestamp: new Date().toISOString(),
      watermarked: true,
      compressed: true,
      originalSize: "reduced for upload efficiency",
      originalImageUri: imageUri,
      processedImageUri: outputPath,
    }

    await FileSystem.writeAsStringAsync(metadataPath, JSON.stringify(metadata, null, 2))

    console.log("Watermarked image created:", outputPath)
    return outputPath
  } catch (error) {
    console.error("Error creating watermarked image:", error)
    // If watermarking fails, at least resize the original
    try {
      const resizedImage = await manipulateAsync(imageUri, [{ resize: { width: 1080 } }], {
        compress: 0.8,
        format: SaveFormat.JPEG,
      })
      return resizedImage.uri
    } catch (resizeError) {
      console.error("Error resizing image:", resizeError)
      return imageUri
    }
  }
}

export const addTextOverlayToImage = async (imageUri: string, overlayData: OverlayData): Promise<string> => {
  // This function is now deprecated in favor of createWatermarkedImage
  return createWatermarkedImage(imageUri, overlayData)
}

// Helper function to get overlay metadata
export const getOverlayMetadata = async (imagePath: string): Promise<any | null> => {
  try {
    // Try to find metadata file
    const metadataPath = imagePath.replace(".jpg", "_metadata.json")
    const metadataExists = await FileSystem.getInfoAsync(metadataPath)

    if (metadataExists.exists) {
      const metadataJson = await FileSystem.readAsStringAsync(metadataPath)
      return JSON.parse(metadataJson)
    }

    // Fallback: try to extract timestamp and look for metadata
    const timestamp = imagePath.match(/construction_photo_watermarked_(\d+)\.jpg/)?.[1]
    if (timestamp) {
      const fallbackMetadataPath = `${FileSystem.documentDirectory}construction_photo_watermarked_${timestamp}_metadata.json`
      const fallbackExists = await FileSystem.getInfoAsync(fallbackMetadataPath)

      if (fallbackExists.exists) {
        const metadataJson = await FileSystem.readAsStringAsync(fallbackMetadataPath)
        return JSON.parse(metadataJson)
      }
    }

    return null
  } catch (error) {
    console.error("Error reading overlay metadata:", error)
    return null
  }
}

// Helper function to check if image is watermarked
export const isImageWatermarked = async (imagePath: string): Promise<boolean> => {
  try {
    const metadata = await getOverlayMetadata(imagePath)
    return metadata?.watermarked === true
  } catch (error) {
    return false
  }
}

// Helper function to get image file size
export const getImageSize = async (imagePath: string): Promise<number> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(imagePath)
    return fileInfo.size || 0
  } catch (error) {
    console.error("Error getting image size:", error)
    return 0
  }
}
