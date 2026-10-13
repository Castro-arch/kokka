import { describe, expect, it } from "vitest";
import { fieldErrors, formValues } from "./form";

describe("formValues", () => {
  it("reads the named text fields, defaulting to empty", () => {
    const form = new FormData();
    form.set("name", "Festa");
    form.set("extra", "ignored");
    expect(formValues(form, ["name", "subtitle"])).toEqual({ name: "Festa", subtitle: "" });
  });
});

describe("fieldErrors", () => {
  it("keeps the first message per field and files pathless issues under form", () => {
    expect(
      fieldErrors({
        issues: [
          { path: ["name"], message: "first" },
          { path: ["name"], message: "second" },
          { path: [], message: "general" },
        ],
      }),
    ).toEqual({ name: "first", form: "general" });
  });
});
