/**
 * @fileoverview Enforces empty lines around comments.
 * @author Jamund Ferguson
 * @copyright 2015 Mathieu M-Gosselin. All rights reserved.
 * @copyright 2015 Jamund Ferguson. All rights reserved.
 * @copyright 2015 Gyandeep Singh. All rights reserved.
 */
"use strict";

const util = require("util");

const yaml = require("yaml").default;

// The LINEBREAK_MATCHER constant is copied from v5.1.0 of the ast-utils library.
const LINEBREAK_MATCHER = /\r\n|[\r\n\u2028\u2029]/;
const JSTEST_TAG_PATTERN = /.*@tags\s*:\s*(\[[^\]]*\])/;

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

/**
 * Gets a list of comment lines in a group
 * @param {Token[]} commentGroup A group of comments, containing either multiple line comments or a
 *                               single block comment
 * @returns {string[]} A list of comment lines
 */
function getCommentLines(commentGroup) {
    if (commentGroup[0].type === "Line") {
        return commentGroup.map(comment => comment.value);
    }
    return commentGroup[0].value.split(LINEBREAK_MATCHER).map(line => line.replace(/^\s*\*?/, ""));
}

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {

    schema: [{
        "type": "object",
        "additionalProperties": false,
    }],

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    create(context) {
        function checkCommentGroup(commentGroup) {
            const commentLines = getCommentLines(commentGroup);
            console.log('commentLines', commentLines);

            const match = JSTEST_TAG_PATTERN.exec(commentLines.join("\n"));
            console.log('match', match);

            let tags;
            try {
                tags = yaml.parse(match[1]);
            } catch (e) {
                // TODO: We should probably re-throw this exception or report a failure using
                // 'context' still.
                console.error("Found invalid YAML when parsing @tags comment: " + e.message);
                throw e;
            }

            console.log('tags', tags);

            const cst = yaml.parseCST(match[1]);
            console.log('cst', util.inspect(cst, {showHidden: false, depth: null}));
        }

        const sourceCode = context.getSourceCode();
        const comments = sourceCode.getAllComments();

        return {

            Program() {
                // TODO: Check for /@tags\s*:/ in any of the lines to know if we should just skip
                // doing all of this work altogether.

                // The logic for grouping comments is copied from v5.1.0 of the
                // multiline-comment-style.js rule.
                comments
                    .reduce(
                        (commentGroups, comment, index, commentList) => {
                            const tokenBefore = sourceCode.getTokenOrCommentBefore(comment);

                            if (comment.type === "Line" && index > 0 &&
                                commentList[index - 1].type === "Line" && tokenBefore &&
                                tokenBefore.loc.end.line === comment.loc.start.line - 1 &&
                                tokenBefore === commentList[index - 1]) {
                                commentGroups[commentGroups.length - 1].push(comment);
                            } else {
                                commentGroups.push([comment]);
                            }

                            return commentGroups;
                        },
                        [])
                    .forEach(checkCommentGroup);
            }

        };
    }
};
