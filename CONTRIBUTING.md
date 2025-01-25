# Contributing to Varietyz Bot

Thank you for your interest in contributing to **Varietyz Bot**! Your contributions help make this project better for everyone. By participating, you agree to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Below are guidelines to help you get started.

---

## Table of Contents

1. [How to Contribute](#how-to-contribute)
    - [Reporting Bugs](#reporting-bugs)
    - [Suggesting Enhancements](#suggesting-enhancements)
    - [Your First Contribution](#your-first-contribution)
    - [Pull Requests](#pull-requests)
2. [Development Setup](#development-setup)
3. [Coding Guidelines](#coding-guidelines)
4. [Testing](#testing)
5. [Code Review Process](#code-review-process)
6. [Licensing and Intellectual Property](#licensing-and-intellectual-property)
7. [Additional Guidelines](#additional-guidelines)
8. [Contact](#contact)

---

## How to Contribute

### Reporting Bugs

If you find a bug in Varietyz Bot, please help us improve by reporting it. Here's how:

1. **Search Existing Issues:** Before creating a new issue, search the [existing issues](https://github.com/yourusername/varietyz-bot/issues) to see if it's already been reported.
2. **Open a New Issue:** If the bug hasn't been reported, open a new issue and provide the following information:
    - **Title:** A clear and descriptive title.
    - **Description:** A detailed description of the bug.
    - **Steps to Reproduce:** How to reproduce the bug.
    - **Expected Behavior:** What you expected to happen.
    - **Screenshots:** If applicable, add screenshots to help explain your problem.
    - **Environment:** Information about your environment (e.g., OS, Discord version).

### Suggesting Enhancements

We welcome feature requests! To suggest an enhancement:

1. **Search Existing Issues:** Check if the feature has already been suggested.
2. **Open a New Issue:** If not, open a new issue with a clear description of the feature.
3. **Provide Details:** Include any relevant details or examples to illustrate the enhancement.

### Your First Contribution

New to contributing? Start with these simple steps:

- **Documentation Improvements:** Help improve the documentation or fix typos.
- **Beginner-Friendly Issues:** Look for issues labeled `help wanted` or `good first issue`.

### Pull Requests

Contributions are made via pull requests (PRs). Follow these steps to submit a PR:

1. **Fork the Repository:** Click the "Fork" button at the top-right corner of the repository page.
2. **Clone Your Fork:**
    ```bash
    git clone https://github.com/yourusername/varietyz-bot.git
    ```
3. **Navigate to the Project Directory:**
    ```bash
    cd varietyz-bot
    ```
4. **Create a New Branch:**
    ```bash
    git checkout -b feature/YourFeatureName
    ```
5. **Make Your Changes:** Ensure your code adheres to the [Coding Guidelines](#coding-guidelines).
6. **Commit Your Changes:**
    ```bash
    git commit -m "Add: Description of your feature"
    ```
7. **Push to Your Fork:**
    ```bash
    git push origin feature/YourFeatureName
    ```
8. **Open a Pull Request:** Navigate to your fork on GitHub and click "Compare & pull request."

---

## Development Setup

Follow these steps to set up Varietyz Bot locally:

1. **Clone the Repository:**
    ```bash
    git clone https://github.com/yourusername/varietyz-bot.git
    ```
2. **Navigate to the Project Directory:**
    ```bash
    cd varietyz-bot
    ```
3. **Install Dependencies:**
    ```bash
    npm install
    ```
4. **Configure Environment Variables:**
    - Create a `.env` file in the root directory.
    - Add the necessary environment variables:
        ```
        DISCORD_TOKEN=your_discord_bot_token
        CLIENT_ID=your_discord_client_id
        GUILD_ID=your_discord_guild_id
        WOM_API_KEY=your_wise_old_man_api_key
        ```
5. **Run the Bot Locally:**
    ```bash
    npm start
    ```

_Ensure you have [Node.js](https://nodejs.org/) installed._

---

## Coding Guidelines

Adhering to consistent coding standards ensures the maintainability and readability of the project.

### Language and Framework

- **Language:** JavaScript (ES6+)
- **Framework:** [Discord.js](https://discord.js.org/)

### Style and Formatting

- **Linting:** Use [ESLint](https://eslint.org/) for identifying and fixing linting issues.
- **Formatting:** Use [Prettier](https://prettier.io/) for code formatting.
- **Configuration Files:**
    - `.eslintrc.js`: ESLint configuration.
    - `.eslintignore`: Files and directories to ignore for ESLint.
    - `jsdoc.json`: JSDoc configuration.

### Naming Conventions

- **Variables and Functions:** Use `camelCase`.
- **Classes:** Use `PascalCase`.
- **Constants:** Use `UPPER_SNAKE_CASE`.

### Documentation

- **JSDoc:** Document all functions, classes, and modules using JSDoc comments.
- **README:** Keep the `README.md` up-to-date with project information and usage instructions.

### Module Structure

Organize code into meaningful modules and directories:

- **src/**
    - **api/**: External API integrations.
        - `wise_old_man/`: Integration with Wise Old Man API.
    - **config/**: Configuration files and constants.
    - **data/**: Database files and related data.
    - **modules/**
        - **commands/**: Slash commands and related logic.
        - **processing/**: Scheduled tasks and processing functions.
        - **utils/**: Utility functions and helpers.
    - **tasks.js**: Task definitions.
    - **main.js**: Main entry point.
- **.vscode/**: VSCode-specific settings and scripts.

---

## Testing

Ensure your contributions maintain the integrity and functionality of the bot.

### Running Tests

Execute the test suite using:

```bash
npm test
```

### Writing Tests

- **Framework:** [Jest](https://jestjs.io/) is used for testing.
- **Test Files:** Place test files alongside their corresponding modules, following the naming convention `moduleName.test.js`.
- **Coverage:** Aim for comprehensive test coverage, focusing on critical functionality.

### Adding Tests

1. **Create a Test File:** In the same directory as the module you’re testing.
2. **Write Test Cases:** Use descriptive test names and cover various scenarios.
3. **Run Tests:** Ensure all tests pass before submitting a PR.

---

## Code Review Process

All pull requests are subject to review to maintain code quality and project standards.

### Automated Checks

- **Continuous Integration (CI):** Automated tests and linting run on each PR.
- **Status Indicators:** Ensure all checks pass before requesting a review.

### Manual Review

1. **Reviewers:** Maintainers will review the PR for functionality, code quality, and adherence to guidelines.
2. **Feedback:** Be open to feedback and make necessary revisions.
3. **Approval:** Once approved, the PR will be merged into the main branch.

### Merging

- **Squash and Merge:** To maintain a clean commit history, use the "Squash and merge" option.
- **Rebasing:** If necessary, rebase your branch with the latest `main` before merging.

---

## Licensing and Intellectual Property

By contributing, you agree to the following:

- **License:** Your contributions are licensed under the [BSD 2-Clause](LICENSE) license.
- **Original Work:** Ensure you have the rights to the code you contribute. Do not submit third-party or proprietary code without permission.

---

## Additional Guidelines

### API Key Management

- **Responsibility:** Manage your own API keys and ensure they are not exposed.
- **Prohibition:** Do not share API keys within the repository. Use environment variables to manage sensitive information.

### Bot Deployment Guidelines

- **Proper Configuration:** Follow best practices when deploying the bot, including secure configuration of environment variables.
- **Regular Updates:** Keep the bot updated to the latest version to benefit from security patches and new features.

### Data Usage Transparency

- **Clear Purpose:** Understand how data fetched from Discord and WoM APIs is used.
- **Opt-Out Options:** Respect user preferences regarding data tracking and ensure compliance with privacy standards.

### Compliance with Local Laws

- **Legal Obligations:** Ensure compliance with local data protection laws (e.g., GDPR) when deploying and using the bot in servers.

### Community Support

- **Resources:** Access available resources to learn more about responsible API usage and data privacy.
- **Help Channels:** Utilize dedicated channels for support and guidance on using Varietyz Bot responsibly.

---

## Contact

If you have any questions, suggestions, or need assistance, feel free to reach out:

- **Discord:** [@jaybane](https://discordapp.com/users/406828985696387081)
- **Email:** [jay.bane@outlook.com](mailto:jay.bane@outlook.com)

We're here to help and eager to hear your feedback!

---

Thank you for considering contributing to **Varietyz Bot**! Your efforts help make this project better for everyone.

---

# Final Notes

- **Consistency:** Ensure all contributions follow the outlined guidelines to maintain project quality.
- **Communication:** Maintain clear and respectful communication with maintainers and other contributors.
- **Continuous Improvement:** Regularly update documentation and guidelines as the project evolves.

Feel free to reach out if you have any questions or need further assistance!
