export class History {
  constructor(prompts) {
    this.prompts = prompts;
    this.clear();
  }

  add = (message) => {
    // OpenAI recommends replacing newlines with spaces for best results
    //if (message.role === Role.User) message.content = message.content.replace(/\s\s+/g, ' ').trim()
    //message.numTokens = encode(message.content).length
    this.history.push(message);
    /*
      while (true) {
        const idx = this.history.findIndex(msg => true)
        if (idx < 0) break
        this.history.splice(idx, 1)
      }*/
  };

  totalTokens = () => this.history.map((msg) => msg.numTokens).reduce((a, b) => a + b, 0);

  clear = () => {
    this.history = [];
    this.prompts.system.map((prompt) => this.add({ role: null, content: prompt }));
  };

  get = () => this.history.map((msg) => ({ role: msg.role, content: msg.content }));

  lastMessage = () => this.history.findLast((item) => item.role === Role.Assistant);

  show = () => console.log(this.history);
}
