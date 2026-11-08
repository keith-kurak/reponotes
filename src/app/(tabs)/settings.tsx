import { AppColors, useAppColors } from "@/constants/colors";
import { testConnection, TestConnectionResult } from "@/utils/github";
import { storage } from "@/utils/storage";
import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // The token field is write-only: it starts empty and is cleared after each
  // save. An empty field keeps the saved token. This also stops iOS from
  // offering to save the token as a password when the screen changes.
  const [githubPAT, setGithubPAT] = useState("");
  const [savedToken, setSavedToken] = useState(
    () => storage.getGitHubPAT() || "",
  );
  const [repoName, setRepoName] = useState(
    () => storage.getRepoName() || "reponotes-notebook",
  );
  const [owner, setOwner] = useState(() => storage.getGitHubOwner() || "");
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(
    null,
  );

  const testMutation = useMutation({
    mutationFn: async () => {
      const token = githubPAT.trim() || savedToken;
      if (!token) {
        throw new Error("GitHub PAT is required");
      }
      if (!owner.trim()) {
        throw new Error("GitHub owner/username is required");
      }
      if (!repoName.trim()) {
        throw new Error("Repository name is required");
      }

      storage.setGitHubPAT(token);
      storage.setRepoName(repoName.trim());
      storage.setGitHubOwner(owner.trim());
      setSavedToken(token);
      setGithubPAT("");
      return await testConnection({
        token,
        owner: owner.trim(),
        repoName: repoName.trim(),
      });
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
      <KeyboardAwareScrollView
        style={styles.scrollView}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.section}>
          <Text style={styles.label}>GitHub Owner/Username</Text>
          <TextInput
            style={styles.input}
            value={owner}
            onChangeText={setOwner}
            placeholder="your-github-username"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            textContentType="none"
            placeholderTextColor={colors.textTertiary}
            accessibilityLabel="GitHub owner or username"
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
            autoComplete="off"
            textContentType="none"
            placeholderTextColor={colors.textTertiary}
            accessibilityLabel="Repository name"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>GitHub Personal Access Token</Text>
          <TextInput
            style={styles.input}
            value={githubPAT}
            onChangeText={setGithubPAT}
            placeholder={
              savedToken
                ? `Saved token ending in …${savedToken.slice(-4)}`
                : "github_pat_xxxxxxxxxxxx"
            }
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            textContentType="oneTimeCode"
            placeholderTextColor={colors.textTertiary}
            accessibilityLabel="GitHub personal access token"
          />
          <Text style={styles.hint}>
            Create a fine-grained token at github.com/settings/tokens with
            access to this repository and Contents: Read and write.
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            testMutation.isPending && styles.buttonDisabled,
          ]}
          onPress={() => {
            Keyboard.dismiss();
            testMutation.mutate();
          }}
          disabled={testMutation.isPending}
          accessibilityRole="button"
        >
          {testMutation.isPending ? (
            <ActivityIndicator color={colors.onTint} />
          ) : (
            <Text style={styles.buttonText}>Save and Test Connection</Text>
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
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
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
      color: c.text,
    },
    input: {
      color: c.text,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      backgroundColor: c.inputBackground,
    },
    hint: {
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 4,
    },
    button: {
      backgroundColor: c.tint,
      padding: 16,
      borderRadius: 8,
      alignItems: "center",
      marginTop: 8,
    },
    buttonDisabled: {
      backgroundColor: c.disabled,
    },
    buttonText: {
      color: c.onTint,
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
      backgroundColor: c.successBackground,
      borderColor: c.successBorder,
    },
    errorBox: {
      backgroundColor: c.errorBackground,
      borderColor: c.errorBorder,
    },
    resultText: {
      fontSize: 14,
    },
    successText: {
      color: c.successText,
    },
    errorText: {
      color: c.errorText,
    },
  });
}
