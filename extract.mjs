import * as fs from "fs";

import * as marked from "marked";

let buf = fs.readFileSync(process.argv[2]);

function extractCodeBlocks(markdownString) {
  const codeBlocks = [];
  const markdownLines = markdownString.split("\n");

  let inCodeBlock = false;
  let codeBlock = "";

  markdownLines.forEach((line) => {
    if (line.trim().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      if (!inCodeBlock) {
        codeBlocks.push(codeBlock.trim());
        codeBlock = "";
      }
    } else if (inCodeBlock) {
      codeBlock += line + "\n";
    }
  });

  return codeBlocks;
}

//console.log(buf.toString());
let buf1 = JSON.parse(extractCodeBlocks(buf.toString())[0]);
console.log(buf1);
