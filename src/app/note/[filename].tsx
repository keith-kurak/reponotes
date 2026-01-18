import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { readLocalFile, writeLocalFile } from '@/utils/fileSystem';
import { fetchFileContent } from '@/utils/github';
import { storage } from '@/utils/storage';

export default function NoteViewerScreen() {
  const { filename } = useLocalSearchParams<{ filename: string }>();
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadContent = async () => {
    if (!filename) return;

    try {
      setLoading(true);
      setError(null);
      const fileContent = await readLocalFile(decodeURIComponent(filename));
      setContent(fileContent);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContent();
  }, [filename]);

  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!filename) throw new Error('No filename provided');

      const [token, repoName, owner] = await Promise.all([
        storage.getGitHubPAT(),
        storage.getRepoName(),
        storage.getGitHubOwner(),
      ]);

      if (!token) {
        throw new Error('GitHub PAT not configured. Please configure in Settings.');
      }
      if (!owner) {
        throw new Error('GitHub owner not configured. Please configure in Settings.');
      }

      const decodedFilename = decodeURIComponent(filename);
      const newContent = await fetchFileContent(token, repoName, owner, decodedFilename);
      await writeLocalFile(decodedFilename, newContent);
      await loadContent();
    },
  });

  return (
    <>
      <Stack.Screen
        options={{
          title: filename ? decodeURIComponent(filename) : 'Note',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              style={{ marginRight: 8 }}
            >
              {syncMutation.isPending ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <Ionicons name="cloud-download-outline" size={24} color="#007AFF" />
              )}
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.container}>
        {syncMutation.isError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              {syncMutation.error instanceof Error
                ? syncMutation.error.message
                : 'Failed to sync file'}
            </Text>
          </View>
        )}

        {syncMutation.isSuccess && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>File synced successfully!</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color="#f44336" />
            <Text style={styles.errorTitle}>Error</Text>
            <Text style={styles.errorMessage}>{error}</Text>
          </View>
        ) : (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
            <Text style={styles.text}>{content}</Text>
          </ScrollView>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f44336',
    marginTop: 16,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    fontFamily: 'monospace',
  },
  errorBox: {
    backgroundColor: '#ffebee',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f44336',
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  successBox: {
    backgroundColor: '#e8f5e9',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4caf50',
  },
  successText: {
    color: '#2e7d32',
    fontSize: 14,
  },
});
