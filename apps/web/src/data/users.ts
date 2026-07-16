import { apiDeleteVoid, apiGet, apiPostVoid, apiPut } from "@/lib/api";
import { isAllowedImageUrl } from "@/lib/image-url";
import type { PostPageResponse } from "@/data/posts";

export type UserProfile = {
  id: number;
  email: string;
  name: string;
  verified: boolean;
  profileImageUrl?: string | null;
  notifyEventUpdates?: boolean;
  notifyComments?: boolean;
  notifyLikes?: boolean;
  /** 임시 비밀번호 사용 중 — 비밀번호 변경 안내가 필요하다. */
  passwordChangeRequired?: boolean;
  /** 백엔드 UserRole 과 1:1 — 스태프 역할 정의는 app/admin/permissions.ts 참조. */
  role?: "USER" | "ADMIN" | "OPERATOR" | "MINISTRY" | "NEW_FAMILY" | "CONTENT";
  /** 찬양팀 역할 — null·미지정이면 찬양팀 소속이 아니다. 라벨은 data/praise-team.ts 참조. */
  praiseRole?: "LEADER" | "MEMBER" | "GUEST" | null;
  /** 찬양팀 파트(백엔드 PraisePart 문자열 — LEADER/VOCAL/KEYBOARD/…). */
  praiseParts?: string[];
  /** 2단계 인증(TOTP) 활성 여부. */
  twoFactorEnabled?: boolean;
};

export type PublicUser = {
  id: number;
  name: string;
  verified: boolean;
  profileImageUrl?: string | null;
  postCount: number;
  blockedByMe?: boolean | null;
};

export type PublicUserPageResponse = {
  content: PublicUser[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export function fetchPublicUser(id: number): Promise<PublicUser> {
  return apiGet<PublicUser>(`/api/users/${id}`);
}

export async function blockUser(id: number): Promise<void> {
  await apiPostVoid(`/api/users/${id}/block`);
}

export async function unblockUser(id: number): Promise<void> {
  await apiDeleteVoid(`/api/users/${id}/block`);
}

export function searchUsersPage(q: string, page: number, size = 12): Promise<PublicUserPageResponse> {
  const params = new URLSearchParams({ q, page: String(page), size: String(size) });
  return apiGet<PublicUserPageResponse>(`/api/users/search?${params.toString()}`);
}

export function fetchUserPostsPage(userId: number, page: number, size = 10): Promise<PostPageResponse> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  return apiGet<PostPageResponse>(`/api/users/${userId}/posts?${params.toString()}`);
}

export type UpdateProfileRequest = {
  name: string;
  profileImageUrl: string | null;
  notifyEventUpdates?: boolean;
  notifyComments?: boolean;
  notifyLikes?: boolean;
};

export type UpdateProfileResponse = {
  token: string;
  profile: UserProfile;
};

export const MAX_NAME_LENGTH = 30;
export const MAX_PROFILE_IMAGE_URL_LENGTH = 500;

export function isValidProfileImageUrl(url: string): boolean {
  return isAllowedImageUrl(url);
}

export function validateProfileUpdate(input: { name: string; profileImageUrl: string }):
  | { ok: true; name: string; profileImageUrl: string | null }
  | { ok: false; message: string } {
  const name = input.name.trim();
  if (!name) return { ok: false, message: "표시 이름을 입력해주세요." };
  if (name.length > MAX_NAME_LENGTH) {
    return { ok: false, message: `표시 이름은 ${MAX_NAME_LENGTH}자 이하여야 합니다.` };
  }
  const imageUrl = input.profileImageUrl.trim();
  if (imageUrl.length > MAX_PROFILE_IMAGE_URL_LENGTH) {
    return { ok: false, message: `프로필 이미지 URL은 ${MAX_PROFILE_IMAGE_URL_LENGTH}자 이하여야 합니다.` };
  }
  if (imageUrl && !isValidProfileImageUrl(imageUrl)) {
    return { ok: false, message: "프로필 이미지 URL은 https:// 로 시작해야 합니다." };
  }
  return { ok: true, name, profileImageUrl: imageUrl || null };
}

export function updateProfile(
  body: UpdateProfileRequest,
): Promise<UpdateProfileResponse> {
  return apiPut<UpdateProfileResponse>("/api/auth/me", body);
}
