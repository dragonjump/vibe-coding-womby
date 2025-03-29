# Vibe Coding Framework v1.0
**Author:** [SeanLon](https://seanlon.site)  
**Last Updated:** March 29, 2025 
**Game code:**  `gh-pages`

## Overview
Vibe Coding is a systematic approach to AI-assisted game development that combines modern AI tools with structured development practices. This framework enables developers to create high-quality, performant games while leveraging AI capabilities effectively.

## A. Prerequisites

### 1. Large Language Model (LLM) Tools
Select one or more of these AI tools with advanced reasoning capabilities:
- **Claude** (Recommended for complex reasoning)
- **GPT-4** (Strong general-purpose capabilities)
- **Gemini** (Excellent for technical tasks)
- **Copilot** (Great for code completion)
- **Deepseek** (Specialized for development)
- **Qwen** (Strong multilingual support)
- **Grok** (Advanced problem-solving)

### 2. AI-Enhanced Development Environment
Choose an IDE with integrated AI capabilities:
- **Cursor** (Recommended - robust AI integration)
- **GitHub Copilot** (Strong code completion)
- **Windsurf** (Real-time AI assistance)
- **Cline** (Specialized for game development)

### 3. Project Foundation
Essential components for project initialization:
- **Concept Documentation**
- **Knowledge Base**
- **Technical Specifications**
- **Architecture Constraints**

## B. Project Setup

### 1. Directory Structure
Create the following project structure:
```
.cursor/
└── rules/
Memory-Bank/
├── Game-Design/
│   ├── game-design-document.md
│   ├── game-concept.md
├── Technical/
│   ├── tech-stack.md
│   ├── architecture.md
├── Planning/
│   ├── implementation-plan.md
│   ├── milestones.md
├── Progress/
│   ├── development-log.md
│   ├── decisions-log.md
```

### 2. Development Guidelines
- Configure `.cursor/rules` following best practices from [Awesome Cursor Rules](https://github.com/PatrickJS/awesome-cursorrules)
- Access rules editor: `Cmd/Ctrl + Shift + P` → "rules"
- Implement strict typing and performance optimization rules
- Set up linting and formatting guidelines

### 3. Game Design Documentation
1. Use AI tools to develop:
   - Core gameplay mechanics
   - Player experience goals
   - Technical constraints
   - Art direction
2. Create comprehensive GDD in `game-design-document.md`
3. Document core concepts in `game-concept.md`

### 4. Technical Foundation
Develop `tech-stack.md`:
- Framework selection criteria
- Performance requirements
- Scalability considerations
- Development tools
- Build system
- Testing framework

### 5. Implementation Strategy
Create detailed `implementation-plan.md`:
- Modular development steps
- Testing criteria for each module
- Integration checkpoints
- Performance benchmarks
- Quality assurance guidelines

### 6. Architecture Design
Document in `architecture.md`:
- System architecture
- Component relationships
- Data flow patterns
- Performance optimization strategies
- Scalability considerations

## C. Development Workflow

### 1. Project Initialization
1. Configure Cursor with Claude 3.5 Sonnet
2. Review `/Memory-Bank` documentation
3. Validate implementation plan
4. Update documentation based on feedback

### 2. Iterative Development
1. Follow implementation plan steps
2. Document progress in `development-log.md`
3. Update architecture insights
4. Maintain test coverage
5. Regular performance profiling

### 3. Version Control
- Commit after each milestone
- Start fresh chat sessions (`Cmd/Ctrl + N`)
- Review previous progress
- Validate before proceeding

### 4. Feature Implementation
For new features:
1. Create feature specification
2. Define acceptance criteria
3. Implement incrementally
4. Document in `decisions-log.md`

## Troubleshooting Guide

### Error Resolution
1. Console errors:
   - Access browser console (`F12`)
   - Copy error messages
   - Provide to AI assistant

2. Visual issues:
   - Use screenshots
   - Describe expected behavior
   - Document reproduction steps

### Development Blockers
1. Code issues:
   - Revert to last stable commit
   - Review error patterns
   - Consult AI for solutions

2. Architecture concerns:
   - Review `architecture.md`
   - Consult AI for alternatives
   - Document decisions

## Best Practices

### AI Interaction
- Use Claude 3.5 Sonnet for code changes
- Employ GPT-4 for documentation
- Provide clear, specific prompts
- Request thorough analysis

### Quality Assurance
- Regular performance testing
- Comprehensive unit tests
- Integration testing
- User experience validation

### Documentation
- Keep documentation updated
- Document architectural decisions
- Track progress consistently
- Maintain change logs

## Credits
Based on the original work at [EnzeD/vibe-coding](https://github.com/EnzeD/vibe-coding)

---