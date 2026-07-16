package com.hanbit.api.common

import org.jsoup.Jsoup
import org.jsoup.nodes.Document
import org.jsoup.safety.Safelist
import java.net.URI

private val imgSrcPattern = Regex("""<img[^>]+src=["'](https?://[^"']+)["']""", RegexOption.IGNORE_CASE)
private val imgTagPattern = Regex("""<img[^>]*>""", RegexOption.IGNORE_CASE)
private val emptyParagraphPattern = Regex("""<p>(?:\s|&nbsp;|<br\s*/?>)*</p>""", RegexOption.IGNORE_CASE)

/**
 * 저장용 본문 HTML 허용 목록. 프론트 sanitize-rich-html.ts 의 DOMPurify 허용 태그를 미러링한다
 * (img 는 splitRichBodyHtml 에서 별도 배열로 분리되므로 여기선 제외). a[href] 는 http/https 만 허용.
 */
private val richBodySafelist: Safelist = Safelist()
    .addTags("p", "br", "strong", "b", "em", "i", "ul", "ol", "li", "a")
    .addAttributes("a", "href")
    .addProtocols("a", "href", "http", "https")

private val richBodyOutputSettings: Document.OutputSettings =
    Document.OutputSettings().prettyPrint(false)

/**
 * 저장 전 본문 HTML 을 서버측에서 정화한다(script·on* 핸들러·javascript: 등 제거).
 * XSS 방어의 1차 책임은 프론트 DOMPurify 지만, SSR·모바일·외부 연동 등 다른 소비자를 위한 이중 방어로
 * 저장 값 자체를 안전하게 만든다.
 */
fun sanitizeRichBodyHtml(html: String): String =
    Jsoup.clean(html, "", richBodySafelist, richBodyOutputSettings)

/** img 제거 후 남는 빈 문단을 정리한다. */
fun cleanEmptyRichParagraphs(html: String): String {
    var next = html.trim()
    var prev = ""
    while (next != prev) {
        prev = next
        next = emptyParagraphPattern.replace(next, "").trim()
    }
    return next
}

/**
 * 게시글·행사 이미지로 허용할 URL 인지. https 만 허용해 추적 픽셀·mixed content 를 막고,
 * http 는 로컬 개발(localhost·127.0.0.1 업로드 서빙)만 예외 — 프론트 lib/image-url.ts 의
 * isAllowedImageUrl 과 동일 규칙(정책 단일 출처). 서버가 이미지를 fetch 하진 않으므로 SSRF 는 범위 밖.
 * 스킴·호스트 비교는 소문자로(HTTPS://·LOCALHOST 등 대문자 표기도 동일 판정, 프론트 new URL 과 정합).
 */
fun isAllowedImageUrl(url: String): Boolean {
    val scheme = url.lowercase()
    if (scheme.startsWith("https://")) return true
    if (!scheme.startsWith("http://")) return false
    return try {
        URI(url).host?.lowercase()?.let { it == "localhost" || it == "127.0.0.1" } ?: false
    } catch (_: Exception) {
        false
    }
}

/** 본문 HTML 에서 갤러리용 이미지 URL 을 분리한다. 추적 픽셀 방어로 https(로컬 http 예외) 만 남긴다. */
fun splitRichBodyHtml(body: String): Pair<String, List<String>> {
    val images = imgSrcPattern
        .findAll(body)
        .map { it.groupValues[1].trim() }
        .filter { it.isNotBlank() && isAllowedImageUrl(it) }
        .distinct()
        .toList()
    // img 제거 후 남은 서식 HTML 을 서버측에서 정화한다(저장 값 자체를 안전하게).
    val sanitized = sanitizeRichBodyHtml(body.replace(imgTagPattern, ""))
    val withoutImages = cleanEmptyRichParagraphs(sanitized)
    return withoutImages to images
}
