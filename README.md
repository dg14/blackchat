# Blackchat

chat with blackbox services, generate images (console or download), generate
code (svelte and nestjs prompts), similar to chatgpt-cli

## Install

- `pnpm install`
- `node (or bun) main.mjs`

## Usage
```text
System commands:
  * clear / clr     : Clear chat history
  * copy / cp       : Copy last message to clipboard
  * history / h     : Show current history
  * export          : Save current chat history as ChatML doc
  * speak / say     : Speak out last response
  * help / ?        : Show this message
  * exit / quit / q : Exit the program

Usage Tips:
  - For multiline chats press PageDown
  - Use Up/Down array keys to scrub through previous messages  
  - Include [web] anywhere in your prompt to force web browsing
  - Include [img] anywhere in your prompt to generate an image
  - Enter a local path or url, to ingest text from it and add to context
  - Use TAB to do path completions when entering file (or folder path)
```

## References

- parts of code taken from https://github.com/pathikrit/chatgpt-cli

