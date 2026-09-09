plugins {
	kotlin("jvm") version "2.4.10"
	kotlin("kapt") version "2.4.10"
	kotlin("plugin.spring") version "2.4.10"
	kotlin("plugin.jpa") version "2.4.10"
	id("org.springframework.boot") version "4.1.1"
	id("io.spring.dependency-management") version "1.1.7"
}

group = "com.hanbit"
version = "0.0.1-SNAPSHOT"

java {
	toolchain {
		languageVersion = JavaLanguageVersion.of(21)
	}
}

repositories {
	mavenCentral()
}

// Boot 4.1.1의 Tomcat 11.0.24에 남은 보안 패치(CVE-2026-65182 등).
// embed-core/el/websocket을 함께 정렬한다. Boot BOM이 11.0.25 이상이면 재감사 후 제거.
extra["tomcat.version"] = "11.0.25"

dependencies {
	implementation("org.springframework.boot:spring-boot-starter-actuator")
	// Prometheus 메트릭(/actuator/prometheus). 버전은 Boot BOM 관리.
	implementation("io.micrometer:micrometer-registry-prometheus")
	implementation("org.springframework.boot:spring-boot-starter-web")
	implementation("org.springframework.boot:spring-boot-starter-websocket")
	implementation("org.springframework.boot:spring-boot-starter-data-jpa")
	// 스키마 마이그레이션(db/migration). Boot 4 는 자동구성이 모듈로 분리되어
	// flyway-core 만으로는 동작하지 않고 starter-flyway 가 필요하다. MySQL 8 은 flyway-mysql 추가.
	implementation("org.springframework.boot:spring-boot-starter-flyway")
	implementation("org.flywaydb:flyway-mysql")
	implementation("org.springframework.boot:spring-boot-starter-data-redis")
	implementation("org.springframework.boot:spring-boot-starter-security")
	implementation("tools.jackson.module:jackson-module-kotlin")
	// Hibernate @JdbcTypeCode(JSON) 는 HibernateJsonFormatMapperConfig 에서 Jackson 3 JsonMapper로 연결한다.
	implementation("org.jetbrains.kotlin:kotlin-reflect")
	// OpenAPI 3 문서 자동 생성 + Swagger UI.
	// [spike] Boot 4.1(Spring 7) 대응으로 springdoc 3.x 라인으로 상향. springdoc 3.0.3 은
	// Spring Framework 7 / Servlet 6.1 기준이며, 이전 2.8.x 는 Boot 3.5 기준이었다.
	implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:3.1.0")
	implementation("io.github.openfeign.querydsl:querydsl-jpa:7.5")
	kapt("io.github.openfeign.querydsl:querydsl-apt:7.5:jpa")
	kapt("jakarta.persistence:jakarta.persistence-api")
	kapt("jakarta.annotation:jakarta.annotation-api")
	// JWT (jjwt)
	implementation("io.jsonwebtoken:jjwt-api:0.13.0")
	runtimeOnly("io.jsonwebtoken:jjwt-impl:0.13.0")
	runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.13.0")
	// 리치 본문 HTML 서버측 정화(저장 시점). 프론트 DOMPurify 와 이중 방어.
	implementation("org.jsoup:jsoup:1.23.1")
	// Sentry 에러 추적. SENTRY_DSN 미설정(기본)이면 SDK 비활성 — 로컬/CI 무영향.
	// sentry-spring-boot-4 는 Boot 4(Spring 7) 전용 모듈(starter-jakarta 는 Boot 3 용).
	implementation(platform("io.sentry:sentry-bom:8.50.1"))
	implementation("io.sentry:sentry-spring-boot-4")
	implementation("io.sentry:sentry-logback")
	runtimeOnly("com.mysql:mysql-connector-j")
	testImplementation("org.springframework.boot:spring-boot-starter-test")
	// [spike] Boot 4 에서 test slice(@AutoConfigureMockMvc/MockMvc)가 기술별 모듈로 분리됨.
	// spring-boot-starter-test 는 더 이상 webmvc test slice 를 전이 포함하지 않아 별도 추가한다.
	testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
	// [spike] Boot 4 TestRestTemplate 자동구성은 분리된 RestTemplateBuilder 모듈을 요구한다.
	testImplementation("org.springframework.boot:spring-boot-starter-restclient")
	testImplementation("org.springframework.security:spring-security-test")
	testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
	testRuntimeOnly("com.h2database:h2")
	testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

kotlin {
	compilerOptions {
		freeCompilerArgs.addAll("-Xjsr305=strict")
	}
}

tasks.withType<Test> {
	useJUnitPlatform()
}
