import assert from "node:assert/strict";
import { test } from "node:test";
import init, {
    formatLineRange,
    formatByteRange,
} from "../pkg/clang-format-node.js";

await init();

const part1 = `struct Foo { // 1
    int    x; // 2
    int    y; // 3
    int    z; // 4
}; // 5
`;

const part1_lines = part1.split("\n")

const part2 = `int main() {
               return 0;
}
`;

const content = part1 + '\n' + part2;

test("should format line range", () => {
    const actual = formatLineRange(content, [[1, 5]], "test.c");

    const slice1 = actual.split('\n').slice(0, part1_lines.length).join('\n');
    const slice2 = actual.split('\n').slice(part1_lines.length).join('\n');

    assert.notEqual(slice1, part1);
    assert.equal(slice2, part2);

});

test("should format byte range", () => {
    const encoder = new TextEncoder();
    const part1_bytes = encoder.encode(part1);
    const part2_bytes = encoder.encode(part2);
    const part1_byte_length = part1_bytes.byteLength;
    const part2_byte_length = part2_bytes.byteLength;

    const actual = formatByteRange(
        content,
        [[part1_byte_length, part2_byte_length]],
        "test.c",
    );

    const slice1 = actual.split('\n').slice(0, part1_lines.length).join('\n');
    const slice2 = actual.split('\n').slice(part1_lines.length).join('\n');

    assert.equal(slice1, part1);
    assert.notEqual(slice2, part2);
});
