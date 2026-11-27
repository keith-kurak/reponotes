import { AppHost } from "@/components/AppHost";
import { useAppColors } from "@/constants/colors";
import { testConnection, TestConnectionResult } from "@/utils/github";
import { storage } from "@/utils/storage";
import { Button, FieldGroup, Text, TextInput, useNativeState } from "@expo/ui";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Keyboard } from "react-native";

export default function SettingsScreen() {
  const colors = useAppColors();
  const owner = useNativeState(storage.getGitHubOwner() || "");
  const repoName = useNativeState(
    storage.getRepoName() || "reponotes-notebook",
  );
  // The token field is write-only: it starts empty and is cleared after each
  // save. An empty field keeps the saved token. This also stops iOS from
  // offering to save the token as a password when the screen changes.
  const token = useNativeState("");
  const [savedToken, setSavedToken] = useState(
    () => storage.getGitHubPAT() || "",
  );
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(
    null,
  );

  const testMutation = useMutation({
    mutationFn: async () => {
      const newToken = token.get().trim() || savedToken;
      const ownerValue = owner.get().trim();
      const repoValue = repoName.get().trim();
      if (!newToken) throw new Error("GitHub PAT is required");
      if (!ownerValue) throw new Error("GitHub owner/username is required");
      if (!repoValue) throw new Error("Repository name is required");

      storage.setGitHubPAT(newToken);
      storage.setRepoName(repoValue);
      storage.setGitHubOwner(ownerValue);
      setSavedToken(newToken);
      token.set("");
      return await testConnection({
        token: newToken,
        owner: ownerValue,
        repoName: repoValue,
      });
    },
    onSuccess: (result) => setTestResult(result),
    onError: (error: Error) =>
      setTestResult({ success: false, message: error.message }),
  });

  return (
    <AppHost style={{ flex: 1 }}>
      <FieldGroup>
        <FieldGroup.Section title="GitHub owner or username">
          <TextInput
            value={owner}
            placeholder="your-github-username"
            accessibilityLabel="GitHub owner or username"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            placeholderTextColor={colors.textTertiary}
          />
        </FieldGroup.Section>

        <FieldGroup.Section title="Repository">
          <TextInput
            value={repoName}
            placeholder="reponotes-notebook"
            accessibilityLabel="Repository name"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            placeholderTextColor={colors.textTertiary}
          />
        </FieldGroup.Section>

        <FieldGroup.Section title="Personal access token">
          <TextInput
            value={token}
            placeholder={
              savedToken
                ? `Saved token ending in …${savedToken.slice(-4)}`
                : "github_pat_…"
            }
            accessibilityLabel="GitHub personal access token"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            placeholderTextColor={colors.textTertiary}
          />
          <FieldGroup.SectionFooter>
            <Text textStyle={{ fontSize: 13, color: colors.textTertiary }}>
              Create a fine-grained token at github.com/settings/tokens with
              access to this repository and Contents: Read and write.
            </Text>
          </FieldGroup.SectionFooter>
        </FieldGroup.Section>

        <FieldGroup.Section>
          <Button
            label={
              testMutation.isPending ? "Testing…" : "Save and Test Connection"
            }
            disabled={testMutation.isPending}
            onPress={() => {
              Keyboard.dismiss();
              testMutation.mutate();
            }}
          />
          {testResult ? (
            <FieldGroup.SectionFooter>
              <Text
                textStyle={{
                  fontSize: 13,
                  color: testResult.success
                    ? colors.successText
                    : colors.errorText,
                }}
              >
                {testResult.message}
              </Text>
            </FieldGroup.SectionFooter>
          ) : null}
        </FieldGroup.Section>
      </FieldGroup>
    </AppHost>
  );
}
