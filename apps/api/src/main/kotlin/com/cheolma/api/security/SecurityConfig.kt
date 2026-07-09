package com.cheolma.api.security

import jakarta.servlet.DispatcherType
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpMethod
import org.springframework.http.HttpStatus
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.HttpStatusEntryPoint
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter

@Configuration
@EnableWebSecurity
// URL 매처(아래 requestMatchers)에 더해, 최고권한 admin 작업은 서비스 계층 @PreAuthorize 로 이중 방어한다.
@EnableMethodSecurity
class SecurityConfig(
    private val jwtFilter: JwtAuthFilter,
    // 행사 개설을 스태프(최고 관리자·운영자·사역 담당자)로 제한할지. e2e·기존 흐름 보호를 위해 기본 꺼짐.
    // TODO(운영 결정): 실제 운영 전환 시 EVENT_CREATE_STAFF_ONLY=true 로 켠다.
    @param:org.springframework.beans.factory.annotation.Value("\${app.events.staff-only-create:false}")
    private val eventCreateStaffOnly: Boolean,
) {
    @Bean
    fun passwordEncoder(): PasswordEncoder = BCryptPasswordEncoder()

    // CORS 정책은 CorsConfig 로 분리했다. .cors{} 가 corsConfigurationSource bean 을 자동으로 사용한다.

    @Bean
    fun filterChain(http: HttpSecurity): SecurityFilterChain {
        http
            // CSRF 토큰 미사용: 인증 쿠키가 SameSite=Lax(AuthCookies)라 cross-site POST 에 실리지 않고,
            // CORS origin 허용 목록으로 브라우저 교차 출처 요청을 제한한다.
            .csrf { it.disable() }
            .cors { }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .exceptionHandling { it.authenticationEntryPoint(HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)) }
            .authorizeHttpRequests {
                // ERROR 재디스패치는 인가에서 제외 → 컨트롤러가 던진 400/409 등이 /error 경유로
                // 401 마스킹되는 것을 막는다. 클라이언트가 직접 친 /error 는 REQUEST 디스패치라
                // 아래 anyRequest().authenticated() 에 걸려 401 로 차단된다.
                it.dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                it.requestMatchers("/actuator/health").permitAll()
                // 관리자 API — 역할별 세분(UserRole 참조). 구체 경로를 /api/admin/** ADMIN 폴백보다 먼저 선언한다.
                // 새가족 신청 관리: 새가족 담당자까지.
                it.requestMatchers("/api/admin/new-family/**").hasAnyRole("ADMIN", "OPERATOR", "NEW_FAMILY")
                // 가입 승인·신고·회원 조회·콘텐츠 숨김: 운영자까지.
                it.requestMatchers("/api/admin/users/pending").hasAnyRole("ADMIN", "OPERATOR")
                it.requestMatchers("/api/admin/users/*/approve", "/api/admin/users/*/reject").hasAnyRole("ADMIN", "OPERATOR")
                it.requestMatchers(HttpMethod.GET, "/api/admin/users").hasAnyRole("ADMIN", "OPERATOR")
                it.requestMatchers("/api/admin/reports/**").hasAnyRole("ADMIN", "OPERATOR")
                it.requestMatchers("/api/admin/content/**").hasAnyRole("ADMIN", "OPERATOR")
                // 대시보드 요약·추이: 모든 스태프.
                it.requestMatchers("/api/admin/summary", "/api/admin/stats")
                    .hasAnyRole("ADMIN", "OPERATOR", "MINISTRY", "NEW_FAMILY", "CONTENT")
                // 나머지(감사 로그, 회원 역할 변경·정지 등)는 최고 관리자 전용.
                it.requestMatchers("/api/admin/**").hasRole("ADMIN")
                it.requestMatchers("/ws/messages").permitAll()
                // OpenAPI JSON / Swagger UI 는 문서 확인용으로 공개한다. /api/** 인증 정책과 무관한 별도 경로다.
                it.requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                it.requestMatchers(HttpMethod.POST, "/api/auth/**").permitAll()
                // 새가족 등록 신청은 비로그인 방문자용 공개 POST(IP 레이트리밋으로 방어).
                it.requestMatchers(HttpMethod.POST, "/api/new-family").permitAll()
                it.requestMatchers(HttpMethod.GET, "/api/posts/mine").authenticated()
                it.requestMatchers(HttpMethod.GET, "/api/posts/mine/page").authenticated()
                it.requestMatchers(HttpMethod.GET, "/api/posts/bookmarks").authenticated()
                it.requestMatchers(HttpMethod.GET, "/api/posts/bookmarks/page").authenticated()
                it.requestMatchers(HttpMethod.GET, "/api/auth/me").authenticated()
                it.requestMatchers(HttpMethod.GET, "/api/auth/access-logs").authenticated()
                it.requestMatchers(HttpMethod.GET, "/api/events/joined").authenticated()
                it.requestMatchers(HttpMethod.GET, "/api/events/joined/page").authenticated()
                it.requestMatchers(HttpMethod.GET, "/api/events/mine").authenticated()
                it.requestMatchers(HttpMethod.GET, "/api/events/mine/page").authenticated()
                it.requestMatchers(HttpMethod.GET, "/api/events/bookmarks").authenticated()
                it.requestMatchers(HttpMethod.GET, "/api/events/bookmarks/page").authenticated()
                it.requestMatchers(HttpMethod.GET, "/api/events/*/participants").authenticated()
                it.requestMatchers(HttpMethod.POST, "/api/users/*/block").authenticated()
                it.requestMatchers(HttpMethod.DELETE, "/api/users/*/block").authenticated()
                // 알림은 사용자별 데이터 → 일반 GET permitAll 보다 먼저 보호한다.
                it.requestMatchers(HttpMethod.GET, "/api/notifications/**").authenticated()
                it.requestMatchers(HttpMethod.POST, "/api/notifications/**").authenticated()
                it.requestMatchers(HttpMethod.GET, "/api/reports/mine").authenticated()
                it.requestMatchers(HttpMethod.POST, "/api/reports").authenticated()
                // 찬양팀 공개 일정(교회 캘린더 합류용)만 예외 — 응답 범위는 서비스가 요청자별로 좁힌다
                // (비로그인 PUBLIC / 로그인 CHURCH+PUBLIC / 찬양팀 멤버 전체). authenticated 매처보다 먼저 선언.
                it.requestMatchers(HttpMethod.GET, "/api/praise/schedules/public").permitAll()
                // 나머지 찬양팀 내부 API — 인증만 여기서 요구하고, 찬양팀 권한(멤버/리더)은
                // PraiseService 가 요청자 praiseRole 을 DB 조회로 검사한다(JwtAuthFilter 는 사이트 role 만 부여).
                it.requestMatchers("/api/praise/**").authenticated()
                if (eventCreateStaffOnly) {
                    // 행사 개설 스태프 제한(플래그). POST /api/events/{id}/join 등 하위 경로는 해당 없음(정확 일치).
                    it.requestMatchers(HttpMethod.POST, "/api/events").hasAnyRole("ADMIN", "OPERATOR", "MINISTRY")
                }
                // 문서(주보 PDF) 업로드는 공지·주보 작성 권한(최고 관리자·운영자·콘텐츠 관리자)과 동일.
                it.requestMatchers(HttpMethod.POST, "/api/media/document").hasAnyRole("ADMIN", "OPERATOR", "CONTENT")
                it.requestMatchers(HttpMethod.POST, "/api/media").authenticated()
                // 찬양팀 파일은 uploads/praise/ 하위에 저장된다. 공개 정적 경로(/uploads/**)로의 직접 접근을
                // 차단해 인증 서빙(GET /api/praise/files/{name})만 남긴다 — permitAll 매처보다 먼저 선언.
                it.requestMatchers(HttpMethod.GET, "/uploads/praise/**").denyAll()
                it.requestMatchers(HttpMethod.GET, "/uploads/**").permitAll()
                it.requestMatchers(HttpMethod.GET, "/api/**").permitAll()
                it.anyRequest().authenticated()
            }
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter::class.java)
        return http.build()
    }
}
