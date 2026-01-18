import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { listLocalFiles, writeLocalFile } from '@/utils/fileSystem';
import { listMarkdownFiles, fetchFileContent } from '@/utils/github';
import { storage } from '@/utils/storage';

export default function FileListScreen() {
  const [localFiles, setLocalFiles] = useState<string[]>([]);

  const loadLocalFiles = async () => {
    const files = await listLocalFiles();
    setLocalFiles(files);
  };

  useEffect(() => {
    loadLocalFiles();
  }, []);

  const syncMutation = useMutation({
    mutationFn: async () => {
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

      const files = await listMarkdownFiles(token, repoName, owner);

      await Promise.all(
        files.map(async (file) => {
          const content = await fetchFileContent(token, repoName, owner, file.path);
          await writeLocalFile(file.name, content);
        })
      );

      await loadLocalFiles();
    },
  });

  const renderItem = ({ item }: { item: string }) => (
    <Link href={`/note/${encodeURIComponent(item)}`} asChild>
      <TouchableOpacity style={styles.fileItem}>
        <Ionicons name="document-text-outline" size={24} color="#666" />
        <Text style={styles.fileName}>{item}</Text>
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </TouchableOpacity>
    </Link>
  );

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
        >
          {syncMutation.isPending ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Ionicons name="cloud-download-outline" size={24} color="#007AFF" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => router.push('/settings')}
        >
          <Ionicons name="settings-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {syncMutation.isError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>
            {syncMutation.error instanceof Error
              ? syncMutation.error.message
              : 'Failed to sync files'}
          </Text>
        </View>
      )}

      {syncMutation.isSuccess && (
        <View style={styles.successBox}>
          <Text style={styles.successText}>Files synced successfully!</Text>
        </View>
      )}

      {localFiles.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="folder-open-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No notes yet</Text>
          <Text style={styles.emptyHint}>
            Tap the sync button to download notes from GitHub
          </Text>
        </View>
      ) : (
        <FlatList
          data={localFiles}
          renderItem={renderItem}
          keyExtractor={(item) => item}
          style={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 12,
  },
  toolbarButton: {
    padding: 8,
  },
  list: {
    flex: 1,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 12,
  },
  fileName: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptyHint: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
    textAlign: 'center',
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
