import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { ClerkProvider, ClerkLoaded } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setBaseUrl } from "@workspace/api-client-react";
import { useRouter, Stack } from "expo-router";
import type { ShareIntent } from "expo-share-intent";
import { useShareIntent } from "expo-share-intent";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { I18nextProvider } from "react-i18next";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import i18n, { loadStoredLanguage } from "@/hooks/useI18n";

const domain = process.env.EXPO_PUBLIC_DOMAIN;
if (domain) setBaseUrl(`https://${domain}`);

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
const proxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function ShareIntentHandler() {
  const router = useRouter();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();

  useEffect(() => {
    if (!hasShareIntent) return;

    const intent = shareIntent as ShareIntent;
    const text = intent.text ?? intent.webUrl ?? "";
    const imageFile = intent.files?.find((f) =>
      f.mimeType?.startsWith("image/"),
    );
    const imageUri = imageFile?.path ?? "";

    const params: Record<string, string> = {};
    if (text) params.sharedText = text;
    if (imageUri) params.sharedImageUri = imageUri;

    router.push({ pathname: "/(tabs)/chat", params });
    resetShareIntent();
  }, [hasShareIntent]);

  return null;
}

function RootLayoutNav() {
  return (
    <>
      <ShareIntentHandler />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="routing-result" options={{ headerShown: false, presentation: "card" }} />
        <Stack.Screen name="document/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    void loadStoredLanguage();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache} proxyUrl={proxyUrl}>
      <ClerkLoaded>
        <SafeAreaProvider>
          <ErrorBoundary>
            <I18nextProvider i18n={i18n}>
              <QueryClientProvider client={queryClient}>
                <GestureHandlerRootView>
                  <KeyboardProvider>
                    <RootLayoutNav />
                  </KeyboardProvider>
                </GestureHandlerRootView>
              </QueryClientProvider>
            </I18nextProvider>
          </ErrorBoundary>
        </SafeAreaProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
