import { describe, expect, it } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import { parseFdpError } from "./errors";

function axiosError(status: number, data: unknown): AxiosError {
  const err = new AxiosError("Request failed");
  err.response = {
    status,
    statusText: "",
    headers: {},
    config: { headers: new AxiosHeaders() } as never,
    data,
  } as never;
  return err;
}

describe("parseFdpError", () => {
  it("maps a known FDP code to friendly copy", () => {
    const result = parseFdpError(
      axiosError(403, {
        code: "fdp.access.denied",
        message: "Caller has no read scope",
      }),
    );
    expect(result.code).toBe("fdp.access.denied");
    // HTTP status takes precedence over code-based title classification,
    // because status is a stronger signal than code-string parsing.
    expect(result.title).toBe("You don't have access to this");
    expect(result.message).toContain("don't have access");
    expect(result.status).toBe(403);
    expect(result.fromServer).toBe(true);
  });

  it("falls back to http.STATUS code when no envelope is present", () => {
    const result = parseFdpError(axiosError(404, null));
    expect(result.code).toBe("http.404");
    expect(result.title).toBe("We couldn't find that");
    expect(result.status).toBe(404);
    expect(result.fromServer).toBe(false);
  });

  it("returns the network-error shape when the request never reached a server", () => {
    const err = new AxiosError("Network Error");
    const result = parseFdpError(err);
    expect(result.code).toBe("client.network");
    expect(result.status).toBeNull();
  });

  it("extracts violations from the envelope", () => {
    const result = parseFdpError(
      axiosError(422, {
        code: "fdp.validation.failed",
        message: "2 violations",
        violations: [
          { path: "/dct:title", message: "missing required property" },
          { message: "unknown property /dcat:foo" },
          { path: "/dct:identifier" }, // no message — should be dropped
        ],
      }),
    );
    expect(result.violations).toHaveLength(2);
    expect(result.violations.at(0)?.path).toBe("/dct:title");
    expect(result.violations.at(1)?.path).toBeUndefined();
  });

  it("preserves docs_url from the envelope", () => {
    const result = parseFdpError(
      axiosError(400, {
        code: "fdp.sparql.parse",
        message: "Unexpected token at 12:4",
        docs_url: "https://specs.fairdatapoint.org/sparql#errors",
      }),
    );
    expect(result.docsUrl).toBe("https://specs.fairdatapoint.org/sparql#errors");
  });

  it("handles a bare Error with message", () => {
    const result = parseFdpError(new TypeError("nope"));
    expect(result.code).toBe("client.exception");
    expect(result.message).toBe("nope");
    expect(result.fromServer).toBe(false);
  });

  it("handles an unknown shape gracefully", () => {
    const result = parseFdpError("oops");
    expect(result.code).toBe("client.unknown");
    expect(result.message).toBe("oops");
  });

  it("falls back to server message when the code is unknown", () => {
    const result = parseFdpError(
      axiosError(418, {
        code: "fdp.teapot.short",
        message: "I'm a little teapot",
      }),
    );
    expect(result.code).toBe("fdp.teapot.short");
    expect(result.message).toBe("I'm a little teapot");
  });
});
