import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useListDocuments } from "@workspace/api-client-react";
import type { DocumentWithExtraction } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

type DocStatus = "processing" | "extracted" | "failed" | "unmatched" | string;

const STATUS_CONFIG: Record<string, { label: string; icon: keyof typeof Feather.glyphMap; color: string }> = {
  extracted: { label: "Extracted", icon: "check-circle", color: "#22c55e" },
  processing: { label: "Processing", icon: "clock", color: "#f59e0b" },
  failed: { label: "Failed", icon: "alert-circle", color: "#e63946" },
  unmatched: { label: "Unmatched", icon: "help-circle", color: "#596a7c" },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] ?? { label: status, icon: "file" as keyof typeof Feather.glyphMap, color: "#596a7c" };
}

function getFileIcon(fileType: string): keyof typeof Feather.glyphMap {
  switch (fileType) {
    case "pdf": return "file-text";
    case "image": return "image";
    case "spreadsheet": return "grid";
    case "audio": return "mic";
    default: return "file";
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface DocCardProps {
  doc: DocumentWithExtraction;
  onPress: () => void;
}

function DocCard({ doc, onPress }: DocCardProps) {
  const colors = useColors();
  const sc = getStatusConfig(doc.status);
  const fileIcon = getFileIcon(doc.fileType);
  const hasFindings = (doc.extraction?.reconciliationFindings?.length ?? 0) > 0;

  return (
    <Animated.View entering={FadeInDown.duration(250).springify()}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
        testID={`doc-card-${doc.id}`}
      >
        <View style={styles.cardTop}>
          <View style={[styles.fileIconWrap, { backgroundColor: colors.accent }]}>
            <Feather name={fileIcon} size={18} color={colors.primary} />
          </View>
          <View style={styles.cardMeta}>
            <Text style={[styles.fileName, { color: colors.foreground }]} numberOfLines={1}>
              {doc.fileName}
            </Text>
            <Text style={[styles.fileSub, { color: colors.mutedForeground }]}>
              {formatBytes(doc.fileSize)} · {doc.sourceChannel} · {formatDate(doc.createdAt)}
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </View>

        <View style={styles.cardBottom}>
          <View style={[styles.statusPill, { backgroundColor: `${sc.color}18` }]}>
            <Feather name={sc.icon} size={12} color={sc.color} />
            <Text style={[styles.statusLabel, { color: sc.color }]}>{sc.label}</Text>
          </View>

          {doc.shipmentId != null && (
            <View style={[styles.shipPill, { backgroundColor: colors.accent }]}>
              <Feather name="package" size={11} color={colors.accentForeground} />
              <Text style={[styles.shipLabel, { color: colors.accentForeground }]}>
                PO #{doc.shipmentId}
              </Text>
            </View>
          )}

          {hasFindings && (
            <View style={[styles.findingPill, { backgroundColor: `${"#f59e0b"}18` }]}>
              <Feather name="alert-triangle" size={11} color="#f59e0b" />
              <Text style={[styles.findingLabel, { color: "#f59e0b" }]}>
                {doc.extraction!.reconciliationFindings.length} finding{doc.extraction!.reconciliationFindings.length !== 1 ? "s" : ""}
              </Text>
            </View>
          )}

          {doc.extraction?.confidence != null && doc.extraction.confidence > 0 && (
            <View style={styles.confWrap}>
              <Text style={[styles.confText, { color: colors.mutedForeground }]}>
                {Math.round(doc.extraction.confidence * 100)}%
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const STATUS_FILTERS = ["all", "extracted", "processing", "unmatched", "failed"] as const;
type FilterKey = typeof STATUS_FILTERS[number];

export default function DocumentsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");

  const { data: docs, isLoading, isRefetching, refetch, isError } = useListDocuments();

  const filtered = (docs ?? []).filter((d) => {
    const matchesFilter = filter === "all" || d.status === filter;
    const matchesSearch =
      search.trim() === "" ||
      d.fileName.toLowerCase().includes(search.toLowerCase()) ||
      (d.shipmentId != null && String(d.shipmentId).includes(search));
    return matchesFilter && matchesSearch;
  });

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
        <Text style={styles.headerSubtitle}>Document Extractions</Text>
      </View>

      <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="search" size={15} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by filename or PO..."
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="none"
          autoCorrect={false}
          testID="doc-search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")} hitSlop={8}>
            <Feather name="x" size={14} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((f) => {
          const active = filter === f;
          const count = f === "all" ? (docs?.length ?? 0) : (docs ?? []).filter((d) => d.status === f).length;
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.filterPill,
                {
                  backgroundColor: active ? colors.primary : colors.card,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.filterText, { color: active ? "#fff" : colors.mutedForeground }]}>
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                {count > 0 ? ` ${count}` : ""}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isLoading && !isRefetching && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading documents…</Text>
        </View>
      )}

      {isError && (
        <View style={styles.center}>
          <Feather name="wifi-off" size={32} color={colors.mutedForeground} />
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>Could not load documents</Text>
          <Pressable
            onPress={() => refetch()}
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <View style={styles.center}>
          <Feather name="inbox" size={36} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {search || filter !== "all" ? "No matching documents" : "No documents yet"}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            {search || filter !== "all"
              ? "Try a different filter or search term"
              : "Upload a document from the web app to get started"}
          </Text>
        </View>
      )}

      {!isError && (
        <FlatList
          data={filtered}
          keyExtractor={(d) => String(d.id)}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 16 },
          ]}
          renderItem={({ item }) => (
            <DocCard
              doc={item}
              onPress={() => router.push(`/document/${item.id}` as any)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingBottom: 16, paddingHorizontal: 20 },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#fff", fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.72)", fontFamily: "Inter_400Regular", marginTop: 1, letterSpacing: 0.3 },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginTop: 14, marginBottom: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  filterRow: { flexDirection: "row", gap: 6, paddingHorizontal: 16, marginBottom: 12, flexWrap: "nowrap" },
  filterPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  card: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  fileIconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardMeta: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  fileSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  cardBottom: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusLabel: { fontSize: 11, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  shipPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  shipLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  findingPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  findingLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  confWrap: { marginLeft: "auto" },
  confText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 32 },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 8 },
  errorText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginTop: 4 },
  retryText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  emptyTitle: { fontSize: 16, fontWeight: "600", fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptySubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
});
