package com.hanbit.api.common

import com.hanbit.api.auth.User
import com.hanbit.api.auth.UserRepository
import com.hanbit.api.auth.UserRole
import com.hanbit.api.devotion.DevotionRepository
import com.hanbit.api.devotion.DevotionSeed
import com.hanbit.api.event.EventRepository
import com.hanbit.api.event.EventSeed
import com.hanbit.api.post.PostRepository
import com.hanbit.api.post.PostSeed
import com.hanbit.api.cellgroup.CellGroupRepository
import com.hanbit.api.cellgroup.CellGroupSeed
import com.hanbit.api.praise.PraiseSeed
import com.hanbit.api.praise.PraiseSetlistRepository
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.CommandLineRunner
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Component

/**
 * 비어있는 테이블에만 시드 적재. reversed() 로 저장해 seq DESC 정렬 시 시드 원래 순서(p1, c1 …)가 유지된다.
 * 알림은 사용자별 도메인 이벤트로만 생성되므로 시드하지 않는다.
 */
@Component
class SeedRunner(
    private val posts: PostRepository,
    private val events: EventRepository,
    private val praiseSetlists: PraiseSetlistRepository,
    private val devotions: DevotionRepository,
    private val cellGroups: CellGroupRepository,
    private val users: UserRepository,
    private val encoder: PasswordEncoder,
    private val clock: java.time.Clock,
    @Value("\${app.admin.email}") private val adminEmail: String,
    @Value("\${app.admin.password}") private val adminPassword: String,
    @Value("\${app.admin.name}") private val adminName: String,
    // 시드의 공식 계정 표시명 — 배포 교회명(env)을 따라간다(리브랜드 잔재가 신뢰 표면에 노출되지 않게).
    @Value("\${app.church.name:한빛교회}") private val churchName: String,
) : CommandLineRunner {
    override fun run(vararg args: String) {
        if (posts.count() == 0L) {
            posts.saveAll(PostSeed.posts(churchName).reversed().onEachIndexed { i, p -> p.seq = (i + 1).toLong() })
        }
        if (events.count() == 0L) {
            events.saveAll(EventSeed.events(churchName).reversed().onEachIndexed { i, c -> c.seq = (i + 1).toLong() })
        }
        if (praiseSetlists.count() == 0L) {
            praiseSetlists.saveAll(PraiseSeed.setlists(java.time.Instant.now()))
        }
        if (devotions.count() == 0L) {
            devotions.saveAll(DevotionSeed.devotions(clock))
        }
        if (cellGroups.count() == 0L) {
            cellGroups.saveAll(CellGroupSeed.groups(java.time.Instant.now()))
        }
        seedAdmin()
    }

    /**
     * 부트스트랩 관리자 계정. ADMIN_PASSWORD 가 설정된 경우에만 생성한다
     * (기본 비밀번호를 내장하면 운영에서 그대로 노출될 수 있어 명시적 주입을 요구).
     * 이미 존재하는 계정이면 role 승격만 보장하고 비밀번호는 건드리지 않는다.
     */
    private fun seedAdmin() {
        val existing = users.findByEmail(adminEmail.trim().lowercase())
        if (existing != null) {
            // 부트스트랩 관리자는 승인제와 무관하게 로그인 가능해야 한다 — role 승격 + 미승인 시 승인 처리.
            var changed = false
            if (!existing.isAdmin) {
                existing.role = UserRole.ADMIN.name
                changed = true
            }
            if (existing.approvedAt == null) {
                existing.approvedAt = java.time.Instant.now()
                changed = true
            }
            if (changed) {
                users.save(existing)
                log.info("ensured bootstrap ADMIN (role/approval): {}", adminEmail)
            }
            return
        }
        if (adminPassword.isBlank()) {
            log.info("admin seed skipped: ADMIN_PASSWORD not set")
            return
        }
        users.save(
            User(
                email = adminEmail.trim().lowercase(),
                passwordHash = encoder.encode(adminPassword)!!,
                name = adminName,
                verified = true,
                role = UserRole.ADMIN.name,
                createdAt = java.time.Instant.now(),
                // 승인제(app.signup.require-approval=true) 에서도 부트스트랩 관리자는 즉시 로그인 가능해야 한다.
                approvedAt = java.time.Instant.now(),
            ),
        )
        log.info("admin account seeded: {}", adminEmail)
    }

    private companion object {
        private val log = LoggerFactory.getLogger(SeedRunner::class.java)
    }
}
