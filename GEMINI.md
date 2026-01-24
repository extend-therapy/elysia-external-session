# Gemini Guidelines and Restrictions

## Project Overview and Restrictions

This project focuses on developing a new feature within the existing `src` directory. Gemini's work should be strictly confined to this area, and modifications to other directories are not permitted without explicit approval.

The structure of the program is a elysia plugin, encouraged to be used with bun. Only TypeScript is allowed.

**Forbidden Actions:**

- Modifying files outside of `src` without prior approval.
- Refactoring large sections of existing code unless explicitly instructed to do so.
- Removing any directories or recursive deletions of any kind without specific approval for that removal.

## Security Guidelines

- **Sensitive Data:** Gemini must not access or modify any files containing sensitive information (e.g., API keys, environment variables, credentials). This includes files like `.env`, `secrets.json`, or any files within a `config/credentials` directory.
- **System Commands:** Avoid using `eval`, unsanitized shell calls, or any form of command injection vectors. All system-level operations require careful consideration and should adhere to the principle of least privilege.
- **Logging:** All sensitive operations performed by Gemini should be logged for auditing purposes, excluding sensitive data values.

## Testing Guidelines

- For each directory in `src` that is not a test file, there should be a test file in the `tests` directory with the same name but with `.test.ts` appended to the end.
- To run ALL tests, use: `bun test`

## Code style

- Use ES modules (import/export) syntax, not CommonJS (require)
- Destructure imports when possible (eg. import { foo } from 'bar')

## Workflow

- Be sure to typecheck when you’re done making a series of code changes
- Prefer running single tests, and not the whole test suite, for performance
