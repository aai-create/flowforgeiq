import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  useGetDocument,
  useListShipments,
  useSaveExtractionCorrection,
  useUpdateDocument,
  type DocumentWithExtraction,
  type ReconciliationFinding,
  type ExtractedLineItem,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  extracted: { label: "Extracted", color: "#22c55e" },
  processing: { label: "Processing", color: "#f59e0b" },
  failed: { label: "Failed", color: "#e63946" },
  unmatched: { label: "Unmatched", color: "#596a7c" },
};

const SEVERITY_COLORS: Record<string, string> = {
  high: "#e63946",
  medium: "#f59e0b",
  low: "#596a7c",
};

const EDITABLE_FIELDS: { key: string; label: string }[] = [
  { key: "poNumber", label: "PO Number" },
  { key: "supplier", label: "Supplier" },
  { key: "buyer", label: "Buyer" },
  { key: "invoiceNumber", label: "Invoice Number" },
  { key: "invoiceDate", label: "Invoice Date" },
  { key: "currency", label: "Currency" },
  { key: "totalAmount", label: "Total Amount" },
  { key: "incoterms", label: "Incoterms" },
  { key: "paymentTerms", label: "Payment Terms" },
  { key: "etd", label: "ETD" },
  { key: "eta", label: "ETA" },
  { key: "portOfLoading", label: "Port of Loading" },
  { key: "portOfDischarge", label: "Port of Discharge" },
  { key: "documentType", label: "Document Type" },
  { key: "qcResult", label: "QC Result" },
];

interface EditFieldModalProps {
  visible: boolean;
  fieldKey: string;
  fieldLabel: string;
  originalValue: string;
  colors: ReturnType<typeof useColors>;
  onClose: () => void;
  onSave: (correctedValue: string) => void;
  isSaving: boolean;
}

