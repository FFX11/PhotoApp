"use client"

import { useState } from "react"
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { usePhotoContext } from "../context/PhotoContext"
import { useAuthContext } from "../context/AuthContext"
import { Trash2, Upload, MapPin, Download, Clock } from "lucide-react-native"
import { formatDistanceToNow } from "date-fns"
import * as MediaLibrary from "expo-media-library"
import type { NavigationProp } from "@react-navigation/native"
import type { RootStackParamList } from "../types/navigation"

type GalleryScreenNavigationProp = NavigationProp<RootStackParamList>

export default function GalleryScreen() {
  const { photos, deletePhoto, markForUpload } = usePhotoContext()
  const { user, canDelete, canDownload, canViewSensitiveData } = useAuthContext()
  const navigation = useNavigation<GalleryScreenNavigationProp>()
  const [refreshing, setRefreshing] = useState(false)
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set())

  const handleRefresh = () => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 1000)
  }

  const handleDeletePhoto = (photo: any) => {
    if (!canDelete(photo)) {
      console.log("Permission denied: Can only delete own photos within 24 hours")
      return
    }

    deletePhoto(photo.id)
  }

  const handleMarkForUpload = (photo: any) => {
    markForUpload(photo.id)
    console.log("Photo marked for upload")
  }

  const handleDownloadPhoto = async (photo: any) => {
    if (!canDownload()) {
      console.log("Permission denied: Only supervisors and admins can download photos")
      return
    }

    setDownloadingIds((prev) => new Set(prev).add(photo.id))

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync()

      if (status !== "granted") {
        console.log("Media library permission required")
        return
      }

      console.log("📥 Downloading photo:", photo.uri)
      const asset = await MediaLibrary.createAssetAsync(photo.uri)

      let album = await MediaLibrary.getAlbumAsync("Construction Photos")
      if (!album) {
        album = await MediaLibrary.createAlbumAsync("Construction Photos", asset, false)
      } else {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false)
      }

      console.log("✅ Photo downloaded successfully")
    } catch (error) {
      console.error("Error downloading photo:", error)
    } finally {
      setDownloadingIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(photo.id)
        return newSet
      })
    }
  }

  const renderItem = ({ item }: { item: any }) => {
    const timeAgo = formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })
    const isDownloading = downloadingIds.has(item.id)

    return (
      <TouchableOpacity
        style={styles.photoCard}
        onPress={() => navigation.navigate("PhotoDetail", { photoId: item.id })}
      >
        <View style={styles.imageContainer}>
          <Image source={{ uri: item.uri }} style={styles.thumbnail} />
          {item.uploaded && (
            <View style={styles.uploadedBadge}>
              <Text style={styles.uploadedBadgeText}>✓</Text>
            </View>
          )}
        </View>

        <View style={styles.photoInfo}>
          <View style={styles.photoHeader}>
            <Text style={styles.photoDate}>{timeAgo}</Text>
            <View style={styles.statusContainer}>
              {item.uploaded ? (
                <Text style={styles.uploadedText}>Uploaded</Text>
              ) : (
                <Text style={styles.notUploadedText}>Local</Text>
              )}
            </View>
          </View>

          {canViewSensitiveData() && item.cityInfo && (
            <View style={styles.locationContainer}>
              <MapPin size={12} color="#8a8a8a" />
              <Text style={styles.locationText} numberOfLines={1}>
                {item.cityInfo}
              </Text>
            </View>
          )}

          {item.uploadedAt && (
            <View style={styles.uploadTimeContainer}>
              <Clock size={12} color="#8a8a8a" />
              <Text style={styles.uploadTimeText}>
                Uploaded {formatDistanceToNow(new Date(item.uploadedAt), { addSuffix: true })}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actionButtons}>
          {!item.uploaded && (
            <TouchableOpacity
              style={[styles.actionButton, styles.uploadButton]}
              onPress={() => handleMarkForUpload(item)}
            >
              <Upload size={16} color="#b8860b" />
            </TouchableOpacity>
          )}

          {canDownload() && (
            <TouchableOpacity
              style={[styles.actionButton, styles.downloadButton]}
              onPress={() => handleDownloadPhoto(item)}
              disabled={isDownloading}
            >
              {isDownloading ? <ActivityIndicator size={16} color="#b8860b" /> : <Download size={16} color="#b8860b" />}
            </TouchableOpacity>
          )}

          {canDelete(item) && (
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDeletePhoto(item)}
            >
              <Trash2 size={16} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      {photos.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No photos yet</Text>
          <Text style={styles.emptyStateSubtext}>Take some photos using the camera</Text>
        </View>
      ) : (
        <FlatList
          data={photos.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#3a3a3a",
  },
  list: {
    padding: 16,
  },
  photoCard: {
    backgroundColor: "#4a4a4a",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#5a5a5a",
  },
  imageContainer: {
    position: "relative",
  },
  thumbnail: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  uploadedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#b8860b",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  uploadedBadgeText: {
    color: "#3a3a3a",
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: "Lato",
  },
  photoInfo: {
    padding: 12,
  },
  photoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  photoDate: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#b8860b",
    fontFamily: "Lato",
  },
  statusContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#5a5a5a",
  },
  uploadedText: {
    fontSize: 11,
    color: "#b8860b",
    fontWeight: "500",
    fontFamily: "Lato",
  },
  notUploadedText: {
    fontSize: 11,
    color: "#f59e0b",
    fontWeight: "500",
    fontFamily: "Lato",
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  locationText: {
    fontSize: 12,
    color: "#8a8a8a",
    marginLeft: 4,
    flex: 1,
    fontFamily: "Lato",
  },
  uploadTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  uploadTimeText: {
    fontSize: 11,
    color: "#8a8a8a",
    marginLeft: 4,
    fontFamily: "Lato",
  },
  actionButtons: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#5a5a5a",
  },
  actionButton: {
    flex: 1,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadButton: {
    borderRightWidth: 1,
    borderRightColor: "#5a5a5a",
  },
  downloadButton: {
    borderRightWidth: 1,
    borderRightColor: "#5a5a5a",
  },
  deleteButton: {},
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#b8860b",
    fontFamily: "Lato",
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#8a8a8a",
    marginTop: 8,
    textAlign: "center",
    fontFamily: "Lato",
  },
})
