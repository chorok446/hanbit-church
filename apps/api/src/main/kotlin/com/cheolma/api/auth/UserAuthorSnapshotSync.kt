package com.cheolma.api.auth

import com.cheolma.api.event.EventCommentRepository
import com.cheolma.api.event.EventProofRepository
import com.cheolma.api.event.EventRepository
import com.cheolma.api.post.PostCommentRepository
import com.cheolma.api.post.PostRepository
import org.springframework.stereotype.Service

/**
 * 사용자 작성물(게시글·댓글·행사·후기)에 박제된 author snapshot(이름·프로필 이미지) 전파를 전담한다.
 * 프로필 수정(syncProfile)과 탈퇴 익명화(anonymize)가 같은 5개 저장소에 같은 패턴으로 반복하던 것을 한곳에 모은다.
 * AccountService 가 이 컴포넌트만 의존하면 되어 5개 저장소 의존이 계정 서비스에서 빠진다.
 */
@Service
class UserAuthorSnapshotSync(
    private val posts: PostRepository,
    private val postComments: PostCommentRepository,
    private val events: EventRepository,
    private val eventComments: EventCommentRepository,
    private val eventProofs: EventProofRepository,
) {
    /** 프로필 수정 시 기존 작성물의 author 이름·이미지를 최신값으로 맞춘다. */
    fun syncProfile(userId: Long, name: String, profileImageUrl: String?) {
        posts.syncAuthorProfile(userId, name, profileImageUrl)
        postComments.syncAuthorProfile(userId, name, profileImageUrl)
        events.syncAuthorProfile(userId, name, profileImageUrl)
        eventComments.syncAuthorProfile(userId, name, profileImageUrl)
        eventProofs.syncAuthorProfile(userId, name, profileImageUrl)
    }

    /** 탈퇴 시 기존 작성물의 author 를 익명 이름으로 치환한다(이미지는 각 anonymizeAuthor 가 비운다). */
    fun anonymize(userId: Long, anonymizedName: String) {
        posts.anonymizeAuthor(userId, anonymizedName)
        postComments.anonymizeAuthor(userId, anonymizedName)
        events.anonymizeAuthor(userId, anonymizedName)
        eventComments.anonymizeAuthor(userId, anonymizedName)
        eventProofs.anonymizeAuthor(userId, anonymizedName)
    }
}
