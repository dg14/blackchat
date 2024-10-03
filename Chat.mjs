import { BlackBox, TYPE_CODE, TYPE_IMAGE, TYPE_NORMAL } from "./blackbox.mjs";
import { Logger } from "./Logger.mjs";
import {
  search,
  // import the result types you want
  OrganicResult,
  DictionaryResult,
  // helpful to import ResultTypes to filter results
  ResultTypes,
} from "google-sr";

const PROMPT_ADD_SOURCE_JSON = "format source code files as json array containing for every file generated, name and code without markdown";
const PROMPTS = {
  nestjs: "You are designing a RESTful API using NestJS that interacts with a PostgreSQL database, adhering to best practices for security, error handling, and performance optimization;",
  cobol: "You are designing a batch procedure written in cobol that interacts with a PostgreSQL database, adhering to best practices for security, error handling, and performance optimization;",
  svelte: "You are designing a frontend application written in svelte that interacts with api REST backend, adhering to best practices for security, error handling, and performance optimization;",
};
export class Chat {
  constructor(params, spinner, history, docChat, prompts, outDir) {
    this.params = params;
    this.prompts = prompts;
    this.spinner = spinner;
    this.history = history;
    this.docChat = docChat;
    this.outDir = outDir;
  }
  async promptEngineer() {
    try {
      if (this.params.message.includes(this.prompts.webBrowsing.forcePhrase)) {
        this.spinner.text = this.prompts.info.onSearch;
        this.params.message = this.params.message.replace(this.prompts.webBrowsing.forcePhrase, " ").trim();

        const queryResult = await search({
          query: this.params.message,
          // OrganicResult is the default, however it is recommended to ALWAYS specify the result type
          resultTypes: [OrganicResult, DictionaryResult],
          // to add additional configuration to the request, use the requestConfig option
          // which accepts a AxiosRequestConfig object
          // OPTIONAL
          requestConfig: {
            params: {
              // enable "safe mode"
              safe: "active",
            },
          },
        });
        let result = [];
        queryResult.forEach((item) => {
          result.push("- [ " + item.link + " ] " + item.title + ": " + item.description + "\n");
        });
        //console.log(queryResult);
        return this.prompts.webBrowsing.preFacto(this.params.message, result.join("\n"));
      } else if (this.docChat.hasDocs) {
        let docs = await this.docChat.query(params.message);
        return docs.length ? prompts.chatWithDoc(params.message, docs) : params.message;
      } else {
        return this.params.message;
      }
    } catch (e) {
      console.error(e);
    }
  }
  async makeRequest(prompt, pre) {
    try {
      this.spinner.text = this.prompts.info.onQuery;
      this.history.add({ role: null, content: prompt });
      switch (this.params.genType) {
        case TYPE_NORMAL: {
          let obj = await BlackBox.chat(this.params.message, this.params.genType, this.params.debug);
          await this.history.add(pre + "\n" + obj);
          this.spinner.stop();
          return Logger.mdLog(pre + "\n" + obj, false);
          //return obj;
        }
        case TYPE_CODE: {
          let prompt = PROMPTS[this.params.langModel] + " " + PROMPT_ADD_SOURCE_JSON;
          let message = prompt + ";" + this.params.message;
          let obj = await BlackBox.chat(message, this.params.genType, this.params.debug);
          await this.history.add(pre + "\n" + obj);
          this.spinner.stop();
          return obj;
        }
        case TYPE_IMAGE: {
          let obj = await BlackBox.chat(this.params.message, this.params.genType, this.params.debug);
          await this.history.add(pre + "\n" + obj);
          this.spinner.stop();
          console.log(obj);
          console.log(await BlackBox.genImage(obj));
          return Logger.mdLog(pre + "\n" + obj, false);
        }
      }
    } catch (e) {
      console.log(e);
      return Promise.resolve(console.log(message));
    }
  }
  async doChat(prompt) {
    try {
      let pre = await this.promptEngineer();
      let ret = await this.makeRequest(prompt, pre);
      if (this.params.genType == TYPE_CODE) {
        console.log("GENERATING");
        let code = BlackBox.extractFilesFromMarkdown(ret, this.outDir);
        console.log(code);
      }
      return ret;
    } catch (e) {
      return this.params.message;
    }
  }
}
