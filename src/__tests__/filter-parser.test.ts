/**
 * Unit tests for the filter parser.
 */
import { describe, it, expect } from "vitest";
import {
    parseFilterLine,
    parseFilterList,
    networkRuleToDNR,
    NetworkRule,
} from "../background/filter-parser";

describe("parseFilterLine", () => {
    it("should return null for empty lines", () => {
        expect(parseFilterLine("")).toBeNull();
        expect(parseFilterLine("   ")).toBeNull();
    });

    it("should return null for comments", () => {
        expect(parseFilterLine("! This is a comment")).toBeNull();
        expect(parseFilterLine("! Title: My Filter List")).toBeNull();
    });

    it("should return null for metadata lines", () => {
        expect(parseFilterLine("[Adblock Plus 2.0]")).toBeNull();
    });

    it("should parse basic network block rule", () => {
        const rule = parseFilterLine("||doubleclick.net^");
        expect(rule).toEqual({
            type: "network",
            isException: false,
            pattern: "||doubleclick.net^",
            domains: undefined,
            thirdParty: undefined,
            resourceTypes: undefined,
        });
    });

    it("should parse network exception rule", () => {
        const rule = parseFilterLine("@@||example.com^");
        expect(rule).toEqual({
            type: "network",
            isException: true,
            pattern: "||example.com^",
            domains: undefined,
            thirdParty: undefined,
            resourceTypes: undefined,
        });
    });

    it("should parse network rule with third-party option", () => {
        const rule = parseFilterLine("||ads.example.com^$third-party");
        expect(rule).not.toBeNull();
        expect(rule!.type).toBe("network");
        const nr = rule as NetworkRule;
        expect(nr.thirdParty).toBe(true);
        expect(nr.pattern).toBe("||ads.example.com^");
    });

    it("should parse network rule with resource type options", () => {
        const rule = parseFilterLine("||tracker.com^$script,image");
        expect(rule).not.toBeNull();
        const nr = rule as NetworkRule;
        expect(nr.resourceTypes).toEqual(["script", "image"]);
    });

    it("should parse network rule with domain option", () => {
        const rule = parseFilterLine("||ads.com^$domain=onlinekhabar.com|setopati.com");
        expect(rule).not.toBeNull();
        const nr = rule as NetworkRule;
        expect(nr.domains).toEqual(["onlinekhabar.com", "setopati.com"]);
    });

    it("should parse cosmetic rule", () => {
        const rule = parseFilterLine("onlinekhabar.com##.adsbygoogle");
        expect(rule).toEqual({
            type: "cosmetic",
            domains: ["onlinekhabar.com"],
            selector: ".adsbygoogle",
            isException: false,
        });
    });

    it("should parse global cosmetic rule (no domain)", () => {
        const rule = parseFilterLine("##.ad-banner");
        expect(rule).toEqual({
            type: "cosmetic",
            domains: [],
            selector: ".ad-banner",
            isException: false,
        });
    });

    it("should parse cosmetic exception rule", () => {
        const rule = parseFilterLine("example.com#@#.good-ad");
        expect(rule).toEqual({
            type: "cosmetic",
            domains: ["example.com"],
            selector: ".good-ad",
            isException: true,
        });
    });

    it("should parse multi-domain cosmetic rule", () => {
        const rule = parseFilterLine("site1.com,site2.com##.ad-wrapper");
        expect(rule).not.toBeNull();
        expect(rule!.type).toBe("cosmetic");
        if (rule!.type === "cosmetic") {
            expect(rule.domains).toEqual(["site1.com", "site2.com"]);
            expect(rule.selector).toBe(".ad-wrapper");
        }
    });
});

describe("parseFilterList", () => {
    it("should parse a multi-line filter list", () => {
        const content = `! Title: Test List
! Last modified: 2026-01-01

||doubleclick.net^
||googleadservices.com^
@@||allowed.com^
onlinekhabar.com##.ad-banner
##.adsbygoogle
`;

        const rules = parseFilterList(content);
        expect(rules).toHaveLength(5);
        expect(rules[0].type).toBe("network");
        expect(rules[1].type).toBe("network");
        expect(rules[2].type).toBe("network");
        expect((rules[2] as NetworkRule).isException).toBe(true);
        expect(rules[3].type).toBe("cosmetic");
        expect(rules[4].type).toBe("cosmetic");
    });

    it("should handle empty content", () => {
        expect(parseFilterList("")).toHaveLength(0);
    });

    it("should skip all comment lines", () => {
        const content = `! Comment 1
! Comment 2
! Comment 3`;
        expect(parseFilterList(content)).toHaveLength(0);
    });
});

describe("networkRuleToDNR", () => {
    it("should convert a basic block rule to DNR", () => {
        const rule: NetworkRule = {
            type: "network",
            isException: false,
            pattern: "||doubleclick.net^",
        };

        const dnr = networkRuleToDNR(rule, 1);
        expect(dnr.id).toBe(1);
        expect(dnr.action.type).toBe("block");
        expect(dnr.priority).toBe(1);
        expect(dnr.condition.requestDomains).toEqual(["doubleclick.net"]);
    });

    it("should convert an exception rule to DNR allow", () => {
        const rule: NetworkRule = {
            type: "network",
            isException: true,
            pattern: "||allowed.com^",
        };

        const dnr = networkRuleToDNR(rule, 2);
        expect(dnr.action.type).toBe("allow");
        expect(dnr.priority).toBe(2);
    });

    it("should handle third-party option", () => {
        const rule: NetworkRule = {
            type: "network",
            isException: false,
            pattern: "||ads.com^",
            thirdParty: true,
        };

        const dnr = networkRuleToDNR(rule, 3);
        expect(dnr.condition.domainType).toBe("thirdParty");
    });

    it("should handle domain restrictions with include/exclude", () => {
        const rule: NetworkRule = {
            type: "network",
            isException: false,
            pattern: "||ads.com^",
            domains: ["onlinekhabar.com", "~setopati.com"],
        };

        const dnr = networkRuleToDNR(rule, 4);
        expect(dnr.condition.initiatorDomains).toEqual(["onlinekhabar.com"]);
        expect(dnr.condition.excludedInitiatorDomains).toEqual(["setopati.com"]);
    });

    it("should handle URL patterns with paths", () => {
        const rule: NetworkRule = {
            type: "network",
            isException: false,
            pattern: "||example.com/ads/*",
        };

        const dnr = networkRuleToDNR(rule, 5);
        // Should use urlFilter instead of requestDomains since it has a path
        expect(dnr.condition.urlFilter).toBe("example.com/ads/*");
    });
});
