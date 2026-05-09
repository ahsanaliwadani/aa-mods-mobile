if (typeof window !== "undefined" && typeof console !== "undefined") {
  const _orig = console.warn.bind(console);
  console.warn = (...args: unknown[]) => {
    const s =
      (typeof args[0] === "string" ? args[0] : "") +
      (typeof args[1] === "string" ? args[1] : "");
    if (
      s.includes("props.pointerEvents") ||
      s.includes("push token changes") ||
      s.includes("not yet fully supported on web") ||
      s.includes("Firebase Analytics is not supported") ||
      s.includes("analytics/invalid-analytics-context") ||
      s.includes("browser extension environment") ||
      s.includes("measurement ID") ||
      s.includes("useNativeDriver") ||
      s.includes("native animated module is missing")
    ) return;
    _orig(...args);
  };
}
