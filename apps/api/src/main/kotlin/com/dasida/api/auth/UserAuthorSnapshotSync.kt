package com.dasida.api.auth

import com.dasida.api.campaign.CampaignCommentRepository
import com.dasida.api.campaign.CampaignProofRepository
import com.dasida.api.campaign.CampaignRepository
import com.dasida.api.post.PostCommentRepository
import com.dasida.api.post.PostRepository
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
    private val campaigns: CampaignRepository,
    private val campaignComments: CampaignCommentRepository,
    private val campaignProofs: CampaignProofRepository,
) {
    /** 프로필 수정 시 기존 작성물의 author 이름·이미지를 최신값으로 맞춘다. */
    fun syncProfile(userId: Long, name: String, profileImageUrl: String?) {
        posts.syncAuthorProfile(userId, name, profileImageUrl)
        postComments.syncAuthorProfile(userId, name, profileImageUrl)
        campaigns.syncAuthorProfile(userId, name, profileImageUrl)
        campaignComments.syncAuthorProfile(userId, name, profileImageUrl)
        campaignProofs.syncAuthorProfile(userId, name, profileImageUrl)
    }

    /** 탈퇴 시 기존 작성물의 author 를 익명 이름으로 치환한다(이미지는 각 anonymizeAuthor 가 비운다). */
    fun anonymize(userId: Long, anonymizedName: String) {
        posts.anonymizeAuthor(userId, anonymizedName)
        postComments.anonymizeAuthor(userId, anonymizedName)
        campaigns.anonymizeAuthor(userId, anonymizedName)
        campaignComments.anonymizeAuthor(userId, anonymizedName)
        campaignProofs.anonymizeAuthor(userId, anonymizedName)
    }
}
