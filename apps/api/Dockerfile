# 로컬 Docker Compose / 개발용 API 이미지. 운영 배포용이 아니다.
FROM eclipse-temurin:21-jdk-jammy AS build
WORKDIR /workspace

COPY gradlew gradlew.bat settings.gradle.kts build.gradle.kts ./
COPY gradle gradle
COPY src src

RUN --mount=type=cache,target=/root/.gradle \
  chmod +x gradlew \
  && ./gradlew bootJar --no-daemon -x test

FROM eclipse-temurin:21-jre-jammy
# 로그 타임스탬프·JVM 기본 시간대 — 도메인 Clock 은 코드에서 KST 고정이지만 로그도 맞춘다.
ENV TZ=Asia/Seoul
WORKDIR /app

COPY --from=build /workspace/build/libs/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
