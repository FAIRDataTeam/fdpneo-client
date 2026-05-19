import { useQuery } from "@tanstack/vue-query";
import { queryKeys } from "@/api/queries";
import type { RecordKind } from "@/types/record";

export interface DashboardRow {
  type: RecordKind;
  typeLabel: string;
  title: string;
  status: "published" | "draft" | "review";
  version: string;
  views: string;
  modified: string;
}

const rows: DashboardRow[] = [
  { type: "dataset", typeLabel: "Dataset", title: "Alzheimer's Disease Cohort 2024 — Longitudinal MRI", status: "published", version: "2024.2", views: "412", modified: "2 min ago" },
  { type: "dataset", typeLabel: "Dataset", title: "Parkinson Cohort — MRI follow-up 2024", status: "review", version: "2024.1", views: "284", modified: "1 day ago" },
  { type: "dataset", typeLabel: "Dataset", title: "AD Biobank — CSF samples 2018–2024", status: "published", version: "1.3", views: "186", modified: "3 days ago" },
  { type: "biobank", typeLabel: "Biobank", title: "Erasmus MC Neuro-biobank", status: "published", version: "2.1", views: "92", modified: "1 week ago" },
  { type: "publication", typeLabel: "Publication", title: "Subcortical atrophy patterns in early AD", status: "published", version: "1.0", views: "44", modified: "2 weeks ago" },
  { type: "dataset", typeLabel: "Dataset", title: "Healthy Aging Reference — MRI 2025", status: "draft", version: "—", views: "—", modified: "yesterday" },
  { type: "dataset", typeLabel: "Dataset", title: "Cognitive Reserve Sub-cohort 2024", status: "draft", version: "—", views: "—", modified: "4 days ago" },
];

export function useStewardRecords() {
  return useQuery({
    queryKey: queryKeys.stewardRecords(),
    queryFn: () => new Promise<DashboardRow[]>((res) => setTimeout(() => res(rows), 120)),
    staleTime: 30_000,
  });
}
