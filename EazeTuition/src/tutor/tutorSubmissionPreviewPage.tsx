import React, { useState, useEffect } from "react";
import { SafeAreaView, View, ActivityIndicator, Alert, TouchableOpacity, Text } from "react-native";
import { WebView } from "react-native-webview";
import * as FileSystem from "expo-file-system";
import * as Linking from "expo-linking";
import { useRoute } from "@react-navigation/native";
import { API_BASE_URL } from "../config";

export default function SubmissionPreviewPage() {
  const route = useRoute<any>();
  const { submission_id } = route.params;

  const [loading, setLoading] = useState(true);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);

  // Fetch file info
  const fetchFileInfo = async () => {
    try {
      const url = `${API_BASE_URL}/homework/tutor/homework/${submission_id}/preview`;
      const res = await fetch(url, { method: "HEAD" });
      if (!res.ok) throw new Error("File not found");

      const contentType = res.headers.get("Content-Type") || "";
      setIsPdf(contentType.includes("pdf"));
      setFileUrl(url);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "File not found");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFileInfo();
  }, []);

  const handleDownload = async () => {
    if (!fileUrl) return;

    const filename = fileUrl.split("/").pop() || "file";
    const localUri = `${FileSystem.documentDirectory}${filename}`;

    try {
      const { uri } = await FileSystem.downloadAsync(fileUrl, localUri);
      await Linking.openURL(uri);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Cannot open this file");
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!fileUrl) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>File not available</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {isPdf ? (
        <WebView
          source={{ uri: fileUrl }}
          style={{ flex: 1 }}
          startInLoadingState
          renderLoading={() => (
            <ActivityIndicator
              style={{ flex: 1 }}
              size="large"
              color="#2563eb"
            />
          )}
        />
      ) : (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <Text style={{ fontSize: 16, marginBottom: 20 }}>
            Cannot preview this file type.
          </Text>
          <TouchableOpacity
            onPress={handleDownload}
            style={{
              backgroundColor: "#2563eb",
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "white", fontWeight: "bold" }}>
              Download File
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
