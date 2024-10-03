#!/usr/bin/env node

// Config stuff
import dotenv from "dotenv";
dotenv.config();

// file system stuff
import * as fs from "fs";
import untildify from "untildify";
import downloadsFolder from "downloads-folder";

import { DocChat } from "./DocChat.mjs";
import { History } from "./History.mjs";

// I/O stuff
import readline from "readline";

// Terminal UX stuff e.g. markdown, images, speech, clipboard etc
import ora from "ora"; // Show spinners in terminal
import chalk from "chalk"; // Terminal font colors
import clipboard from "clipboardy"; // Terminal clipboard support
import say from "say"; // Text to speech for terminals

import { Logger } from "./Logger.mjs";
// Web
import { Chat } from "./Chat.mjs";
import { TYPE_CODE, TYPE_IMAGE, TYPE_NORMAL } from "./blackbox.mjs";

// Document loaders

const config = {
  summaryPages: 10,
  downloadsFolder: downloadsFolder(),
  imageApiParams: {},
  terminalImageParams: { width: "50%", height: "50%" },
  textSplitter: { chunkSize: 200, chunkOverlap: 20 },
  googleSearchAuth: {
    auth: process.env.GOOGLE_CUSTOM_SEARCH_API_KEY,
    cx: process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID,
  },
  openAiApiKey: process.env.OPENAI_API_KEY,
};

const prompts = {
  next: () => {
    rl.resume();
    console.log("───────────────────────────────");
    rl.prompt();
  },
  system: ["Always use code blocks with the appropriate language tags", 'If the answer may have changed since your cut-off date, simply reply with "I do not have real-time information" and nothing else'],
  imagePhrase: "[img]",
  webBrowsing: {
    needed: ["not have access to real-time", "don't have access to real-time", "don't have real-time", "not able to provide real-time", "not have real-time", "as of my training data", "as of september 2021", "as of my programmed cut-off date"],
    forcePhrase: "[web]",
    /***********************************************************************************************************************/
    preFacto: (query, result) =>
      `Can you answer "${query}"?
I also found the following web search results for the same query:

  ${result}

If needed, feel free to augment your response with anything helpful from the above search results too.
`,
    /***********************************************************************************************************************/
    postFacto: (query, result) =>
      `I found the following up-to-date web search results for "${query}":

  ${result}

Using the above search results, can you now take a best guess at answering ${query}. 
Exclude the disclaimer note about this information might be inaccurate or subject to change.
Be short and don't say "based on the search results". 
Btw, the date and time right now is ${new Date().toLocaleString()}. Feel free to mention that in your response if needed.`,
  },
  /***********************************************************************************************************************/
  chatWithDoc: (query, docs) =>
    `I was asked the following query: ${query}
  
Some relevant snippets from documents that I have that you may find useful in the context of my query:  
  
  ${docs.map((doc) => doc.pageContent).join("\n")}

Answer to best of your abilities the original query`,
  /***********************************************************************************************************************/
  errors: {
    missingOpenAiApiKey: chalk.redBright("OPENAI_API_KEY must be set (see https://platform.openai.com/account/api-keys)."),
    missingGoogleKey: "Cannot search the web since GOOGLE_CUSTOM_SEARCH_CONFIGs are not set",
    noResults: "No search result found",
    nothingToCopy: "History is empty; nothing to copy",
    nothingToSay: "No messages yet; nothing to say",
  },
  info: {
    help: fs.readFileSync("README.md", "utf-8").split("```text")[1].split("```")[0].trim(),
    exported: (file) => chalk.italic(`Saved chat history to ${file}`),
    onExit: chalk.italic("Bye!"),
    onClear: chalk.italic("Chat history cleared!"),
    onSearch: chalk.italic(`Searching the web`),
    searchInfo: chalk.italic("(inferred from Google search)"),
    onQuery: chalk.italic(`Asking wuppa`),
    onImage: chalk.italic(`Generating image`),
    imageSaved: (file) => chalk.italic(`Image saved to ${file}`),
    onDoc: (file, finish) => chalk.italic(finish ? `Ingested ${file}. Here's a summary of first ${config.summaryPages} pages:` : `Ingesting ${file}`),
    onCopy: (text) => chalk.italic(`Copied last message to clipboard (${text.length} characters)`),
  },
};

const systemCommands = prompts.info.help
  .split(/\r?\n/)
  .filter((s) => s.trim().startsWith("*"))
  .flatMap((s) => s.split(":")[0].split(" "))
  .map((s) => s.trim())
  .filter((s) => s.length > 3);

