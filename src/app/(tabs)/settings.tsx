import { testConnection, TestConnectionResult } from "@/utils/github";
import { storage } from "@/utils/storage";
import { useMutation } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const [githubPAT, setGithubPAT] = useState("");
  const [repoName, setRepoName] = useState("reponotes-notebook");
  const [owner, setOwner] = useState("");
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(
    null,
  );

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    const pat = storage.getGitHubPAT();
    const repo = storage.getRepoName();
    const savedOwner = storage.getGitHubOwner();
    if (pat) setGithubPAT(pat);
    if (repo) setRepoName(repo);
    if (savedOwner) setOwner(savedOwner);
  };

  const saveSettings = () => {
    storage.setGitHubPAT(githubPAT);
    storage.setRepoName(repoName);
    storage.setGitHubOwner(owner);
  };

  const testMutation = useMutation({
    mutationFn: async () => {
      if (!githubPAT.trim()) {
        throw new Error("GitHub PAT is required");
      }
      if (!owner.trim()) {
        throw new Error("GitHub owner/username is required");
      }
      if (!repoName.trim()) {
        throw new Error("Repository name is required");
      }

      saveSettings();
      return await testConnection(githubPAT, repoName, owner);
    },
    onSuccess: (result) => {
      setTestResult(result);
    },
    onError: (error: Error) => {
      setTestResult({
        success: false,
        message: error.message,
      });
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.label}>GitHub Owner/Username</Text>
          <TextInput
            style={styles.input}
            value={owner}
            onChangeText={setOwner}
            placeholder="your-github-username"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Repository Name</Text>
          <TextInput
            style={styles.input}
            value={repoName}
            onChangeText={setRepoName}
            placeholder="reponotes-notebook"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>GitHub Personal Access Token</Text>
          <TextInput
            style={styles.input}
            value={githubPAT}
            onChangeText={setGithubPAT}
            placeholder="ghp_xxxxxxxxxxxx"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.hint}>
            Generate a PAT with &apos;repo&apos; scope at
            github.com/settings/tokens
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            testMutation.isPending && styles.buttonDisabled,
          ]}
          onPress={() => testMutation.mutate()}
          disabled={testMutation.isPending}
        >
          {testMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Test Connection</Text>
          )}
        </TouchableOpacity>

        {testResult && (
          <View
            style={[
              styles.resultBox,
              testResult.success ? styles.successBox : styles.errorBox,
            ]}
          >
            <Text
              style={[
                styles.resultText,
                testResult.success ? styles.successText : styles.errorText,
              ]}
            >
              {testResult.message}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  hint: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: "#999",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  resultBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  successBox: {
    backgroundColor: "#e8f5e9",
    borderColor: "#4caf50",
  },
  errorBox: {
    backgroundColor: "#ffebee",
    borderColor: "#f44336",
  },
  resultText: {
    fontSize: 14,
  },
  successText: {
    color: "#2e7d32",
  },
  errorText: {
    color: "#c62828",
  },
});
