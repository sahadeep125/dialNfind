import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import type { Hours, ProviderProfile, ProviderService, ServiceArea } from "@/lib/types";
import { useProfile } from "@/layouts/app-layout";
import { PageHeader, Panel } from "@/components/page-header";
import { PageSkeleton, SaveBar } from "@/components/common";
import { AreasEditor, DEFAULT_HOURS, HoursEditor, normalizeHours, ServicesEditor } from "@/components/editors";

/**
 * Shared shape for the list editors (services, hours, areas): load from the profile, edit locally,
 * PUT the whole list back.
 */
function useListEditor<T>(select: (p: ProviderProfile) => T, endpoint: string, key: string) {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const initial = useMemo(() => (profile ? select(profile) : null), [profile]); // eslint-disable-line react-hooks/exhaustive-deps
  const [value, setValue] = useState<T | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) setValue(initial);
  }, [initial]);

  async function save(payload: unknown) {
    setSaving(true);
    try {
      await api(endpoint, { method: "PUT", json: { [key]: payload } });
      await qc.invalidateQueries();
      toast.success("Saved");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const dirty = value !== null && JSON.stringify(value) !== JSON.stringify(initial);
  return { initial, value, setValue, saving, save, dirty };
}

export function ServicesPage() {
  const e = useListEditor<ProviderService[]>((p) => p.services, "/provider/services", "services");
  if (!e.value || !e.initial) return <PageSkeleton />;
  return (
    <>
      <PageHeader title="Services and prices" description="Customers search by service. A starting price makes you far more likely to get the call." />
      <Panel>
        <ServicesEditor value={e.value} onChange={e.setValue} />
      </Panel>
      <SaveBar
        dirty={e.dirty}
        saving={e.saving}
        onReset={() => e.setValue(e.initial)}
        onSave={() => {
          if (e.value!.length === 0) return toast.error("Keep at least one service");
          void e.save(e.value!.map(({ categoryId, subcategoryId, startingPrice, priceUnit, isPrimary }) => ({ categoryId, subcategoryId, startingPrice, priceUnit, isPrimary })));
        }}
      />
    </>
  );
}

export function HoursPage() {
  const e = useListEditor<Hours[]>((p) => (p.businessHours.length ? normalizeHours(p.businessHours) : DEFAULT_HOURS), "/provider/hours", "hours");
  if (!e.value || !e.initial) return <PageSkeleton />;
  return (
    <>
      <PageHeader title="Working hours" description="Customers see an Open now label during these hours, in India Standard Time." />
      <Panel>
        <HoursEditor value={e.value} onChange={e.setValue} />
      </Panel>
      <SaveBar dirty={e.dirty} saving={e.saving} onReset={() => e.setValue(e.initial)} onSave={() => void e.save(e.value)} />
    </>
  );
}

export function AreasPage() {
  const e = useListEditor<ServiceArea[]>(
    (p) => p.serviceAreas.map(({ areaName, pincode, latitude, longitude }) => ({ areaName, pincode, latitude, longitude })),
    "/provider/service-areas",
    "serviceAreas",
  );
  const { data: profile } = useProfile();
  if (!e.value || !e.initial || !profile) return <PageSkeleton />;
  return (
    <>
      <PageHeader title="Service areas" description={`You appear in searches within ${profile.serviceRadiusKm} km of your location. Add localities you travel to so customers searching by name find you too.`} />
      <Panel>
        <AreasEditor value={e.value} onChange={e.setValue} />
      </Panel>
      <SaveBar dirty={e.dirty} saving={e.saving} onReset={() => e.setValue(e.initial)} onSave={() => void e.save(e.value)} />
    </>
  );
}
