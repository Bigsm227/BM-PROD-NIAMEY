import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { X, Wallet, Phone, CheckCircle2, Disc3 } from "lucide-react-native";

import { createOrder } from "@/src/api";
import { openLink, openWhatsApp, STUDIO } from "@/src/contact";
import { Field, PrimaryButton } from "@/src/components/ui";
import { fonts, makeStyles, useTheme } from "@/src/theme";

const METHODS = ["MyNita", "Amanata"];

export default function Paiement() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ title?: string; price_mp3?: string; price_wav?: string }>();
  const title = params.title;
  const priceMp3 = params.price_mp3 || "";
  const priceWav = params.price_wav || "";
  const isOrder = !!title;

  const licenses = [
    ...(priceMp3 ? [{ key: "MP3", price: priceMp3 }] : []),
    ...(priceWav ? [{ key: "WAV", price: priceWav }] : []),
  ];
  const [license, setLicense] = useState(licenses[0]?.key ?? "MP3");
  const [method, setMethod] = useState("MyNita");
  const [name, setName] = useState("");

  const selectedPrice = (licenses.find((l) => l.key === license)?.price ?? priceMp3) || priceWav;

  const confirm = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (isOrder) {
      // Record the order for studio tracking (best-effort, never blocks WhatsApp).
      try {
        await createOrder({
          beat_title: title!,
          license,
          price: selectedPrice,
          method,
          customer_name: name.trim(),
        });
      } catch {
        // ignore — still send the WhatsApp message
      }
      const who = name.trim() ? `Nom: ${name.trim()}. ` : "";
      const message = `Bonjour Big S, ${who}je commande l'instrumentale "${title}" — licence ${license} (${selectedPrice}).\nPaiement via ${method} au ${STUDIO.phoneDisplay}. Je confirme l'envoi du reçu.`;
      openWhatsApp(message);
    } else {
      openWhatsApp(`Bonjour Big S, j'ai effectué un paiement via ${method} pour valider ma commande/session.`);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.iconWrap}>
          <Wallet color={colors.brandPrimary} size={22} />
        </View>
        <Text style={styles.title}>{isOrder ? "Commande & Paiement" : "Paiement & Transfert"}</Text>
        <Pressable testID="close-payment-button" onPress={() => router.back()} hitSlop={12} style={styles.closeBtn}>
          <X color={colors.onSurface} size={22} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
      >
        {isOrder ? (
          <View style={styles.orderCard} testID="payment-order-summary">
            <View style={styles.orderCover}>
              <Disc3 color={colors.onBrandPrimary} size={22} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.orderLabel}>Votre commande</Text>
              <Text style={styles.orderTitle} numberOfLines={1}>
                {title}
              </Text>
            </View>
            <Text style={styles.orderPrice}>{selectedPrice}</Text>
          </View>
        ) : (
          <Text style={styles.lead}>Réglez votre acompte ou vos prestations en toute simplicité.</Text>
        )}

        {isOrder && licenses.length > 0 ? (
          <View style={{ gap: 10 }}>
            <Text style={styles.fieldLabel}>Choisissez la licence</Text>
            <View style={styles.licenses}>
              {licenses.map((l) => {
                const active = license === l.key;
                return (
                  <Pressable
                    key={l.key}
                    testID={`license-${l.key}`}
                    onPress={() => setLicense(l.key)}
                    style={[styles.licenseCard, active && styles.licenseActive]}
                  >
                    <Text style={[styles.licenseName, active && styles.licenseNameActive]}>Licence {l.key}</Text>
                    <Text style={[styles.licensePrice, active && styles.licenseNameActive]}>{l.price}</Text>
                    <Text style={styles.licenseHint}>{l.key === "MP3" ? "Fichier compressé" : "Qualité studio"}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Reception number */}
        <View style={styles.numberCard}>
          <Text style={styles.numberLabel}>Numéro de Réception Studio</Text>
          <Text style={styles.number}>{STUDIO.phoneDisplay}</Text>
          <Pressable
            testID="call-studio-button"
            onPress={() => openLink(`tel:${STUDIO.phoneTel}`)}
            style={({ pressed }) => [styles.callBtn, pressed && styles.pressed]}
          >
            <Phone color={colors.brandPrimary} size={15} />
            <Text style={styles.callText}>Appeler le studio</Text>
          </Pressable>
        </View>

        <Text style={styles.info}>
          {"Envoyez votre paiement mobile au numéro ci-dessus via MyNita ou Amanata, puis confirmez l'envoi du reçu sur WhatsApp."}
        </Text>

        {isOrder ? (
          <Field label="Votre nom (facultatif)" testID="order-name-input" value={name} onChangeText={setName} placeholder="Pour identifier votre commande" />
        ) : null}

        <Text style={styles.fieldLabel}>Méthode de paiement mobile</Text>
        <View style={styles.methods}>
          {METHODS.map((m) => {
            const active = method === m;
            return (
              <Pressable
                key={m}
                testID={`payment-method-${m}`}
                onPress={() => setMethod(m)}
                style={[styles.methodChip, active && styles.methodActive]}
              >
                {active ? <CheckCircle2 color={colors.onBrandPrimary} size={16} /> : null}
                <Text style={[styles.methodText, active && styles.methodTextActive]}>{m}</Text>
              </Pressable>
            );
          })}
        </View>

        <PrimaryButton
          testID="confirm-payment-button"
          label={isOrder ? "Payer & confirmer sur WhatsApp" : "Confirmer le paiement sur WhatsApp"}
          onPress={confirm}
          style={{ marginTop: 8 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: colors.surfaceSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: colors.onSurface, fontFamily: fonts.displaySemiBold, fontSize: 22, flex: 1 },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scroll: { padding: 20, gap: 18 },
  lead: { color: colors.onSurfaceSecondary, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  orderCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  orderCover: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  orderLabel: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12 },
  orderTitle: { color: colors.onSurface, fontFamily: fonts.semiBold, fontSize: 16, marginTop: 2 },
  orderPrice: { color: colors.brandPrimary, fontFamily: fonts.displaySemiBold, fontSize: 18 },
  licenses: { flexDirection: "row", gap: 12 },
  licenseCard: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 3,
  },
  licenseActive: { borderColor: colors.brandPrimary, backgroundColor: colors.surfaceTertiary },
  licenseName: { color: colors.onSurfaceSecondary, fontFamily: fonts.semiBold, fontSize: 14 },
  licenseNameActive: { color: colors.onSurface },
  licensePrice: { color: colors.brandPrimary, fontFamily: fonts.displaySemiBold, fontSize: 18 },
  licenseHint: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11 },
  numberCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.brandSecondary,
    padding: 22,
    gap: 8,
    alignItems: "center",
  },
  numberLabel: { color: colors.muted, fontFamily: fonts.medium, fontSize: 13, letterSpacing: 0.5 },
  number: { color: colors.brandPrimary, fontFamily: fonts.displayBold, fontSize: 34, letterSpacing: 1 },
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.brandPrimary,
  },
  callText: { color: colors.brandPrimary, fontFamily: fonts.semiBold, fontSize: 13 },
  info: { color: colors.onSurfaceTertiary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21 },
  fieldLabel: { color: colors.onSurfaceTertiary, fontFamily: fonts.medium, fontSize: 13, letterSpacing: 0.3 },
  methods: { flexDirection: "row", gap: 12 },
  methodChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceTertiary,
  },
  methodActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  methodText: { color: colors.onSurfaceTertiary, fontFamily: fonts.medium, fontSize: 15 },
  methodTextActive: { color: colors.onBrandPrimary, fontFamily: fonts.semiBold },
  pressed: { opacity: 0.85 },
}));
