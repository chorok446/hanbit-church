// @vitest-environment node
import openapiTS, { astToString } from "openapi-typescript";
import { expect, it } from "vitest";

// js-yaml 보안 override 이후에도 CI의 OpenAPI YAML 해석·참조 해소·타입 생성 경로를 유지한다.
it("YAML OpenAPI의 스키마 참조를 TypeScript 타입으로 생성한다", async () => {
  const source = Buffer.from(`
openapi: 3.0.3
info:
  title: 보안 패치 호환성 fixture
  version: 1.0.0
paths:
  /posts/{id}:
    get:
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: string
      responses:
        '200':
          description: 게시글
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Post'
components:
  schemas:
    Post:
      type: object
      required: [id, title]
      properties:
        id:
          type: string
        title:
          type: string
`);
  const output = astToString(await openapiTS(source));
  expect(output).toContain('"/posts/{id}"');
  expect(output).toContain('components["schemas"]["Post"]');
  expect(output).toContain("id: string;");
  expect(output).toContain("title: string;");
});