const history = new History(prompts);
const docChat = new DocChat();
//const chat = new Chat(params);
Logger.init();

const rl = readline
  .createInterface({
    input: process.stdin,
    output: process.stdout,
    completer: (line) => {
      // See: https://stackoverflow.com/questions/42197385/
      if (line.includes("/")) {
        const dir = line.substring(0, line.lastIndexOf("/") + 1);
        if (fs.existsSync(untildify(dir))) {
          const suffix = line.substring(line.lastIndexOf("/") + 1);
          const hits = fs
            .readdirSync(untildify(dir))
            .filter((file) => file.startsWith(suffix))
            .map((file) => dir + file);
          if (hits.length) return [hits, line];
        }
      }
      const hits = systemCommands.filter((c) => c.startsWith(line.toLowerCase().trim()));
      return [hits.length ? hits : systemCommands, line];
    },
  })
  .on("close", () => console.log(prompts.info.onExit));

// TODO: True multiline support e.g. pasting (Blocked by https://stackoverflow.com/questions/66604677/)
process.stdin.on("keypress", (letter, key) => {
  if (key?.name === "pagedown") {
    rl.write(" ");
    process.stdout.write("\n");
  }
});
if (!fs.existsSync(downloadsFolder() + "/blackboxchat")) {
  fs.mkdirSync(downloadsFolder() + "/blackboxchat");
}
console.log(prompts.info.help);
prompts.next();
let genType = TYPE_NORMAL;
let langModel = "nestjs";
let debug = false;
rl.on("line", async (line) => {
  say.stop();
  switch (line.toLowerCase().trim()) {
    case "":
      return prompts.next();
    case "q":
    case "quit":
    case "exit":
      return rl.close();
    case "?":
    case "help": {
      console.log(prompts.info.help);
      return prompts.next();
    }
    case "getlang": {
      console.log("Lang model " + langModel);
      return prompts.next();
    }
    case "lang svelte":
    case "lang nestjs":
    case "lang cobol": {
      langModel = line.toLowerCase().trim().split(" ")[1];
      console.log("Lang model " + langModel);
      genType = TYPE_CODE;
      console.log("Code generation enabled");
      return prompts.next();
    }
    case "img": {
      genType = genType == TYPE_IMAGE ? TYPE_NORMAL : TYPE_IMAGE;
      console.log(genType == TYPE_IMAGE ? "Image generation enabled" : "Image generation disabled");
      return prompts.next();
    }
    case "code": {
      genType = genType == TYPE_CODE ? TYPE_NORMAL : TYPE_CODE;
      console.log(genType == TYPE_CODE ? "Code generation enabled" : "Code generation disabled");
      return prompts.next();
    }
    case "debug": {
      debug = !debug;
      console.log(debug ? "Debug enabled" : "Debug disabled");
      return prompts.next();
    }
    case "clr":
    case "clear": {
      history.clear();
      docChat.clear();
      console.log(prompts.info.onClear);
      return prompts.next();
    }
    case "h":
    case "history": {
      history.show();
      return prompts.next();
    }
    case "export": {
      const file = `${config.downloadsFolder}/${Date.now()}.chatml.json`;
      fs.writeFileSync(file, JSON.stringify(history.get()));
      console.log(prompts.info.exported(file));
      return prompts.next();
    }
    // TODO case 'import': import saved history
    case "say":
    case "speak": {
      const content = history.lastMessage()?.content;
      if (content) say.speak(content);
      else console.warn(prompts.errors.nothingToSay);
      return prompts.next();
    }
    case "cp":
    case "copy": {
      const content = history.lastMessage()?.content;
      if (content) {
        clipboard.writeSync(content);
        console.log(prompts.info.onCopy(content));
      } else console.warn(prompts.errors.nothingToCopy);
      return prompts.next();
    }
    default: {
      rl.pause();
      let spinner = ora().start();
      try {
        const consumeDoc = async (file) => {
          spinner.text = prompts.info.onDoc(file, false);
          let summary = await docChat.add(file);

          spinner.succeed(prompts.info.onDoc(file, true));
          console.log(summary);
        };

        let chat = new Chat({ message: line, genType: genType, debug: debug, langModel: langModel }, spinner, history, docChat, prompts, process.cwd());
        if (line.includes(prompts.imagePhrase)) {
          //await genImage(line.replace(prompts.imagePhrase, "").trim());
        } else if (await DocChat.isSupported(line)) {
          await consumeDoc(line);
        }
        await chat.doChat();
        return prompts.next();
      } catch (err) {
        spinner.fail(err.stack ?? err.message ?? err);
      }
    }
  }
});
