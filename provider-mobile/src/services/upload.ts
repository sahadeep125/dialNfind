import { Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { FileSystemUploadType, createUploadTask } from "expo-file-system/legacy";

import { API_URL } from "@/constants/config";
import { UPLOAD_RULES } from "@/constants/uploads";
import { useAuthStore } from "@/stores/useAuthStore";
import type { PickedFile, UploadPurpose } from "@/types";

const ASPECT: Partial<Record<UploadPurpose, [number, number]>> = {
  logo: [1, 1],
  avatar: [1, 1],
  cover: [16, 9],
  portfolio: [4, 3],
};

function guessMime(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "pdf") return "application/pdf";
  return "image/jpeg";
}

/** Opens the photo library (or the camera) and returns the chosen image, or null if cancelled. */
export async function pickImage(
  purpose: UploadPurpose,
  source: "library" | "camera" = "library",
): Promise<PickedFile | null> {
  const permission =
    source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted)
    throw new Error(
      source === "camera"
        ? "Allow camera access in Settings to take a photo."
        : "Allow photo access in Settings to choose an image.",
    );
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    quality: 0.85,
    allowsEditing: !!ASPECT[purpose],
    aspect: ASPECT[purpose],
  };
  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const name = asset.fileName ?? `photo-${Date.now()}.jpg`;
  return {
    uri: asset.uri,
    name,
    mimeType: asset.mimeType ?? guessMime(name),
    size: asset.fileSize ?? null,
  };
}

/** Opens the document picker for an image or PDF, or returns null if cancelled. */
export async function pickDocument(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: UPLOAD_RULES.document.types,
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.name,
    mimeType: asset.mimeType ?? guessMime(asset.name),
    size: asset.size ?? null,
  };
}

/** Checks type and size before uploading. Returns an error message or null. */
export function checkFile(file: PickedFile, purpose: UploadPurpose): string | null {
  const rule = UPLOAD_RULES[purpose];
  if (!rule.types.includes(file.mimeType))
    return purpose === "document"
      ? "Choose a JPG, PNG, WebP or PDF file"
      : "Choose a JPG, PNG or WebP image";
  if (file.size && file.size > rule.maxMb * 1024 * 1024)
    return `This file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${rule.maxMb} MB.`;
  return null;
}

function readUploadResponse(status: number, body: string): string {
  let parsed: { url?: string; error?: { message?: string } } | null = null;
  try {
    parsed = JSON.parse(body) as { url?: string; error?: { message?: string } };
  } catch (error: unknown) {
    console.error("[upload] Response was not JSON", status, error);
  }
  if (status >= 200 && status < 300 && parsed?.url) return parsed.url;
  throw new Error(parsed?.error?.message ?? "Upload failed. Please try again.");
}

/**
 * Sends the file as the raw request body to POST /uploads, which is what the API expects, and
 * resolves to the stored file's public URL.
 */
export async function uploadFile(
  file: PickedFile,
  purpose: UploadPurpose,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const problem = checkFile(file, purpose);
  if (problem) throw new Error(problem);
  const url = `${API_URL}/uploads?purpose=${purpose}`;
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = { "content-type": file.mimeType };
  if (token) headers.authorization = `Bearer ${token}`;

  if (Platform.OS === "web") {
    const blob = await (await fetch(file.uri)).blob();
    const res = await fetch(url, { method: "POST", headers, body: blob });
    return readUploadResponse(res.status, await res.text());
  }

  const task = createUploadTask(
    url,
    file.uri,
    { httpMethod: "POST", uploadType: FileSystemUploadType.BINARY_CONTENT, headers },
    ({ totalBytesSent, totalBytesExpectedToSend }) => {
      if (totalBytesExpectedToSend > 0)
        onProgress?.(Math.round((totalBytesSent / totalBytesExpectedToSend) * 100));
    },
  );
  const result = await task.uploadAsync();
  if (!result) throw new Error("Upload was cancelled.");
  return readUploadResponse(result.status, result.body);
}
