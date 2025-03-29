#   Guide to Vibe Coding V1.0
**Author:** [SeanLon @ https://seanlon.site](https://seanlon.site)  
**Date:** March 29, 2025  
**Deployment:** `gh-pages`

---

# A. GETTING STARTED
To begin vibe coding, you need to prepare these 3 main ingredients.

### 1. Deep Thinking AI Tools  
AI tools with deep thinking capabilities. You may use any of the following:  
- **Deepseek**  
- **Qwq**  
- **Qwen**  
- **Kimi AI**  
- **Gemini**  
- **Copilot**  
- **Grok**  
- **Claude**  

### 2. AI Code Editor with Agentic AI Capabilities
Choose one of the following:  
- **Windsurf**  
- **CursorAI**  
- **Rool**  
- **Cline**   

### 3. Scaffolding Structure in Your Project
You must prepare:
- **Concept Idea**  
- **Memory Bank**  
- **Design Specifications and Constraints**   

It's important to invest time in the foundational setup to create a high-quality, fully functional, and visually appealing game. While effort is still required, this approach will accelerate development and help bridge technical knowledge gaps (such as coding in specific areas). 

# B. LET'S BEGIN
### 1. First, Create This Folder Structure with Empty Files
.cursor/rules
Memory Bank/
├── Game Design/
│   ├── game-design-document.md
│   ├── game-idea-document.md
├── Tech Stack/
│   ├── tech-stack.md
├── Implementation Plan/
│   ├── implementation-plan.md
├── Progress/
│   ├── progress.md
├── Architecture/
│   ├── architecture.md

### 2. Cursor Rules
- Review best practices at `https://github.com/PatrickJS/awesome-cursorrules`
- Access rules in Cursor: Press Cmd + Shift + P, type "rules", and hit Enter
- Configure the LLM to behave like an expert and write clean, maintainable, performant code. This is essential for creating an optimized game with clean code.

### 3. Game Design
- Document your game idea and use any deep thinking AI tool to create a simple **Game Design Document** in Markdown format (`.md`)  
- Review and refine the document to align with your vision. A basic document is fine—the goal is to provide AI context about the game's structure and intent  

### 4. Tech Stack and `.cursor/rules`
- Use `deep thinking AI tools` to recommend the best tech stack for your game (e.g., ThreeJS and WebSocket for a multiplayer 3D game)  
- Challenge it to propose the *simplest yet most robust stack possible*  

### 5. Implementation Plan
Ask `deep thinking AI tools` to review:  
- The Game Design Document  
- The tech stack recommendations
- The Cursor rules  

Then create a detailed **Implementation Plan** in Markdown (`.md`) with step-by-step instructions for your AI developers:  
- Make steps small and specific  
- Include tests for each step to validate implementation  
- Use clear, concrete instructions without code  
- Focus on the *base game* rather than the full feature set  

### 6. Architecture
Ask deep thinking AI tools to recommend:  
- The best technical architecture
- Well-reasoned tradeoff decisions

This file will later help Cursor validate that its code fulfills the architectural goals. You can validate and adjust if anything doesn't make sense.

---

# C. LET'S START CODING
Now the fun begins!

### 1. Requirements Clarification
- Select **Claude Sonnet 3.7 Thinking** in Cursor 
- Prompt: "Study all documents in `/memory-bank`. Is `implementation-plan.md` clear? Ask me questions to ensure 100% clarity."
- If changes are needed, have Cursor update `implementation-plan.md` accordingly 

### 2. Implementation 
- Select **Claude Sonnet 3.7 Thinking** in Cursor  
- Prompt: "Study all documents in `/memory-bank` thoroughly and proceed with Step 1 of the implementation plan. Go step by step. Do not proceed to the next step until I validate the tests. Once approved, document your work in `progress.md` for future maintenance, and add architectural insights to `architecture.md` explaining each file's purpose."

### 3. Save Your Code
- Save your code regularly
- Start a new chat after each milestone (`Cmd + N`, `Cmd + I`) to prevent context confusion  
- Prompt: "Review all files in the memory-bank, read progress.md to understand prior work, and proceed with Step 2. Wait for test validation before starting Step 3."
- Repeat until completing the entire `implementation-plan.md`  

---

## 4. Refining Details
Congratulations on building the base game! Now you can refine it with specific customizations (e.g., adjusting colors, sizes, or shapes).
- Create a new `feature-implementation.md` file with concise steps and tests  
- Implement and test incrementally  

---

## Troubleshooting
If a prompt fails or breaks the game:  
- Click "restore" in Cursor and refine your prompt until it works  

For errors:  
- **JavaScript Issues:** Open the console (`F12`), copy the error, and paste it into Cursor—or provide screenshots for visual glitches  
- **Quick Solution:** Install [BrowserTools](https://browsertools.agentdesk.ai/installation) to automate error capturing  

If stuck:  
- Revert to your last Git commit (`git reset`) and try new prompts  
- If still stuck:  
- Use [RepoPrompt](https://repoprompt.com/) and consult **Grok 3 Thinking** for assistance  

---

## Additional Tips
- **Minor Changes:** Use Claude Sonnet 3.5  
- **Content Writing:** Use GPT-4.5  
- **Better Results:** Include in prompts: "Take your time to get this right—I'm not in a hurry. What matters is precise execution of my requests. Ask for clarification if needed."

---

## Credits
https://github.com/EnzeD/vibe-coding

---