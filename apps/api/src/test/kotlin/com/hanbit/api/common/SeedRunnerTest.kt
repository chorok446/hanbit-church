package com.hanbit.api.common

import com.hanbit.api.auth.User
import com.hanbit.api.auth.UserRepository
import com.hanbit.api.auth.UserRole
import com.hanbit.api.cellgroup.CellGroupRepository
import com.hanbit.api.devotion.DevotionRepository
import com.hanbit.api.event.EventRepository
import com.hanbit.api.post.PostRepository
import com.hanbit.api.praise.PraiseSetlistRepository
import jakarta.persistence.EntityManager
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.EnumSource
import org.junit.jupiter.params.provider.ValueSource
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.test.context.TestPropertySource
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.post
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset

/** 실제 가입·H2 저장 상태로 검증한다. 부팅 초기화는 기존 계정의 권한/승인 복구 수단이 아니다. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@TestPropertySource(properties = ["app.signup.require-approval=true"])
class SeedRunnerTest(
    @param:Autowired private val posts: PostRepository,
    @param:Autowired private val events: EventRepository,
    @param:Autowired private val praiseSetlists: PraiseSetlistRepository,
    @param:Autowired private val devotions: DevotionRepository,
    @param:Autowired private val cellGroups: CellGroupRepository,
    @param:Autowired private val users: UserRepository,
    @param:Autowired private val encoder: PasswordEncoder,
    @param:Autowired private val entityManager: EntityManager,
    @param:Autowired private val mvc: MockMvc,
) {
    private val now = Instant.parse("2026-01-01T00:00:00Z")
    private val clock = Clock.fixed(now, ZoneOffset.UTC)
    private val email = "bootstrap-security@hanbit.local"
    private val password = "BootstrapOnly1!"

    private fun runner(adminPassword: String = password, adminEmail: String = email) = SeedRunner(
        posts, events, praiseSetlists, devotions, cellGroups, users, encoder, clock,
        adminEmail, adminPassword, "초기 관리자", "테스트교회",
    )

    private fun reloadUser(): User {
        entityManager.flush()
        entityManager.clear()
        return requireNotNull(users.findByEmail(email))
    }

    @ParameterizedTest
    @ValueSource(strings = ["", " ", "\t"])
    fun `관리자 비밀번호가 비어 있으면 신규 계정을 만들지 않는다`(blankPassword: String) {
        val count = users.count()

        runner(adminPassword = blankPassword).run()

        assertThat(users.findByEmail(email)).isNull()
        assertThat(users.count()).isEqualTo(count)
    }

    @Test
    fun `관리자 이메일로 일반 가입해도 비밀번호 미설정 재시작이 승인하거나 승격하지 않는다`() {
        mvc.post("/api/auth/signup") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"email":"$email","password":"SignupOnly1!","name":"일반 가입자"}"""
        }.andExpect {
            status { isCreated() }
            jsonPath("$.pendingApproval") { value(true) }
        }
        val originalHash = requireNotNull(users.findByEmail(email)).passwordHash

        runner(adminPassword = "").run()

        val user = reloadUser()
        assertThat(user.role).isEqualTo(UserRole.USER.name)
        assertThat(user.approvedAt).isNull()
        assertThat(user.passwordHash).isEqualTo(originalHash)
        mvc.post("/api/auth/login") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"email":"$email","password":"SignupOnly1!"}"""
        }.andExpect { status { isForbidden() } }
    }

    @ParameterizedTest
    @EnumSource(value = UserRole::class, names = ["ADMIN"], mode = EnumSource.Mode.EXCLUDE)
    fun `비밀번호를 설정해도 기존 비관리자와 충돌하면 상태 변경 없이 초기화를 거부한다`(role: UserRole) {
        users.saveAndFlush(
            User(email = email, passwordHash = "existing-hash", name = "기존 계정", role = role.name, approvedAt = null),
        )

        assertThatThrownBy { runner(adminEmail = "  ${email.uppercase()}  ").run() }
            .isInstanceOf(IllegalStateException::class.java)
            .hasMessageContaining("existing non-admin account")

        val user = reloadUser()
        assertThat(user.role).isEqualTo(role.name)
        assertThat(user.approvedAt).isNull()
        assertThat(user.passwordHash).isEqualTo("existing-hash")
        assertThat(user.name).isEqualTo("기존 계정")
    }

    @ParameterizedTest
    @ValueSource(booleans = [true, false])
    fun `기존 관리자의 승인과 제재 및 자격 증명은 재시작으로 변경하지 않는다`(approved: Boolean) {
        val approvedAt = if (approved) Instant.EPOCH else null
        val suspendedUntil = now.plusSeconds(3600)
        users.saveAndFlush(
            User(
                email = email, passwordHash = "changed-hash", name = "기존 관리자", role = UserRole.ADMIN.name,
                approvedAt = approvedAt, suspendedUntil = suspendedUntil, suspendedReason = "운영 제재",
                deletedAt = now, passwordResetRequired = true,
                totpSecret = "test-totp-secret", totpEnabledAt = now,
            ),
        )

        runner().run()

        val user = reloadUser()
        assertThat(user.role).isEqualTo(UserRole.ADMIN.name)
        assertThat(user.approvedAt).isEqualTo(approvedAt)
        assertThat(user.passwordHash).isEqualTo("changed-hash")
        assertThat(user.name).isEqualTo("기존 관리자")
        assertThat(user.suspendedUntil).isEqualTo(suspendedUntil)
        assertThat(user.suspendedReason).isEqualTo("운영 제재")
        assertThat(user.deletedAt).isEqualTo(now)
        assertThat(user.passwordResetRequired).isTrue()
        assertThat(user.totpSecret).isEqualTo("test-totp-secret")
        assertThat(user.totpEnabledAt).isEqualTo(now)
    }

    @Test
    fun `새 관리자만 설정된 비밀번호와 동일한 생성 승인 시각으로 만든다`() {
        runner(adminEmail = "  ${email.uppercase()}  ").run()

        val user = reloadUser()
        assertThat(user.role).isEqualTo(UserRole.ADMIN.name)
        assertThat(user.verified).isTrue()
        assertThat(user.name).isEqualTo("초기 관리자")
        assertThat(encoder.matches(password, user.passwordHash)).isTrue()
        assertThat(user.createdAt).isEqualTo(now)
        assertThat(user.approvedAt).isEqualTo(now)
    }

    @Test
    fun `반복 초기화는 관리자를 중복 생성하거나 비밀번호를 덮어쓰지 않는다`() {
        runner().run()
        val original = reloadUser()
        val originalId = original.id
        val originalHash = original.passwordHash
        val originalApprovedAt = original.approvedAt
        val count = users.count()

        runner(adminPassword = "DifferentBootstrap2!").run()

        val user = reloadUser()
        assertThat(users.count()).isEqualTo(count)
        assertThat(user.id).isEqualTo(originalId)
        assertThat(user.passwordHash).isEqualTo(originalHash)
        assertThat(user.approvedAt).isEqualTo(originalApprovedAt)
    }

    @Test
    fun `한 번 생성된 관리자가 강등된 뒤에도 부팅으로 권한을 복구하지 않는다`() {
        runner().run()
        val user = reloadUser()
        user.role = UserRole.USER.name
        users.saveAndFlush(user)

        assertThatThrownBy { runner().run() }.isInstanceOf(IllegalStateException::class.java)

        assertThat(reloadUser().role).isEqualTo(UserRole.USER.name)
    }
}
