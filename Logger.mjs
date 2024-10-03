import * as marked from "marked";
import * as dedent from "dedent";
import * as TerminalRenderer from "marked-terminal";

export class Logger {
  static init() {
    marked.setOptions({
      renderer: new TerminalRenderer.default(),
    });
  }
  static async mdLog(message, genImg, gutter) {
    // Replace line breaks with \n and remove top-level quotes
    // added by JSON.stringify so marked can interpret it as
    // markdown and can pretty print to console
    const unquotedMessage = JSON.stringify(message).replace(/"(.*)"/, "$1");

    // Add marked to parse Markdown
    const multiColorMessage = marked.marked(unquotedMessage);

    // Finally replace \n with real line-breaks
    const prettyPrintMessage = multiColorMessage.replace(/\\n/g, "\n");

    const dedentLines = dedent.default(prettyPrintMessage);

    if (gutter) {
      return console.log(`\n${dedentLines}\n`);
    }
    console.log(dedentLines);
  }
}
