"use client"

import { useState, useRef, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Image,
  Dimensions,
  TextInput,
  FlatList,
} from "react-native"
import { WebView } from "react-native-webview"
import { usePhotoContext } from "../context/PhotoContext"
import { X, Search, ChevronDown, ChevronUp } from "lucide-react-native"
import { format } from "date-fns"

const { width: screenWidth, height: screenHeight } = Dimensions.get("window")

export default function MapScreen() {
  const { photos } = usePhotoContext()
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [coordsInput, setCoordsInput] = useState("")
  const [showSearchPanel, setShowSearchPanel] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState("Initializing...")
  const webViewRef = useRef<WebView>(null)
  const [cityFilter, setCityFilter] = useState("")

  // Get photos with GPS coordinates, sorted by newest first
  const photosWithLocation = photos
    .filter((photo) => photo.location?.latitude && photo.location?.longitude)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // Filter photos by city/location search
  const filteredPhotos = photosWithLocation.filter((photo) => {
    if (!cityFilter.trim()) return true
    const searchTerm = cityFilter.toLowerCase()
    const cityInfo = (photo.cityInfo || "").toLowerCase()
    const notes = (photo.notes || "").toLowerCase()
    return cityInfo.includes(searchTerm) || notes.includes(searchTerm)
  })

  console.log("📍 Photos with location:", photosWithLocation.length)

  // Force stop loading after 10 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      console.log("⏰ Force stopping loading after 10 seconds")
      setIsLoading(false)
      setLoadingStatus("Map loaded (timeout)")
    }, 10000)

    return () => clearTimeout(timeout)
  }, [])

  // Update map when filter changes
  useEffect(() => {
    if (!isLoading && webViewRef.current) {
      const message = {
        type: "ADD_PHOTOS",
        photos: filteredPhotos.map((photo) => ({
          id: photo.id,
          lat: photo.location.latitude,
          lng: photo.location.longitude,
          uri: photo.uri,
          title: photo.cityInfo || "Photo",
          timestamp: photo.timestamp,
          notes: photo.notes || "",
        })),
      }
      console.log("🔄 Updating map with filtered photos:", filteredPhotos.length)
      webViewRef.current?.postMessage(JSON.stringify(message))
    }
  }, [cityFilter, isLoading])

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data)
      console.log("📨 Message from map:", data.type, data)

      if (data.type === "MAP_LOADED") {
        console.log("🗺️ Map loaded successfully")
        setIsLoading(false)
        setLoadingStatus("Map ready")

        // Send photos to map
        setTimeout(() => {
          const message = {
            type: "ADD_PHOTOS",
            photos: filteredPhotos.map((photo) => ({
              id: photo.id,
              lat: photo.location.latitude,
              lng: photo.location.longitude,
              uri: photo.uri,
              title: photo.cityInfo || "Photo",
              timestamp: photo.timestamp,
              notes: photo.notes || "",
            })),
          }
          console.log("📤 Sending photos to map:", message.photos.length)
          webViewRef.current?.postMessage(JSON.stringify(message))
        }, 500)

        // Navigate to most recent photo if available, otherwise stay on Bavaria
        if (filteredPhotos.length > 0) {
          setTimeout(() => {
            const recent = filteredPhotos[0]
            const navMessage = {
              type: "GO_TO_LOCATION",
              lat: recent.location.latitude,
              lng: recent.location.longitude,
            }
            console.log("🎯 Navigating to recent photo:", navMessage)
            webViewRef.current?.postMessage(JSON.stringify(navMessage))
          }, 1500)
        }
      } else if (data.type === "PHOTO_CLICKED") {
        const photo = filteredPhotos.find((p) => p.id === data.photoId)
        if (photo) {
          setSelectedPhoto(photo)
          setShowPhotoModal(true)
        }
      } else if (data.type === "ERROR") {
        console.error("❌ Map error:", data.message)
        setLoadingStatus(`Error: ${data.message}`)
      } else if (data.type === "DEBUG") {
        console.log("🐛 Map debug:", data.message)
        setLoadingStatus(data.message)
      }
    } catch (error) {
      console.error("❌ Error handling message:", error)
    }
  }

  const handleWebViewError = (error: any) => {
    console.error("❌ WebView error:", error)
    setIsLoading(false)
    setLoadingStatus("WebView error")
  }

  const handleWebViewLoad = () => {
    console.log("📱 WebView loaded")
    setLoadingStatus("WebView loaded, waiting for map...")
  }

  const goToCoordinates = () => {
    if (!coordsInput.trim()) return

    const coords = coordsInput.split(",").map((c) => Number.parseFloat(c.trim()))
    if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
      const message = {
        type: "GO_TO_LOCATION",
        lat: coords[0],
        lng: coords[1],
      }
      webViewRef.current?.postMessage(JSON.stringify(message))
      setCoordsInput("")
    }
  }

  const goToPhoto = (photo: any) => {
    const message = {
      type: "GO_TO_LOCATION",
      lat: photo.location.latitude,
      lng: photo.location.longitude,
    }
    webViewRef.current?.postMessage(JSON.stringify(message))
    setShowSearchPanel(false)
  }

  // HTML map focused on Bavaria, Germany
  const mapHTML = `
  <!DOCTYPE html>
  <html>
  <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Photo Map</title>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <style>
          body { margin: 0; padding: 0; background: #f0f0f0; }
          #map { height: 100vh; width: 100vw; }
          #status { 
              position: absolute; 
              top: 10px; 
              left: 10px; 
              background: rgba(255,255,255,0.9); 
              padding: 10px; 
              border-radius: 5px;
              font-size: 12px;
              z-index: 1000;
          }
          .photo-marker {
              width: 40px;
              height: 40px;
              border: 3px solid #b8860b;
              border-radius: 50%;
              overflow: hidden;
              cursor: pointer;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              background: #b8860b;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 18px;
          }
          .photo-marker img {
              width: 100%;
              height: 100%;
              object-fit: cover;
              border-radius: 50%;
          }
          .photo-marker:hover {
              transform: scale(1.1);
              box-shadow: 0 4px 12px rgba(184, 134, 11, 0.5);
          }
          
          /* Enhanced Popup Styling */
          .leaflet-popup-content-wrapper {
              background: white;
              border-radius: 16px;
              box-shadow: 0 8px 32px rgba(0,0,0,0.2);
              border: 2px solid #b8860b;
              padding: 0;
              overflow: hidden;
          }
          
          .leaflet-popup-tip {
              background: #b8860b;
              border: none;
              box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          }
          
          .photo-popup {
              padding: 0;
              margin: 0;
              text-align: center;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              max-width: 280px;
          }
          
          .photo-popup-header {
              background: linear-gradient(135deg, #b8860b, #daa520);
              color: white;
              padding: 12px 16px;
              margin: 0;
              font-size: 16px;
              font-weight: bold;
              text-shadow: 0 1px 2px rgba(0,0,0,0.2);
          }
          
          .photo-popup-content {
              padding: 16px;
          }
          
          .photo-popup img {
              width: 100%;
              height: 140px;
              object-fit: cover;
              border-radius: 8px;
              margin-bottom: 12px;
              border: 2px solid #e2e8f0;
          }
          
          .photo-popup-info {
              text-align: left;
              margin-bottom: 12px;
          }
          
          .photo-popup-info p {
              margin: 6px 0;
              font-size: 13px;
              color: #475569;
              display: flex;
              align-items: center;
              gap: 8px;
          }
          
          .photo-popup-info .icon {
              font-size: 14px;
              width: 16px;
              text-align: center;
          }
          
          .photo-popup-coords {
              background: #f1f5f9;
              padding: 6px 8px;
              border-radius: 4px;
              font-family: monospace;
              font-size: 11px;
              color: #64748b;
              margin: 8px 0;
          }
          
          .photo-popup-notes {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 8px;
              margin: 8px 0;
              text-align: left;
              max-height: 60px;
              overflow-y: auto;
          }
          
          .photo-popup-notes-header {
              font-weight: bold;
              color: #b8860b;
              font-size: 12px;
              margin-bottom: 4px;
          }
          
          .photo-popup-notes-text {
              color: #475569;
              font-size: 11px;
              line-height: 1.4;
          }
          
          .photo-popup button {
              background: linear-gradient(135deg, #b8860b, #daa520);
              color: white;
              border: none;
              padding: 10px 16px;
              border-radius: 8px;
              cursor: pointer;
              font-weight: bold;
              font-size: 13px;
              width: 100%;
              box-shadow: 0 2px 8px rgba(184, 134, 11, 0.3);
              transition: all 0.2s ease;
          }
          
          .photo-popup button:hover {
              background: linear-gradient(135deg, #daa520, #b8860b);
              transform: translateY(-1px);
              box-shadow: 0 4px 12px rgba(184, 134, 11, 0.4);
          }
          
          .photo-popup button:active {
              transform: translateY(0);
          }
      </style>
  </head>
  <body>
      <div id="status">Loading...</div>
      <div id="map"></div>
      
      <script>
          console.log('🌐 HTML page starting...');
          
          function sendMessage(type, data = {}) {
              const message = { type, ...data };
              console.log('📤 Sending:', message);
              try {
                  window.ReactNativeWebView.postMessage(JSON.stringify(message));
              } catch (e) {
                  console.error('❌ Send error:', e);
              }
          }
          
          function updateStatus(text) {
              document.getElementById('status').textContent = text;
              sendMessage('DEBUG', { message: text });
          }
          
          updateStatus('Loading Leaflet...');
          
          // Check if Leaflet loads
          let checkLeaflet = setInterval(() => {
              if (typeof L !== 'undefined') {
                  clearInterval(checkLeaflet);
                  updateStatus('Leaflet loaded, creating map...');
                  initMap();
              }
          }, 100);
          
          // Timeout for Leaflet
          setTimeout(() => {
              if (typeof L === 'undefined') {
                  clearInterval(checkLeaflet);
                  updateStatus('Leaflet failed to load');
                  sendMessage('ERROR', { message: 'Leaflet library failed to load' });
              }
          }, 10000);
          
          let map;
          let markers = [];
          
          function initMap() {
              try {
                  updateStatus('Creating map...');
                  
                  // Focus on Bavaria, Germany (48.7904, 11.4979)
                  map = L.map('map', {
                      maxZoom: 22,
                      minZoom: 2
                  }).setView([48.7904, 11.4979], 7);
                  
                  updateStatus('Adding tiles...');
                  
                  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                      attribution: '© OpenStreetMap contributors',
                      maxZoom: 22
                  }).addTo(map);
                  
                  updateStatus('Map ready!');
                  
                  // Tell React Native map is ready
                  sendMessage('MAP_LOADED');
                  
              } catch (error) {
                  console.error('❌ Map init error:', error);
                  updateStatus('Map init failed: ' + error.message);
                  sendMessage('ERROR', { message: 'Map initialization failed: ' + error.message });
              }
          }
          
          function addPhotos(photos) {
              try {
                  updateStatus('Adding ' + photos.length + ' photos...');
                  
                  // Clear existing markers
                  markers.forEach(marker => map.removeLayer(marker));
                  markers = [];
                  
                  if (photos.length === 0) {
                      updateStatus('No photos to display');
                      return;
                  }
                  
                  photos.forEach((photo, index) => {
                      console.log('📍 Adding photo:', photo.id, 'at', photo.lat, photo.lng);
                      
                      // Create marker with fallback icon
                      const markerHtml = '<div class="photo-marker">' +
                          '<img src="' + photo.uri + '" alt="📷" onerror="this.style.display=\\'none\\'; this.parentElement.innerHTML=\\'📷\\';" />' +
                          '</div>';
                      
                      const marker = L.marker([photo.lat, photo.lng], {
                          icon: L.divIcon({
                              html: markerHtml,
                              className: 'custom-div-icon',
                              iconSize: [40, 40],
                              iconAnchor: [20, 20],
                              popupAnchor: [0, -20]
                          })
                      });
                      
                      // Enhanced popup content
                      const notesSection = photo.notes && photo.notes.trim() ? 
                          '<div class="photo-popup-notes">' +
                              '<div class="photo-popup-notes-header">📝 Notes</div>' +
                              '<div class="photo-popup-notes-text">' + photo.notes + '</div>' +
                          '</div>' : '';
                      
                      const popupContent = 
                          '<div class="photo-popup">' +
                              '<div class="photo-popup-header">🏗️ Construction Photo</div>' +
                              '<div class="photo-popup-content">' +
                                  '<img src="' + photo.uri + '" alt="Construction Photo" />' +
                                  '<div class="photo-popup-info">' +
                                      '<p><span class="icon">📍</span><strong>' + photo.title + '</strong></p>' +
                                      '<p><span class="icon">📅</span>' + new Date(photo.timestamp).toLocaleDateString('en-US', {
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                      }) + '</p>' +
                                  '</div>' +
                                  '<div class="photo-popup-coords">GPS: ' + photo.lat.toFixed(6) + ', ' + photo.lng.toFixed(6) + '</div>' +
                                  notesSection +
                                  '<button onclick="clickPhoto(\\''+photo.id+'\\')">📸 View Full Details</button>' +
                              '</div>' +
                          '</div>';
                      
                      marker.bindPopup(popupContent, {
                          maxWidth: 300,
                          className: 'custom-popup'
                      });
                      
                      marker.addTo(map);
                      markers.push(marker);
                  });
                  
                  updateStatus('Added ' + markers.length + ' photo markers');
                  
              } catch (error) {
                  console.error('❌ Add photos error:', error);
                  updateStatus('Add photos failed: ' + error.message);
                  sendMessage('ERROR', { message: 'Add photos failed: ' + error.message });
              }
          }
          
          function goToLocation(lat, lng) {
              try {
                  console.log('🎯 Going to location:', lat, lng);
                  updateStatus('Navigating to: ' + lat + ', ' + lng);
                  
                  if (map) {
                      map.setView([lat, lng], 18);
                      updateStatus('Navigation complete');
                  } else {
                      updateStatus('Map not ready for navigation');
                  }
              } catch (error) {
                  console.error('❌ Navigation error:', error);
                  updateStatus('Navigation failed: ' + error.message);
              }
          }
          
          function clickPhoto(photoId) {
              sendMessage('PHOTO_CLICKED', { photoId: photoId });
          }

          // Cross-platform message handler
          function handleMessage(event) {
              try {
                  const data = JSON.parse(event.data);
                  console.log('📨 Received:', data.type);
                  updateStatus('Received: ' + data.type);
                  
                  if (data.type === 'ADD_PHOTOS') {
                      addPhotos(data.photos);
                  } else if (data.type === 'GO_TO_LOCATION') {
                      goToLocation(data.lat, data.lng);
                  }
              } catch (error) {
                  console.error('❌ Message error:', error);
                  updateStatus('Message error: ' + error.message);
              }
          }

          // Listen for messages - Cross-platform compatibility
          window.addEventListener('message', handleMessage);
          if (document.addEventListener) {
              document.addEventListener('message', handleMessage);
          }
          
          console.log('🌐 HTML page setup complete');
      </script>
      
      <!-- Load Leaflet -->
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  </body>
  </html>
`

  return (
    <View style={styles.container}>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#b8860b" />
          <Text style={styles.loadingText}>Loading Map...</Text>
          <Text style={styles.loadingStatus}>{loadingStatus}</Text>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => {
              console.log("⏭️ User skipped loading")
              setIsLoading(false)
            }}
          >
            <Text style={styles.skipButtonText}>Skip Loading</Text>
          </TouchableOpacity>
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ html: mapHTML }}
        style={styles.webview}
        onMessage={handleWebViewMessage}
        onError={handleWebViewError}
        onLoad={handleWebViewLoad}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        mixedContentMode="compatibility"
        allowsInlineMediaPlaybook={true}
      />

      {/* Search panel - moved down to avoid zoom controls */}
      <View style={styles.searchPanel}>
        <TouchableOpacity style={styles.searchTab} onPress={() => setShowSearchPanel(!showSearchPanel)}>
          <Search size={18} color="#b8860b" />
          <Text style={styles.searchTabText}>Navigate ({filteredPhotos.length})</Text>
          {showSearchPanel ? <ChevronUp size={16} color="#b8860b" /> : <ChevronDown size={16} color="#b8860b" />}
        </TouchableOpacity>

        {showSearchPanel && (
          <View style={styles.searchPanelContent}>
            {/* Coordinates */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Go to Coordinates</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="lat, lng (e.g. 37.4219, -122.084)"
                  value={coordsInput}
                  onChangeText={setCoordsInput}
                  keyboardType="numeric"
                />
                <TouchableOpacity style={styles.goButton} onPress={goToCoordinates}>
                  <Text style={styles.goButtonText}>Go</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* City Filter - Auto-filter, no button */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Filter by Location</Text>
              <TextInput
                style={styles.filterInput}
                placeholder="Search by city, street, or notes..."
                value={cityFilter}
                onChangeText={setCityFilter}
              />
            </View>

            {/* Photos list - only show if there are photos */}
            {filteredPhotos.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {cityFilter
                    ? `Filtered Photos (${filteredPhotos.length})`
                    : `Recent Photos (${photosWithLocation.length})`}
                </Text>
                <FlatList
                  data={filteredPhotos.slice(0, 10)}
                  keyExtractor={(item) => item.id}
                  style={styles.photoList}
                  renderItem={({ item, index }) => (
                    <TouchableOpacity style={styles.photoItem} onPress={() => goToPhoto(item)}>
                      <Image source={{ uri: item.uri }} style={styles.photoThumb} />
                      <View style={styles.photoInfo}>
                        <Text style={styles.photoTitle}>{item.cityInfo || `Photo ${index + 1}`}</Text>
                        <Text style={styles.photoDate}>{format(new Date(item.timestamp), "MMM dd, HH:mm")}</Text>
                        <Text style={styles.photoCoords}>
                          {item.location.latitude.toFixed(4)}, {item.location.longitude.toFixed(4)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}
          </View>
        )}
      </View>

      {/* Photo modal */}
      <Modal visible={showPhotoModal} transparent animationType="slide" onRequestClose={() => setShowPhotoModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Photo Details</Text>
              <TouchableOpacity onPress={() => setShowPhotoModal(false)}>
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedPhoto && (
              <View style={styles.modalBody}>
                <Image source={{ uri: selectedPhoto.uri }} style={styles.modalImage} />
                <Text style={styles.modalLocation}>{selectedPhoto.cityInfo || "Unknown Location"}</Text>
                <Text style={styles.modalDate}>{format(new Date(selectedPhoto.timestamp), "PPP p")}</Text>
                {selectedPhoto.notes && <Text style={styles.modalNotes}>{selectedPhoto.notes}</Text>}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(248, 250, 252, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: "#b8860b",
    fontWeight: "600",
  },
  loadingStatus: {
    marginTop: 8,
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
  },
  skipButton: {
    marginTop: 20,
    backgroundColor: "#64748b",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  skipButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  searchPanel: {
    position: "absolute",
    top: 90,
    left: 16,
    right: 16,
    zIndex: 100,
  },
  searchTab: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  searchTabText: {
    flex: 1,
    fontSize: 14,
    color: "#1e293b",
    fontWeight: "600",
  },
  searchPanelContent: {
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    borderRadius: 12,
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
    maxHeight: screenHeight * 0.6,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: "row",
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  goButton: {
    backgroundColor: "#b8860b",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: "center",
  },
  goButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  photoList: {
    maxHeight: 200,
  },
  photoItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#f8fafc",
  },
  photoThumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  photoInfo: {
    flex: 1,
  },
  photoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
  },
  photoDate: {
    fontSize: 12,
    color: "#64748b",
  },
  photoCoords: {
    fontSize: 10,
    color: "#94a3b8",
    fontFamily: "monospace",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    margin: 20,
    width: screenWidth - 40,
    maxHeight: screenHeight * 0.8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
  },
  modalBody: {
    padding: 20,
  },
  modalImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  modalLocation: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 8,
  },
  modalDate: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 12,
  },
  modalNotes: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
  },
  filterInput: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
})
