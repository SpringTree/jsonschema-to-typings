import { expect, test } from "bun:test";
import { camelCase, upperFirst } from "../src/camel-case";

// The expected values are what lodash's camelCase produced, which this helper replaced.
// Keeping them identical keeps the generated interface and type names stable
//

test("successfully convert a snake case identifier", () => {
  expect(camelCase("organization_user_permission")).toBe("organizationUserPermission");
});

test("successfully convert an identifier when it contains numbers", () => {
  expect(camelCase("table2name")).toBe("table2Name");
  expect(camelCase("user_id_v2")).toBe("userIdV2");
  expect(camelCase("9lives")).toBe("9Lives");
});

test("successfully convert an identifier when it contains ordinals", () => {
  expect(camelCase("table_2nd")).toBe("table2nd");
  expect(camelCase("report_1ST_q")).toBe("report1stQ");
  expect(camelCase("the_4th_floor")).toBe("the4thFloor");
});

test("successfully convert an identifier when it contains upper case runs", () => {
  expect(camelCase("HTTPServer")).toBe("httpServer");
  expect(camelCase("USER_ID")).toBe("userId");
  expect(camelCase("userIDs")).toBe("userIDs");
  expect(camelCase("myAPIs_v2")).toBe("myApIsV2");
});

test("successfully convert an identifier when it is already camel or pascal case", () => {
  expect(camelCase("alreadyCamel")).toBe("alreadyCamel");
  expect(camelCase("PascalCase")).toBe("pascalCase");
});

test("successfully convert an identifier when it has extra separators", () => {
  expect(camelCase("__private")).toBe("private");
  expect(camelCase("snake__double")).toBe("snakeDouble");
  expect(camelCase("trailing_")).toBe("trailing");
  expect(camelCase("a-b c")).toBe("aBC");
});

test("successfully convert an identifier when it contains non ascii letters", () => {
  expect(camelCase("ÄÖ_name")).toBe("aoName");
  expect(camelCase("Crème_brûlée")).toBe("cremeBrulee");
  expect(camelCase("имя_таблицы")).toBe("имяТаблицы");
});

test("successfully convert schema ids and property names", () => {
  expect(camelCase("postal-address")).toBe("postalAddress");
  expect(camelCase("GetPotentialBundleProductsForOrderResponse")).toBe(
    "getPotentialBundleProductsForOrderResponse",
  );
  expect(camelCase("test sub-path all-types")).toBe("testSubPathAllTypes");
  expect(camelCase("https:  github.com Qwerios")).toBe("httpsGithubComQwerios");
  expect(camelCase("XMLHttpRequest")).toBe("xmlHttpRequest");
  expect(camelCase("v1.2.3")).toBe("v123");
});

test("successfully remove apostrophes", () => {
  expect(camelCase("don't")).toBe("dont");
  expect(camelCase("it’s")).toBe("its");
});

test("successfully replace letters without a diacritic mark like lodash's deburr", () => {
  expect(camelCase("straße")).toBe("strasse");
  expect(camelCase("Øre")).toBe("ore");
  expect(camelCase("Łódź")).toBe("lodz");
  expect(camelCase("œuvre")).toBe("oeuvre");
  expect(camelCase("Þór")).toBe("thor");
});

test("successfully treat Latin-1 symbols as separators", () => {
  expect(camelCase("½ price")).toBe("price");
  expect(camelCase("µValue")).toBe("value");
  expect(camelCase("a²b")).toBe("aB");
  expect(camelCase("x_ª_y")).toBe("xY");
});

test("successfully return an empty string when there are no words", () => {
  expect(camelCase("")).toBe("");
  expect(camelCase("___")).toBe("");
});

test("successfully upper case the first character", () => {
  expect(upperFirst("organizationUser")).toBe("OrganizationUser");
  expect(upperFirst("")).toBe("");
});

//
