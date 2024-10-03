import untildify from "untildify";
import * as fs from "fs";

export class DocChat {
  static async isSupported(file) {
    return await DocChat.toText(file, true);
  }

  static isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch (err) {
      return false;
    }
  };

  static async toText(file, checkOnly = false) {
    if (DocChat.isValidUrl(file)) return checkOnly ? true : new PlaywrightWebBaseLoader(file).load();
    file = untildify(file);
    if (!fs.existsSync(file)) {
      if (checkOnly) return false;
      throw Error(`Missing file: ${file}`);
    }
    if (file.endsWith(".html")) return checkOnly ? true : new PlaywrightWebBaseLoader(file).load();
    if (file.endsWith(".pdf")) return checkOnly ? true : new PDFLoader(file).load();
    if (file.endsWith(".docx")) return checkOnly ? true : new DocxLoader(file).load();
    if (file.endsWith(".text") || file.endsWith(".md")) return checkOnly ? true : new TextLoader(file).load();
    if (checkOnly) {
      return false;
    }
    throw Error("Unsupported file type");
  }

  constructor() {
    this.clear();
  }

  async add(file) {
    let docs = await DocChat.toText(file);
    docs = await DocChat.textSplitter.splitDocuments(docs);

    this.vectorStore.addDocuments(docs);
    this.hasDocs = true;
    const text = docs
      .slice(0, config.summaryPages)
      .map((doc) => doc.pageContent)
      .join("");

    let res = await DocChat.summarizer.call({ input_document: text });
    return res.text.trim();
  }

  clear = () => {
    //this.vectorStore = new MemoryVectorStore(DocChat.embeddings)
    this.hasDocs = false;
  };

  query = (query) => this.vectorStore.similaritySearch(query, Math.floor(config.chatApiParams.max_tokens / config.textSplitter.chunkSize));
}
