import { useCallback, useEffect, useState } from "react";
import { AppState, Linking, Switch } from "react-native";
import { BellRing } from "lucide-react-native";

import { AppListItem } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import { disablePush, pushStatus, registerForPush, type PushStatus } from "@/services/push";

const SUBTITLE: Record<PushStatus, string> = {
  on: "New leads, reviews and replies from our team",
  off: "Get an alert the moment a customer contacts you",
  denied: "Blocked in system settings. Tap to allow.",
  unsupported: "Not available on this device",
};

/** Turns push alerts for this device on or off; sends the person to system settings when they are blocked. */
export function PushAlertsRow() {
  const theme = useTheme();
  const toast = useToast();
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    pushStatus()
      .then(setStatus)
      .catch(() => setStatus("unsupported"));
  }, []);

  // Coming back from system settings may have changed the permission.
  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener("change", (s) => s === "active" && refresh());
    return () => sub.remove();
  }, [refresh]);

  const toggle = async (on: boolean): Promise<void> => {
    if (status === "denied") {
      await Linking.openSettings();
      return;
    }
    setBusy(true);
    try {
      if (on) {
        const next = await registerForPush({ ask: true });
        setStatus(next);
        if (next === "denied") toast("Allow notifications for DialNFind Business in system settings", "info");
      } else {
        await disablePush();
        setStatus("off");
      }
    } catch (error: unknown) {
      toast(errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const current = status ?? "off";
  return (
    <AppListItem
      title="Lead alerts"
      subtitle={SUBTITLE[current]}
      leading={<BellRing size={18} color={theme.colors.brand.primary} />}
      showChevron={false}
      onPress={current === "denied" ? () => void Linking.openSettings() : undefined}
      trailing={
        <Switch
          accessibilityLabel="Lead alerts"
          value={current === "on"}
          disabled={busy || status === null || current === "unsupported"}
          onValueChange={(v) => void toggle(v)}
          trackColor={{ false: theme.colors.border.secondary, true: theme.colors.brand.primary }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={theme.colors.border.secondary}
        />
      }
    />
  );
}
