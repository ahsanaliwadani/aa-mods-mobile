import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  message?: string;
};

function SpinningGear({ size, color, duration = 6000, opacity = 1 }: { size: number; color: string; duration?: number; opacity?: number }) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: Platform.OS !== "web" }),
    ).start();
  }, []);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return (
    <Animated.View style={{ transform: [{ rotate }], opacity }}>
      <Ionicons name="settings-outline" size={size} color={color} />
    </Animated.View>
  );
}

function PulseCircle({ size, color, delay }: { size: number; color: string; delay: number }) {
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0.7)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.6, duration: 2000, useNativeDriver: Platform.OS !== "web" }),
          Animated.timing(opacity, { toValue: 0, duration: 2000, useNativeDriver: Platform.OS !== "web" }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 0.8, duration: 0, useNativeDriver: Platform.OS !== "web" }),
          Animated.timing(opacity, { toValue: 0.7, duration: 0, useNativeDriver: Platform.OS !== "web" }),
        ]),
      ]),
    ).start();
  }, []);
  return (
    <Animated.View
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: color,
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}

function AnimatedDot({ delay }: { delay: number }) {
  const opacity = useRef(new Animated.Value(0.2)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(opacity, { toValue: 0.2, duration: 400, useNativeDriver: Platform.OS !== "web" }),
      ]),
    ).start();
  }, []);
  return <Animated.View style={[styles.dot, { opacity }]} />;
}

export function MaintenanceScreen({ message }: Props) {
  const insets = useSafeAreaInsets();
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: Platform.OS !== "web" }),
      Animated.spring(slideUp, { toValue: 0, useNativeDriver: Platform.OS !== "web", tension: 60, friction: 10 }),
    ]).start();
  }, []);

  const paddingTop = Platform.OS === "web" ? 80 : insets.top + 20;
  const paddingBottom = Platform.OS === "web" ? 40 : insets.bottom + 20;

  return (
    <View style={[styles.root, { paddingTop, paddingBottom }]}>

      {/* Background blobs */}
      <View style={[styles.blob, styles.blobTR]} />
      <View style={[styles.blob, styles.blobBL]} />

      <Animated.View style={[styles.content, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>

        {/* Icon section */}
        <View style={styles.iconSection}>
          <PulseCircle size={140} color="rgba(251,191,36,0.5)" delay={0} />
          <PulseCircle size={140} color="rgba(251,191,36,0.3)" delay={700} />
          <View style={styles.gearRing}>
            <View style={styles.gearInner}>
              <SpinningGear size={48} color="#fbbf24" duration={5000} />
            </View>
          </View>
          {/* Counter-rotating small gear */}
          <View style={styles.smallGearWrap}>
            <SpinningGear size={22} color="rgba(251,191,36,0.6)" duration={3000} />
          </View>
        </View>

        {/* Status badge */}
        <View style={styles.statusBadge}>
          <View style={styles.dotsRow}>
            <AnimatedDot delay={0} />
            <AnimatedDot delay={200} />
            <AnimatedDot delay={400} />
          </View>
          <Text style={styles.statusText}>MAINTENANCE IN PROGRESS</Text>
        </View>

        {/* Heading */}
        <Text style={styles.title}>We'll be back{"\n"}shortly</Text>

        {/* Message */}
        <View style={styles.messageCard}>
          <Ionicons name="information-circle-outline" size={16} color="#fbbf24" style={{ marginTop: 1 }} />
          <Text style={styles.messageText}>
            {message?.trim() || "AA Mods is currently undergoing scheduled maintenance. We're working hard to get things back up and running."}
          </Text>
        </View>

        {/* Feature list */}
        <View style={styles.featureList}>
          {[
            { icon: "shield-checkmark-outline", label: "Your data is safe" },
            { icon: "flash-outline",            label: "Back online soon" },
            { icon: "refresh-outline",          label: "Improvements underway" },
          ].map((f) => (
            <View key={f.label} style={styles.featureItem}>
              <View style={styles.featureIconWrap}>
                <Ionicons name={f.icon as "flash-outline"} size={14} color="#fbbf24" />
              </View>
              <Text style={styles.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </View>

      </Animated.View>
    </View>
  );
}

const AMBER = "#fbbf24";

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#050816",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  blob: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    opacity: 0.10,
  },
  blobTR: { top: -80, right: -80, backgroundColor: AMBER },
  blobBL: { bottom: -80, left: -80, backgroundColor: "#f59e0b" },

  content: {
    width: "100%",
    alignItems: "center",
    gap: 20,
  },

  iconSection: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  gearRing: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: "rgba(251,191,36,0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(251,191,36,0.35)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: AMBER,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  gearInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  smallGearWrap: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(251,191,36,0.08)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(251,191,36,0.08)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.25)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: AMBER,
  },
  statusText: {
    color: AMBER,
    fontSize: 10,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.3,
  },

  title: {
    fontSize: 34,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    color: "#f0f4fc",
    textAlign: "center",
    letterSpacing: -0.8,
    lineHeight: 42,
  },

  messageCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#09111d",
    borderWidth: 1,
    borderColor: "#15304a",
    borderRadius: 16,
    padding: 16,
    width: "100%",
  },
  messageText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#94a3b8",
    lineHeight: 21,
  },

  featureList: {
    width: "100%",
    gap: 8,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#09111d",
    borderWidth: 1,
    borderColor: "#0f2030",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  featureIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "rgba(251,191,36,0.08)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  featureLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#64748b",
    fontWeight: "500",
  },
});
