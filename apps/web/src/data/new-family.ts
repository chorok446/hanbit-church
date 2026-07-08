import { apiGet, apiPatch, apiPost } from "@/lib/api";

export type NewFamilyItem = {
  id: string;
  name: string;
  phone: string;
  note: string | null;
  createdAt: string;
  contactedAt: string | null;
};

export type NewFamilyPageResponse = {
  content: NewFamilyItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  pendingCount: number;
};

export function submitNewFamily(body: { name: string; phone: string; note?: string }): Promise<{ id: string }> {
  return apiPost<{ id: string }>("/api/new-family", body);
}

export function fetchNewFamilyPage(params: { pendingOnly?: boolean; page?: number; size?: number }): Promise<NewFamilyPageResponse> {
  const query = new URLSearchParams({
    page: String(params.page ?? 0),
    size: String(params.size ?? 20),
  });
  if (params.pendingOnly) query.set("pendingOnly", "true");
  return apiGet<NewFamilyPageResponse>(`/api/admin/new-family?${query.toString()}`);
}

export function setNewFamilyContacted(id: string, contacted: boolean): Promise<NewFamilyItem> {
  return apiPatch<NewFamilyItem>(`/api/admin/new-family/${id}`, { contacted });
}
