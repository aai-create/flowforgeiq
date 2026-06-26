import { Feather } from "@expo/vector-icons";
import { useSignUp } from "@clerk/expo";
import * as Haptics from "expo-haptics";
import { Link, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export default function SignUpScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Clerk Expo v3 Signals API — use `as any` to unblock strict typing while library matures
  const clerkSignUp = useSignUp() as any;
  const signUp = clerkSignUp?.signUp;
  const setActive = clerkSignUp?.setActive;
  const isLoaded = !!signUp;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const c = colors;

  async function handleSignUp() {
    if (!email || !password || loading || !isLoaded) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setError(null);
    setLoading(true);
    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err: any) {
      setError(
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        "Sign up failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (!verifyCode || loading || !isLoaded) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setError(null);
    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: verifyCode });
      const status = result?.status ?? signUp?.status;
      if (status === "complete") {
        await setActive?.({ session: result?.createdSessionId ?? signUp?.createdSessionId });
        router.replace("/(tabs)/home" as any);
      } else if (result?.error) {
        throw result.error;
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? "Verification failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!signUp) return;
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
    } catch {}
  }

  if (pendingVerification) {
    return (
      <View style={[styles.root, { backgroundColor: c.background, paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }]}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.kav}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.logoWrap}>
              <View style={[styles.logoCircle, { backgroundColor: c.primary }]}>
                <Feather name="zap" size={28} color="#fff" />
              </View>
              <Text style={[styles.appName, { color: c.foreground }]}>FlowForge</Text>
            </View>
            <Text style={[styles.title, { color: c.foreground }]}>Verify your email</Text>
            <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
              We sent a code to {email}. Enter it below to confirm your account.
            </Text>
            <View style={[styles.inputWrap, { backgroundColor: c.card, borderColor: c.border }]}>
              <Feather name="hash" size={16} color={c.mutedForeground} />
              <TextInput
                style={[styles.input, { color: c.foreground }]}
                value={verifyCode}
                onChangeText={setVerifyCode}
                placeholder="6-digit code"
                placeholderTextColor={c.mutedForeground}
                keyboardType="numeric"
                autoFocus
                testID="verify-code-input"
              />
            </View>
            {error ? <Text style={[styles.errorText, { color: c.destructive }]}>{error}</Text> : null}
            <Pressable
              onPress={handleVerify}
              disabled={!verifyCode || loading}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: verifyCode && !loading ? c.primary : c.muted, opacity: pressed ? 0.85 : 1 },
              ]}
              testID="verify-button"
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={[styles.primaryBtnText, { color: verifyCode ? "#fff" : c.mutedForeground }]}>Verify</Text>
              )}
            </Pressable>
            <Pressable onPress={handleResend} style={styles.secondaryBtn}>
              <Text style={[styles.secondaryBtnText, { color: c.primary }]}>Resend code</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background, paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.kav}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.logoWrap}>
            <View style={[styles.logoCircle, { backgroundColor: c.primary }]}>
              <Feather name="zap" size={28} color="#fff" />
            </View>
            <Text style={[styles.appName, { color: c.foreground }]}>FlowForge</Text>
          </View>

          <Text style={[styles.title, { color: c.foreground }]}>Create account</Text>
          <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
            Join your team on FlowForge
          </Text>

          <View style={[styles.inputWrap, { backgroundColor: c.card, borderColor: c.border }]}>
            <Feather name="mail" size={16} color={c.mutedForeground} />
            <TextInput
              style={[styles.input, { color: c.foreground }]}
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor={c.mutedForeground}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              testID="email-input"
            />
          </View>

          <View style={[styles.inputWrap, { backgroundColor: c.card, borderColor: c.border, marginTop: 12 }]}>
            <Feather name="lock" size={16} color={c.mutedForeground} />
            <TextInput
              style={[styles.input, { color: c.foreground }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={c.mutedForeground}
              secureTextEntry={!showPassword}
              testID="password-input"
            />
            <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
              <Feather name={showPassword ? "eye-off" : "eye"} size={16} color={c.mutedForeground} />
            </Pressable>
          </View>

          {error ? <Text style={[styles.errorText, { color: c.destructive }]}>{error}</Text> : null}

          <Pressable
            onPress={handleSignUp}
            disabled={!email || !password || loading}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: email && password && !loading ? c.primary : c.muted, opacity: pressed ? 0.85 : 1 },
            ]}
            testID="sign-up-button"
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={[styles.primaryBtnText, { color: email && password ? "#fff" : c.mutedForeground }]}>
                Create account
              </Text>
            )}
          </Pressable>

          <View style={styles.linkRow}>
            <Text style={[styles.linkText, { color: c.mutedForeground }]}>Already have an account? </Text>
            <Link href={"/(auth)/sign-in" as any}>
              <Text style={[styles.linkAction, { color: c.primary }]}>Sign in</Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  kav: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40, justifyContent: "center" },
  logoWrap: { alignItems: "center", marginBottom: 32, marginTop: 24 },
  logoCircle: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  appName: { fontSize: 24, fontWeight: "700", fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  title: { fontSize: 26, fontWeight: "700", fontFamily: "Inter_700Bold", letterSpacing: -0.5, textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 28, lineHeight: 20 },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4, marginLeft: 4 },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 15, marginTop: 20 },
  primaryBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  secondaryBtn: { alignItems: "center", marginTop: 16 },
  secondaryBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  linkRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 24 },
  linkText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  linkAction: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
