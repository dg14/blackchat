import * as sharp from "sharp";
import terminalImage from "terminal-image";
import * as uuid from "uuid";
import downloadsFolder from "downloads-folder";
import * as fs from "fs";
import { dirname } from "path";

export const TYPE_NORMAL = 0;
export const TYPE_IMAGE = 1;
export const TYPE_CODE = 2;

export class BlackBox {
  static async chat(text, type, debug) {
    let agentMode = {};
    switch (type) {
      case TYPE_NORMAL:
        agentMode = {};
        break;
      case TYPE_IMAGE:
        agentMode = {
          mode: true,
          id: "ImageGenerationLV45LJp",
          name: "Image Generation",
        };
        break;
      case TYPE_CODE:
        agentMode = {
          mode: true,
          id: "gen_nest_jsonAoUqYHP",
          name: "gen_nest_json",
        };
        agentMode = {};
        break;
    }
    const body = {
      agentMode: agentMode,
      clickedAnswer2: false,
      clickedAnswer3: false,
      codeModelMode: true,
      githubToken: null,
      isChromeExt: false,
      maxTokens: 4096,
      playgroundTemperature: 0.5,
      playgroundTopP: 0.9,
      isMicMode: false,
      messages: [
        {
          content: text,
          role: "user",
          data: {},
        },
      ],
      previewToken: null,
      trendingAgentMode: {},
      visitFromDelta: false,
    };
    if (debug) {
      console.log("AGENTMODE", agentMode);
      console.log("QUERY[" + text + "]");
    }

    let resp = await fetch("https://www.blackbox.ai/api/chat", {
      body: JSON.stringify(body),
      method: "POST",
    });
    let respObj = await resp.text();

    return respObj.replace(/(\$\@\$.*?\$\@\$)/g, "");
  }
  static async genImage(markdownString) {
    const regex = /!\[.*?\]\((.*?)\)/;
    const match = markdownString.match(regex);
    if (match) {
      let url = match[1];
      //console.log("URL:" + url);
      let r = await fetch(url);
      let blob = await r.arrayBuffer();

      console.log("DOWNLOADED:" + blob.byteLength + " bytes, type:" + r.headers.get("content-type"));
      await BlackBox.showImage(blob);
    }
  }

  /**
   *
   * @param {Buffer} buffer
   */
  static async showImage(buffer) {
    try {
      // Leggi l'immagine
      const immagine = new sharp.default(buffer);
      let meta = await immagine.metadata();
      await immagine.toFile(downloadsFolder() + "/blackboxchat/" + uuid.v4() + "." + meta.format);
      // Ottieni le dimensioni dell'immagine
      //console.log(await immagine.metadata());
      const { width, height } = await immagine.metadata();
      // Ridimensiona l'immagine per adattarla alla console
      const larghezzaConsole = process.stdout.columns;
      const altezzaConsole = process.stdout.rows;
      console.log("Dimensioni console", larghezzaConsole, altezzaConsole);
      const fattoreRidimensionamento = Math.min(larghezzaConsole / width, altezzaConsole / height);
      const larghezzaRidimensionata = Math.floor(width * fattoreRidimensionamento);
      const altezzaRidimensionata = Math.floor(height * fattoreRidimensionamento);

      // Ridimensiona l'immagine
      const immagineRidimensionata = await immagine.resize(larghezzaRidimensionata, altezzaRidimensionata);
      let buf = await immagineRidimensionata.png().toBuffer();
      // Converte l'immagine in una stringa di testo
      const immagineTesto = await terminalImage.buffer(buf);

      // Stampa l'immagine nella console
      console.log(immagineTesto);
    } catch (errore) {
      console.log(errore);
      console.error(`Errore durante la visualizzazione dell'immagine: ${errore.message}`);
    }
  }

  static extractCodeBlocks(markdownString) {
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

  static extractFilesFromMarkdown(markdown, outDir) {
    try {
      let files = this.extractCodeBlocks(markdown);
      if (files) files = JSON.parse(files);
      let rootDir = outDir + "/tmp/";
      //console.log(files);
      for (let file of files) {
        console.log("WRITE " + file.name + " to " + rootDir + file.name);
        let base = dirname(rootDir + "/" + file.name);

        if (!fs.existsSync(base)) {
          console.log("CREATING DIR " + base);
          fs.mkdirSync(base, { recursive: true });
        }
        fs.writeFileSync(base + file.name, file.code);
      }
      console.log("WRITE SOURCE.md to " + rootDir + "SOURCE.md");
      fs.writeFileSync(rootDir + "SOURCE.md", markdown);
      return [];
    } catch (e) {
      console.log(e);
      return [];
    }
  }
}
