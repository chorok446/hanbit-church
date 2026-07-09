import type { ReactNode } from "react";
import Link from "next/link";
import { Avatar } from "@/components/avatar";

export function AuthorHeader({
  name,
  nameContent,
  verified,
  profileImageUrl,
  authorId,
  avatarSize,
  time,
  timeClassName = "text-[12px] opacity-60",
  className = "",
}: {
  name: string;
  /** 이름 자리에 렌더할 노드(검색 하이라이트 등). 미지정 시 name 그대로 표시. */
  nameContent?: ReactNode;
  verified: boolean;
  profileImageUrl?: string | null;
  authorId?: number | null;
  avatarSize?: number;
  time?: string;
  timeClassName?: string;
  className?: string;
}) {
  const inner = (
    <>
      <Avatar name={name} verified={verified} size={avatarSize} src={profileImageUrl ?? undefined} />
      <div>
        <div style={{ color: "var(--foreground)" }}>{nameContent ?? name}</div>
        {time ? (
          <div className={timeClassName} style={{ color: "var(--foreground)" }}>
            {time}
          </div>
        ) : null}
      </div>
    </>
  );
  const classNames = `flex items-center gap-3 min-w-0 ${className}`.trim();
  if (authorId) {
    return (
      <Link href={`/users/${authorId}`} className={`${classNames} transition-opacity hover:opacity-90`}>
        {inner}
      </Link>
    );
  }
  return <div className={classNames}>{inner}</div>;
}
