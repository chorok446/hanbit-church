package com.hanbit.api.common

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class RichBodyHtmlTest {
    @Test
    fun `splitRichBodyHtml 은 img 를 본문과 갤러리로 분리한다`() {
        val (html, images) = splitRichBodyHtml(
            """<p>소개</p><p><img src="https://a.com/1.jpg" alt="" /></p>""",
        )
        assertEquals("""<p>소개</p>""", html)
        assertEquals(listOf("https://a.com/1.jpg"), images)
    }

    @Test
    fun `cleanEmptyRichParagraphs 는 빈 p 를 제거한다`() {
        assertEquals(
            """<p>본문</p>""",
            cleanEmptyRichParagraphs("""<p>본문</p><p></p><p>&nbsp;</p>"""),
        )
    }

    @Test
    fun `splitRichBodyHtml 은 script·이벤트핸들러·javascript 링크를 제거한다`() {
        val (html, _) = splitRichBodyHtml(
            """<p>안녕<script>alert(1)</script></p><p onclick="x()">클릭</p><a href="javascript:alert(1)">링크</a>""",
        )
        assert("script" !in html.lowercase()) { "script 태그가 남음: $html" }
        assert("onclick" !in html.lowercase()) { "onclick 핸들러가 남음: $html" }
        assert("javascript:" !in html.lowercase()) { "javascript: href 가 남음: $html" }
    }

    @Test
    fun `splitRichBodyHtml 은 http 외부 이미지를 추적 픽셀 방어로 드롭한다`() {
        val (_, images) = splitRichBodyHtml(
            """<p><img src="http://tracker.example/pixel.gif"></p><p><img src="https://a.com/ok.jpg"></p>""",
        )
        assertEquals(listOf("https://a.com/ok.jpg"), images)
    }

    @Test
    fun `isAllowedImageUrl 은 https 와 로컬 http 만 허용한다`() {
        assert(isAllowedImageUrl("https://cdn.example/x.jpg"))
        assert(isAllowedImageUrl("http://localhost:8080/uploads/x.jpg"))
        assert(isAllowedImageUrl("http://127.0.0.1:8080/uploads/x.jpg"))
        assert(isAllowedImageUrl("HTTPS://cdn.example/x.jpg")) // 대문자 스킴도 동일 판정
        assert(isAllowedImageUrl("http://LOCALHOST:8080/uploads/x.jpg")) // 대문자 호스트도 로컬 예외
        assert(!isAllowedImageUrl("http://tracker.example/pixel.gif"))
        assert(!isAllowedImageUrl("ftp://x/y.jpg"))
        assert(!isAllowedImageUrl("not a url"))
    }

    @Test
    fun `sanitizeRichBodyHtml 은 허용 서식 태그는 유지한다`() {
        val out = sanitizeRichBodyHtml("""<p><strong>굵게</strong> <em>기울임</em></p><ul><li>항목</li></ul>""")
        assertEquals("""<p><strong>굵게</strong> <em>기울임</em></p><ul><li>항목</li></ul>""", out)
    }
}