function EditFieldModal({
  visible,
  fieldKey,
  fieldLabel,
  originalValue,
  colors,
  onClose,
  onSave,
  isSaving,
}: EditFieldModalProps) {
  const [value, setValue] = useState(originalValue);

  const handleSave = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSave(trimmed);
  }, [value, onSave]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.modalSheet, { backgroundColor: colors.card }]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>
            Edit {fieldLabel}
          </Text>
          {originalValue ? (
            <Text style={[styles.modalOriginal, { color: colors.mutedForeground }]}>
              Original: {originalValue}
            </Text>
          ) : null}
          <View style={[styles.editInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <TextInput
              style={[styles.editText, { color: colors.foreground }]}
              value={value}
              onChangeText={setValue}
              multiline={fieldKey === "transcriptSummary" || fieldKey === "qcResult"}
              autoFocus
              placeholder={`Enter corrected ${fieldLabel.toLowerCase()}…`}
              placeholderTextColor={colors.mutedForeground}
              selectTextOnFocus
            />
          </View>
          <View style={styles.modalButtons}>
            <Pressable
              onPress={onClose}
              style={[styles.modalBtn, styles.modalBtnCancel, { borderColor: colors.border }]}
            >
              <Text style={[styles.modalBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={isSaving || !value.trim()}
              style={[
                styles.modalBtn,
                styles.modalBtnSave,
                { backgroundColor: value.trim() ? colors.primary : colors.muted },
              ]}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={[styles.modalBtnText, { color: value.trim() ? "#fff" : colors.mutedForeground }]}>
                  Save Correction
                </Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface POPickerModalProps {
  visible: boolean;
  currentShipmentId: number | null;
  colors: ReturnType<typeof useColors>;
  onClose: () => void;
  onSelect: (shipmentId: number | null) => void;
  isLinking: boolean;
}

function POPickerModal({
  visible,
  currentShipmentId,
  colors,
  onClose,
  onSelect,
  isLinking,
}: POPickerModalProps) {
  const [query, setQuery] = useState("");
  const { data: shipments, isLoading } = useListShipments({ query: { enabled: visible } as any });

  const filtered = (shipments ?? []).filter((s) => {
    const q = query.toLowerCase();
    if (!q) return true;
    return (
      s.poNumber.toLowerCase().includes(q) ||
      (s.buyerPoNumber ?? "").toLowerCase().includes(q) ||
      s.supplierName.toLowerCase().includes(q) ||
      s.product.toLowerCase().includes(q)
    );
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.poSheet, { backgroundColor: colors.card }]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>Link to Shipment</Text>

          <View style={[styles.poSearch, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Feather name="search" size={14} color={colors.mutedForeground} />
            <TextInput
              style={[styles.poSearchText, { color: colors.foreground }]}
              value={query}
              onChangeText={setQuery}
              placeholder="Search PO number, supplier, product…"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {currentShipmentId != null && (
            <Pressable
              onPress={() => onSelect(null)}
              style={[styles.poUnlinkBtn, { borderColor: colors.destructive + "50", backgroundColor: colors.destructive + "10" }]}
            >
              <Feather name="link-2" size={14} color={colors.destructive} />
              <Text style={[styles.poUnlinkText, { color: colors.destructive }]}>Remove shipment link</Text>
            </Pressable>
          )}

          {isLoading ? (
            <View style={styles.poLoading}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(s) => String(s.id)}
              style={styles.poList}
              renderItem={({ item }) => {
                const isSelected = item.id === currentShipmentId;
                return (
                  <Pressable
                    onPress={() => onSelect(item.id)}
                    style={[
                      styles.poItem,
                      {
                        backgroundColor: isSelected ? `${colors.primary}15` : "transparent",
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    testID={`po-item-${item.id}`}
                  >
                    <View style={styles.poItemLeft}>
                      <Text style={[styles.poNumber, { color: colors.foreground }]}>
                        {item.poNumber}
                        {item.buyerPoNumber ? ` / ${item.buyerPoNumber}` : ""}
                      </Text>
                      <Text style={[styles.poSupplier, { color: colors.mutedForeground }]}>
                        {item.supplierName} · {item.product}
                      </Text>
                    </View>
                    {isSelected && (
                      <Feather name="check-circle" size={18} color={colors.primary} />
                    )}
                    {isLinking && isSelected && (
                      <ActivityIndicator size="small" color={colors.primary} />
                    )}
                  </Pressable>
                );
              }}
              ItemSeparatorComponent={() => (
                <View style={[styles.poDivider, { backgroundColor: colors.border }]} />
              )}
              ListEmptyComponent={() => (
                <View style={styles.poEmpty}>
                  <Text style={[styles.poEmptyText, { color: colors.mutedForeground }]}>
                    No shipments match your search
                  </Text>
                </View>
              )}
              showsVerticalScrollIndicator={false}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function DocumentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const docId = Number(id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();

  const { data: doc, isLoading, isError, refetch } = useGetDocument(docId);

  const { mutate: saveCorrection, isPending: isSaving } = useSaveExtractionCorrection();
  const { mutate: updateDocument, isPending: isLinking } = useUpdateDocument();

  const [editingField, setEditingField] = useState<{ key: string; label: string; value: string } | null>(null);
  const [showPOPicker, setShowPOPicker] = useState(false);
  const [correctedFields, setCorrectedFields] = useState<Record<string, string>>({});

  const extractedFields = (doc?.extraction?.extractedFields ?? {}) as Record<string, unknown>;
  const findings: ReconciliationFinding[] = doc?.extraction?.reconciliationFindings ?? [];
  const lineItems: ExtractedLineItem[] = doc?.extraction?.lineItems ?? [];

  function getFieldValue(key: string): string {
    if (correctedFields[key] !== undefined) return correctedFields[key];
    const v = extractedFields[key];
    if (v == null) return "";
    return String(v);
  }

  function handleEditField(key: string, label: string) {
    Haptics.selectionAsync();
    setEditingField({ key, label, value: getFieldValue(key) });
  }

  function handleSaveCorrection(correctedValue: string) {
    if (!doc?.extraction?.id || !editingField) return;
    const originalValue = String(extractedFields[editingField.key] ?? "");
    const docType = String(extractedFields.documentType ?? "unknown");

    saveCorrection(
      {
        id: doc.extraction.id,
        data: {
          fieldPath: editingField.key,
          correctedValue,
          originalValue: originalValue || undefined,
          documentType: docType,
        },
      },
      {
        onSuccess: () => {
          setCorrectedFields((prev) => ({ ...prev, [editingField.key]: correctedValue }));
          setEditingField(null);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
        onError: () => {
          Alert.alert("Save failed", "Could not save correction. Please try again.");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        },
      }
    );
  }

  function handleLinkShipment(shipmentId: number | null) {
    updateDocument(
      { id: docId, data: { shipmentId } },
      {
        onSuccess: () => {
          setShowPOPicker(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          refetch();
        },
        onError: () => {
          Alert.alert("Link failed", "Could not update shipment link. Please try again.");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        },
      }
    );
  }

  const statusCfg = doc ? (STATUS_CONFIG[doc.status] ?? { label: doc.status, color: "#596a7c" }) : null;

  if (isLoading) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading document…</Text>
      </View>
    );
  }

  if (isError || !doc) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={32} color={colors.destructive} />
        <Text style={[styles.errorTitle, { color: colors.foreground }]}>Document not found</Text>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const visibleFields = EDITABLE_FIELDS.filter((f) => getFieldValue(f.key) !== "" || extractedFields[f.key] != null);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12), backgroundColor: colors.primary },
        ]}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Feather name="arrow-left" size={22} color="rgba(255,255,255,0.9)" />
          </Pressable>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>{doc.fileName}</Text>
            <Text style={styles.headerSubtitle}>
              {formatBytes(doc.fileSize)} · {doc.sourceChannel}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(250)} style={styles.metaRow}>
          {statusCfg && (
            <View style={[styles.statusBadge, { backgroundColor: `${statusCfg.color}18` }]}>
              <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
            </View>
          )}
          <Text style={[styles.metaDate, { color: colors.mutedForeground }]}>
            {formatDate(doc.createdAt)}
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(280).delay(40)}
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <Feather name="package" size={15} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Shipment Link</Text>
            </View>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setShowPOPicker(true);
              }}
              style={[styles.linkBtn, { backgroundColor: colors.accent }]}
              testID="link-shipment-btn"
            >
              <Feather name="link" size={13} color={colors.primary} />
              <Text style={[styles.linkBtnText, { color: colors.primary }]}>
                {doc.shipmentId != null ? "Change" : "Link PO"}
              </Text>
            </Pressable>
          </View>
          {doc.shipmentId != null ? (
            <View style={[styles.linkedShipment, { backgroundColor: colors.accent }]}>
              <Feather name="check-circle" size={16} color={colors.primary} />
              <Text style={[styles.linkedText, { color: colors.primary }]}>
                Shipment #{doc.shipmentId}
              </Text>
            </View>
          ) : (
            <Text style={[styles.noLink, { color: colors.mutedForeground }]}>
              Not linked to a shipment
            </Text>
          )}
        </Animated.View>

        {doc.extraction && (
          <>
            {doc.extraction.confidence > 0 && (
              <Animated.View
                entering={FadeInDown.duration(280).delay(60)}
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.cardHeaderLeft}>
                  <Feather name="activity" size={15} color={colors.primary} />
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>Extraction Quality</Text>
                </View>
                <View style={styles.confRow}>
                  <Text style={[styles.confPct, { color: colors.foreground }]}>
                    {Math.round(doc.extraction.confidence * 100)}%
                  </Text>
                  <View style={[styles.confTrack, { backgroundColor: colors.muted }]}>
                    <View
                      style={[
                        styles.confFill,
                        {
                          width: `${Math.round(doc.extraction.confidence * 100)}%` as any,
                          backgroundColor:
                            doc.extraction.confidence >= 0.75
                              ? colors.success
                              : doc.extraction.confidence >= 0.5
                              ? colors.warning
                              : colors.destructive,
                        },
                      ]}
                    />
                  </View>
                </View>
                <Text style={[styles.extractionStatus, { color: colors.mutedForeground }]}>
                  Status: {doc.extraction.status}
                  {doc.extraction.errorMessage ? ` · ${doc.extraction.errorMessage}` : ""}
                </Text>
              </Animated.View>
            )}

            {visibleFields.length > 0 && (
              <Animated.View
                entering={FadeInDown.duration(280).delay(80)}
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.cardHeaderLeft}>
                  <Feather name="layers" size={15} color={colors.primary} />
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>Extracted Fields</Text>
                  <Text style={[styles.cardHint, { color: colors.mutedForeground }]}>
                    Tap to correct
                  </Text>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                {visibleFields.map((f, i) => {
                  const val = getFieldValue(f.key);
                  const isCorrected = correctedFields[f.key] !== undefined;
                  return (
                    <Pressable
                      key={f.key}
                      onPress={() => handleEditField(f.key, f.label)}
                      style={({ pressed }) => [
                        styles.fieldRow,
                        i > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                        { opacity: pressed ? 0.75 : 1 },
                      ]}
                      testID={`field-${f.key}`}
                    >
                      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                        {f.label}
                      </Text>
                      <View style={styles.fieldRight}>
                        <Text
                          style={[
                            styles.fieldValue,
                            {
                              color: isCorrected ? colors.success : colors.foreground,
                              fontStyle: val ? "normal" : "italic",
                            },
                          ]}
                          numberOfLines={2}
                        >
                          {val || "—"}
                        </Text>
                        {isCorrected && (
                          <Feather name="check" size={12} color={colors.success} />
                        )}
                        <Feather name="edit-2" size={13} color={colors.mutedForeground} />
                      </View>
                    </Pressable>
                  );
                })}
              </Animated.View>
            )}

            {lineItems.length > 0 && (
              <Animated.View
                entering={FadeInDown.duration(280).delay(100)}
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.cardHeaderLeft}>
                  <Feather name="list" size={15} color={colors.primary} />
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                    Line Items ({lineItems.length})
                  </Text>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                {lineItems.map((item, i) => (
                  <View
                    key={i}
                    style={[
                      styles.lineItem,
                      i > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.lineDesc, { color: colors.foreground }]}>
                      {item.description ?? `Item ${i + 1}`}
                    </Text>
                    <View style={styles.lineMetaRow}>
                      {item.quantity != null && (
                        <Text style={[styles.lineMeta, { color: colors.mutedForeground }]}>
                          Qty: {item.quantity}{item.unit ? ` ${item.unit}` : ""}
                        </Text>
                      )}
                      {item.unitPrice != null && (
                        <Text style={[styles.lineMeta, { color: colors.mutedForeground }]}>
                          Unit: ${item.unitPrice.toFixed(2)}
                        </Text>
                      )}
                      {item.totalPrice != null && (
                        <Text style={[styles.lineTotal, { color: colors.foreground }]}>
                          ${item.totalPrice.toFixed(2)}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </Animated.View>
            )}

            {findings.length > 0 && (
              <Animated.View
                entering={FadeInDown.duration(280).delay(120)}
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.cardHeaderLeft}>
                  <Feather name="alert-triangle" size={15} color={colors.warning} />
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                    Reconciliation Findings ({findings.length})
                  </Text>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                {findings.map((f, i) => {
                  const severity = f.severity ?? "low";
                  const sevColor = SEVERITY_COLORS[severity] ?? SEVERITY_COLORS.low;
                  return (
                    <View
                      key={i}
                      style={[
                        styles.finding,
                        i > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                      ]}
                    >
                      <View style={styles.findingTop}>
                        <View
                          style={[
                            styles.severityBadge,
                            { backgroundColor: `${sevColor}18` },
                          ]}
                        >
                          <Text style={[styles.severityText, { color: sevColor }]}>
                            {severity.toUpperCase()}
                          </Text>
                        </View>
                        <Text style={[styles.findingType, { color: colors.foreground }]}>
                          {f.type ?? "mismatch"}
                        </Text>
                        {f.field != null && (
                          <Text style={[styles.findingField, { color: colors.mutedForeground }]}>
                            · {f.field}
                          </Text>
                        )}
                      </View>
                      {(f.expected != null || f.actual != null) && (
                        <View style={styles.findingValues}>
                          {f.expected != null && (
                            <Text style={[styles.findingVal, { color: colors.mutedForeground }]}>
                              Expected: <Text style={{ color: colors.success }}>{f.expected}</Text>
                            </Text>
                          )}
                          {f.actual != null && (
                            <Text style={[styles.findingVal, { color: colors.mutedForeground }]}>
                              Actual: <Text style={{ color: sevColor }}>{f.actual}</Text>
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </Animated.View>
            )}

            {doc.extraction.transcriptText && (
              <Animated.View
                entering={FadeInDown.duration(280).delay(140)}
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.cardHeaderLeft}>
                  <Feather name="file-text" size={15} color={colors.primary} />
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>Transcript</Text>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <Text style={[styles.transcript, { color: colors.mutedForeground }]}>
                  {doc.extraction.transcriptText}
                </Text>
              </Animated.View>
            )}
          </>
        )}

        {!doc.extraction && (
          <View style={[styles.card, styles.noExtraction, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="hourglass-outline" size={28} color={colors.mutedForeground} />
            <Text style={[styles.noExtractionText, { color: colors.mutedForeground }]}>
              Extraction not yet available
            </Text>
          </View>
        )}
      </ScrollView>

      {editingField && (
        <EditFieldModal
          visible
          fieldKey={editingField.key}
          fieldLabel={editingField.label}
          originalValue={editingField.value}
          colors={colors}
          onClose={() => setEditingField(null)}
          onSave={handleSaveCorrection}
          isSaving={isSaving}
        />
      )}

      <POPickerModal
        visible={showPOPicker}
        currentShipmentId={doc.shipmentId ?? null}
        colors={colors}
        onClose={() => setShowPOPicker(false)}
        onSelect={handleLinkShipment}
        isLinking={isLinking}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 8 },
  errorTitle: { fontSize: 16, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  backBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginTop: 4 },
  backBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  header: { paddingBottom: 16, paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#fff", fontFamily: "Inter_700Bold", letterSpacing: -0.2 },
  headerSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular", marginTop: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  metaDate: { fontSize: 13, fontFamily: "Inter_400Regular" },
  card: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 7, flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  cardHint: { fontSize: 11, fontFamily: "Inter_400Regular", marginLeft: 4 },
  divider: { height: 1 },
  linkedShipment: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  linkedText: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  noLink: { fontSize: 13, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  linkBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  linkBtnText: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  confRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  confPct: { fontSize: 22, fontWeight: "700", fontFamily: "Inter_700Bold", width: 52 },
  confTrack: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  confFill: { height: 8, borderRadius: 4 },
  extractionStatus: { fontSize: 12, fontFamily: "Inter_400Regular" },
  fieldRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingVertical: 9, gap: 8 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  fieldRight: { flexDirection: "row", alignItems: "center", gap: 6, flex: 2, justifyContent: "flex-end" },
  fieldValue: { fontSize: 13, fontWeight: "500", fontFamily: "Inter_500Medium", textAlign: "right", flexShrink: 1 },
  lineItem: { paddingVertical: 8, gap: 4 },
  lineDesc: { fontSize: 13, fontFamily: "Inter_500Medium" },
  lineMetaRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  lineMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  lineTotal: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold", marginLeft: "auto" },
  finding: { paddingVertical: 10, gap: 6 },
  findingTop: { flexDirection: "row", alignItems: "center", gap: 7, flexWrap: "wrap" },
  severityBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 },
  severityText: { fontSize: 10, fontWeight: "700", fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  findingType: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  findingField: { fontSize: 13, fontFamily: "Inter_400Regular" },
  findingValues: { gap: 2, paddingLeft: 4 },
  findingVal: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  transcript: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  noExtraction: { alignItems: "center", paddingVertical: 28, gap: 8 },
  noExtractionText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 14, maxHeight: "75%" },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  modalTitle: { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold" },
  modalOriginal: { fontSize: 13, fontFamily: "Inter_400Regular" },
  editInput: { borderRadius: 10, borderWidth: 1, padding: 12 },
  editText: { fontSize: 15, fontFamily: "Inter_400Regular", minHeight: 44 },
  modalButtons: { flexDirection: "row", gap: 10 },
  modalBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  modalBtnCancel: { borderWidth: 1 },
  modalBtnSave: {},
  modalBtnText: { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  poSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 12, height: "80%" },
  poSearch: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  poSearchText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  poUnlinkBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  poUnlinkText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  poList: { flex: 1 },
  poItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1 },
  poItemLeft: { flex: 1, gap: 2 },
  poNumber: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  poSupplier: { fontSize: 12, fontFamily: "Inter_400Regular" },
  poDivider: { height: 1, marginVertical: 4 },
  poLoading: { flex: 1, alignItems: "center", justifyContent: "center" },
  poEmpty: { alignItems: "center", padding: 32 },
  poEmptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
