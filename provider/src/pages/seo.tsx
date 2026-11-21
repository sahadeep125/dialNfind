import { useMemo } from "react";
import { Link } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { useProfile } from "@/layouts/app-layout";
import type { ProviderProfile } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/common";
import { SeoEditor, type SeoFields } from "@/components/seo-editor";
import { SEO_CHECK_PAGE } from "@/lib/seo";

export function SeoPage() {
  const { data } = useProfile();
  if (!data) return <PageSkeleton />;
  return <SeoView profile={data} />;
}

function SeoView({ profile }: { profile: ProviderProfile }) {
  const qc = useQueryClient();
  const fields = useMemo<SeoFields>(() => ({ seoTitle: profile.seoTitle, seoDescription: profile.seoDescription, focusKeyword: profile.focusKeyword, seoKeywords: profile.seoKeywords }), [profile]);
  const save = useMutation({
    mutationFn: (body: SeoFields) => api<{ provider: ProviderProfile }>("/provider/profile", { method: "PATCH", json: body }),
    onSuccess: ({ provider }) => {
      qc.setQueryData(["profile"], provider);
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(`SEO saved. Your score is ${provider.seo.score}.`);
    },
  });
  return (
    <>
      <PageHeader
        title="Search and Google"
        description="How your business shows up when people in Siliguri search Google for your service. The score shows what to improve so more customers find and call you."
      />
      <SeoEditor
        seo={profile.seo}
        fields={fields}
        slug={profile.slug}
        checkPath="/provider/seo/check"
        onSave={(body) => save.mutate(body)}
        saving={save.isPending}
        saveError={save.error ? errorMessage(save.error) : null}
        version={profile.updatedAt}
        action={(key) =>
          SEO_CHECK_PAGE[key] ? (
            <Link to={SEO_CHECK_PAGE[key].to} className="font-medium whitespace-nowrap text-primary hover:underline">
              Open {SEO_CHECK_PAGE[key].label}
            </Link>
          ) : null
        }
      />
    </>
  );
}
