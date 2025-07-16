"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native"
import { usePhotoContext } from "../context/PhotoContext"
import { useAuthContext } from "../context/AuthContext"
import { CheckCircle, XCircle, Upload, WifiOff, Wifi, X } from "lucide-react-native"
import NetInfo from "@react-native-community/netinfo"
import { uploadToNextcloud } from "../utils/nextcloudUtils"
import { getOverlayMetadata } from "../utils/imageUtils"

export default function UploadScreen() {
  const { photos, markAsUploaded } = usePhotoContext()
  const { user } = useAuthContext()
  const [isConnected, setIsConnected] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [shouldCancel, setShouldCancel] = useState(false)

  // Only show photos that are marked for upload (pendingUpload: true) and not already uploaded
  const photosToUpload = photos.filter((photo) => photo.pendingUpload && !photo.uploaded)

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? false)
    })

    NetInfo.fetch().then((state) => {
      setIsConnected(state.isConnected ?? false)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const cancelUpload = () => {
    console.log("🛑 Upload cancellation requested by user")
    setShouldCancel(true)
  }

  const handleUploadAll = async () => {
    if (!isConnected) {
      console.log("❌ No internet connection available")
      return
    }

    if (photosToUpload.length === 0) {
      console.log("ℹ️ No photos marked for upload")
      return
    }

    console.log(`🚀 Starting upload of ${photosToUpload.length} photos marked for upload`)
    setIsUploading(true)
    setShouldCancel(false)

    const initialProgress: Record<string, number> = {}
    photosToUpload.forEach((photo) => {
      initialProgress[photo.id] = 0
    })
    setUploadProgress(initialProgress)

    let uploadedCount = 0
    let failedCount = 0

    try {
      for (let i = 0; i < photosToUpload.length; i++) {
        const photo = photosToUpload[i]

        // Check if user cancelled
        if (shouldCancel) {
          console.log("🛑 Upload cancelled by user")
          break
        }

        console.log(`📤 Uploading photo ${i + 1}/${photosToUpload.length}: ${photo.id}`)

        try {
          setUploadProgress((prev) => ({
            ...prev,
            [photo.id]: 5,
          }))

          // Get metadata if available
          let metadata = null
          try {
            metadata = await getOverlayMetadata(photo.uri)
            if (metadata?.overlayData) {
              console.log("📝 Photo has overlay data")
            }
          } catch (error) {
            console.log("ℹ️ No overlay metadata found")
          }

          setUploadProgress((prev) => ({
            ...prev,
            [photo.id]: 10,
          }))

          // Upload the photo
          await uploadToNextcloud(photo, user, (progress) => {
            setUploadProgress((prev) => ({
              ...prev,
              [photo.id]: progress,
            }))
          })

          // Mark as uploaded
          await markAsUploaded(photo.id)

          setUploadProgress((prev) => ({
            ...prev,
            [photo.id]: 100,
          }))

          uploadedCount++
          console.log(`✅ Photo ${i + 1}/${photosToUpload.length} uploaded successfully`)
        } catch (error) {
          console.error(`❌ Error uploading photo ${photo.id}:`, error)
          failedCount++

          setUploadProgress((prev) => ({
            ...prev,
            [photo.id]: -1,
          }))
        }
      }

      if (shouldCancel) {
        console.log(`🛑 Upload cancelled. Uploaded: ${uploadedCount}, Failed: ${failedCount}`)
      } else {
        console.log(`✅ Upload completed. Uploaded: ${uploadedCount}, Failed: ${failedCount}`)
      }
    } catch (error) {
      console.error("❌ Error during upload process:", error)
    } finally {
      setIsUploading(false)
      setShouldCancel(false)
      // Keep progress visible for a moment, then clear
      setTimeout(() => {
        setUploadProgress({})
      }, 2000)
    }
  }

  const renderItem = ({ item }: { item: any }) => {
    const progress = uploadProgress[item.id] || 0

    return (
      <View style={styles.photoItem}>
        <View style={styles.photoInfo}>
          <Text style={styles.photoDate}>{new Date(item.timestamp).toLocaleString()}</Text>
          <Text style={styles.photoLocation} numberOfLines={1}>
            {item.cityInfo || "Location data"}
          </Text>
          <Text style={styles.photoStatus}>Marked for upload</Text>
        </View>

        <View style={styles.uploadStatus}>
          {isUploading && progress > 0 && progress < 100 ? (
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${progress}%` }]} />
              <Text style={styles.progressText}>{progress}%</Text>
            </View>
          ) : progress === 100 ? (
            <CheckCircle size={24} color="#10b981" />
          ) : progress === -1 ? (
            <XCircle size={24} color="#ef4444" />
          ) : (
            <Text style={styles.waitingText}>Ready</Text>
          )}
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.connectionStatus}>
          {isConnected ? (
            <View style={styles.connectedContainer}>
              <Wifi size={16} color="#10b981" />
              <Text style={styles.connectedText}>Connected</Text>
            </View>
          ) : (
            <View style={styles.disconnectedContainer}>
              <WifiOff size={16} color="#ef4444" />
              <Text style={styles.disconnectedText}>No Connection</Text>
            </View>
          )}
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>Photos Marked for Upload</Text>
          <Text style={styles.count}>{photosToUpload.length} photos</Text>
        </View>
      </View>

      {photosToUpload.length === 0 ? (
        <View style={styles.emptyState}>
          <Upload size={48} color="#b8860b" />
          <Text style={styles.emptyStateText}>No photos marked for upload</Text>
          <Text style={styles.emptyStateSubtext}>
            Go to Gallery and mark photos for upload by tapping the upload button on each photo
          </Text>
        </View>
      ) : (
        <FlatList
          data={photosToUpload}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}

      <View style={styles.buttonContainer}>
        {isUploading && (
          <TouchableOpacity style={styles.cancelButton} onPress={cancelUpload}>
            <X size={20} color="#ef4444" />
            <Text style={styles.cancelButtonText}>Cancel Upload</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.uploadButton,
            (!isConnected || photosToUpload.length === 0 || isUploading) && styles.uploadButtonDisabled,
          ]}
          onPress={handleUploadAll}
          disabled={!isConnected || photosToUpload.length === 0 || isUploading}
        >
          {isUploading ? <ActivityIndicator color="#3a3a3a" size="small" /> : <Upload size={20} color="#3a3a3a" />}
          <Text style={styles.uploadButtonText}>
            {isUploading ? "Uploading..." : `Upload ${photosToUpload.length} Photos`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#3a3a3a",
  },
  header: {
    backgroundColor: "#4a4a4a",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#5a5a5a",
  },
  connectionStatus: {
    marginBottom: 12,
  },
  connectedContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  connectedText: {
    color: "#10b981",
    fontWeight: "500",
    fontSize: 14,
    marginLeft: 6,
    fontFamily: "Lato",
  },
  disconnectedContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  disconnectedText: {
    color: "#ef4444",
    fontWeight: "500",
    fontSize: 14,
    marginLeft: 6,
    fontFamily: "Lato",
  },
  titleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#b8860b",
    fontFamily: "Lato",
  },
  count: {
    fontSize: 14,
    color: "#b8860b",
    backgroundColor: "#5a5a5a",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontFamily: "Lato",
  },
  list: {
    padding: 16,
  },
  photoItem: {
    flexDirection: "row",
    backgroundColor: "#4a4a4a",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#5a5a5a",
  },
  photoInfo: {
    flex: 1,
  },
  photoDate: {
    fontSize: 14,
    fontWeight: "600",
    color: "#b8860b",
    fontFamily: "Lato",
  },
  photoLocation: {
    fontSize: 12,
    color: "#8a8a8a",
    marginTop: 4,
    fontFamily: "Lato",
  },
  photoStatus: {
    fontSize: 10,
    color: "#10b981",
    marginTop: 2,
    fontWeight: "500",
    fontFamily: "Lato",
  },
  uploadStatus: {
    width: 80,
    alignItems: "center",
  },
  progressContainer: {
    width: 60,
    height: 6,
    backgroundColor: "#5a5a5a",
    borderRadius: 3,
    overflow: "hidden",
    position: "relative",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#b8860b",
  },
  progressText: {
    fontSize: 10,
    color: "#8a8a8a",
    marginTop: 4,
    fontFamily: "Lato",
  },
  waitingText: {
    fontSize: 12,
    color: "#b8860b",
    fontWeight: "500",
    fontFamily: "Lato",
  },
  buttonContainer: {
    padding: 16,
    gap: 12,
  },
  cancelButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#ef4444",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#ef4444",
    fontWeight: "bold",
    marginLeft: 8,
    fontSize: 16,
    fontFamily: "Lato",
  },
  uploadButton: {
    backgroundColor: "#b8860b",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  uploadButtonDisabled: {
    backgroundColor: "#6a6a6a",
  },
  uploadButtonText: {
    color: "#3a3a3a",
    fontWeight: "bold",
    marginLeft: 8,
    fontSize: 16,
    fontFamily: "Lato",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#b8860b",
    marginTop: 16,
    fontFamily: "Lato",
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#8a8a8a",
    marginTop: 8,
    textAlign: "center",
    fontFamily: "Lato",
    lineHeight: 20,
  },
})
