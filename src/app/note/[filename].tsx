import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { readLocalFile, writeLocalFile } from '@/utils/fileSystem';
import { fetchFileContentWithSha, updateFileContent, createFileOnGitHub, GitHubAPIError } from '@/utils/github';
import { storage } from '@/utils/storage';
import { pendingChanges, fileSha } from '@/utils/pendingChanges';

export default function NoteViewerScreen() {
  const { filename } = useLocalSearchParams<{ filename: string }>();
  const [content, setContent] = useState<string>('');
  const [editedContent, setEditedContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  const decodedFilename = filename ? decodeURIComponent(filename) : '';

  const loadContent = async () => {
    if (!filename) return;

    try {
      setLoading(true);
      setError(null);
      const fileContent = readLocalFile(decodedFilename);
      setContent(fileContent);
      setEditedContent(fileContent);
      const isPending = await pendingChanges.has(decodedFilename);
      setHasPendingChanges(isPending);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContent();
  }, [filename]);

  const handleStartEditing = () => {
    setEditedContent(content);
    setIsEditing(true);
  };

  const handleFinishEditing = async () => {
    if (editedContent !== content) {
      writeLocalFile(decodedFilename, editedContent);
      setContent(editedContent);
      await pendingChanges.add(decodedFilename);
      setHasPendingChanges(true);
    }
    setIsEditing(false);
  };

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

      if (hasPendingChanges) {
        // Upload changes to GitHub
        let sha = await fileSha.get(decodedFilename);
        let newSha: string;

        if (!sha) {
          // Try to fetch the current SHA from GitHub if we don't have it stored
          try {
            const current = await fetchFileContentWithSha(token, repoName, owner, decodedFilename);
            sha = current.sha;
          } catch (error) {
            // File doesn't exist on GitHub yet - that's OK, we'll create it
            if (!(error instanceof GitHubAPIError && error.status === 404)) {
              throw error;
            }
          }
        }

        if (sha) {
          // Update existing file
          newSha = await updateFileContent(token, repoName, owner, decodedFilename, content, sha);
        } else {
          // Create new file on GitHub
          newSha = await createFileOnGitHub(token, repoName, owner, decodedFilename, content);
        }

        await fileSha.set(decodedFilename, newSha);
        await pendingChanges.remove(decodedFilename);
        setHasPendingChanges(false);
      } else {
        // Download from GitHub
        const result = await fetchFileContentWithSha(token, repoName, owner, decodedFilename);
        writeLocalFile(decodedFilename, result.content);
        await fileSha.set(decodedFilename, result.sha);
        setContent(result.content);
        setEditedContent(result.content);
      }
    },
  });

  return (
    <>
      <Stack.Screen
        options={{
          title: filename ? decodeURIComponent(filename) : 'Note',
          headerRight: () => (
            <View style={styles.headerButtons}>
              {hasPendingChanges && (
                <View style={styles.pendingDot} />
              )}
              <TouchableOpacity
                onPress={isEditing ? handleFinishEditing : handleStartEditing}
                disabled={loading || syncMutation.isPending}
                style={styles.headerButton}
              >
                <Ionicons
                  name={isEditing ? 'checkmark' : 'create-outline'}
                  size={24}
                  color="#007AFF"
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => syncMutation.mutate()}
                disabled={syncMutation.isPending || isEditing}
                style={styles.headerButton}
              >
                {syncMutation.isPending ? (
                  <ActivityIndicator size="small" color="#007AFF" />
                ) : (
                  <Ionicons
                    name="sync-outline"
                    size={24}
                    color={isEditing ? '#ccc' : '#007AFF'}
                  />
                )}
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
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
            <Text style={styles.successText}>
              {hasPendingChanges ? 'Changes saved to GitHub!' : 'File synced successfully!'}
            </Text>
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
        ) : isEditing ? (
          <TextInput
            style={styles.textInput}
            value={editedContent}
            onChangeText={setEditedContent}
            multiline
            autoFocus
            textAlignVertical="top"
          />
        ) : (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
            <Text style={styles.text}>{content}</Text>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    padding: 4,
  },
  pendingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFC107',
    marginRight: 4,
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
  textInput: {
    flex: 1,
    padding: 16,
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
