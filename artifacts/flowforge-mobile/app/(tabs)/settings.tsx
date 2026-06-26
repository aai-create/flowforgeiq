import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { changeLanguage, SUPPORTED } from "@/hooks/useI18n";
import type { SupportedLang } from "@/hooks/useI18n";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { signOut, user } = useAuth() as any;

  const currentLang = i18n.language as SupportedLang;

  function handleChangeLang(lang: SupportedLang) {
    void changeLanguage(lang);
  }

  function handleSignOut() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t("settings.signOut"),
      t("settings.signOutDesc"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("settings.signOut"),
          style: "destructive",
          onPress: async () => {
            await signOut();
            router.replace("/(auth)/sign-in" as any);
          },
        },
      ],
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12),
            backgroundColor: colors.primary,
          },
        ]}
      >
        <Text style={styles.headerTitle}>FlowForge</Text>
        <Text style={styles.headerSubtitle}>{t("settings.title")}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 32) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Language Section */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Feather name="globe" size={14} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              {t("settings.language")}
            </Text>
          </View>
          <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>
            {t("settings.languageDesc")}
          </Text>

          <View style={styles.langRow}>
            {SUPPORTED.map((lang) => {
              const isActive = currentLang === lang;
              return (
                <Pressable
                  key={lang}
                  onPress={() => handleChangeLang(lang)}
                  style={[
                    styles.langBtn,
                    {
                      backgroundColor: isActive ? colors.primary : colors.background,
                      borderColor: isActive ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.langBtnText,
                      { color: isActive ? "#fff" : colors.mutedForeground },
                    ]}
                  >
                    {t(`settings.languages.${lang}`)}
                  </Text>
                  {isActive && (
                    <Feather name="check" size={12} color="#fff" style={{ marginLeft: 4 }} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Account section */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Feather name="user" size={14} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              {t("settings.account")}
            </Text>
          </View>

          {user?.primaryEmailAddress?.emailAddress && (
            <Text style={[styles.emailText, { color: colors.mutedForeground }]}>
              {user.primaryEmailAddress.emailAddress}
            </Text>
          )}

          <Pressable
            onPress={handleSignOut}
            style={({ pressed }) => [
              styles.signOutBtn,
              {
                backgroundColor: `${colors.destructive}12`,
                borderColor: `${colors.destructive}40`,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
            testID="sign-out-button"
          >
            <Feather name="log-out" size={15} color={colors.destructive} />
            <Text style={[styles.signOutText, { color: colors.destructive }]}>
              {t("settings.signOut")}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingBottom: 16, paddingHorizontal: 20 },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#fff", fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.72)", fontFamily: "Inter_400Regular", marginTop: 1, letterSpacing: 0.3 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, gap: 16 },
  section: { borderRadius: 12, borderWidth: 1, padding: 16, gap: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  sectionDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  langRow: { gap: 8 },
  langBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5 },
  langBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  emailText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  signOutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5, borderRadius: 10, paddingVertical: 12 },
  signOutText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
