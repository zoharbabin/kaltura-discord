# Contributing to Kaltura-Discord Integration

Thank you for considering contributing to the Kaltura-Discord Integration project! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the issue tracker to avoid duplicates. When you create a bug report, include as many details as possible:

- Use a clear and descriptive title
- Describe the exact steps to reproduce the problem
- Describe the behavior you observed and what you expected to see
- Include screenshots or animated GIFs if possible
- Include details about your environment (OS, Node.js version, etc.)
- Use the bug report template if available

### Suggesting Enhancements

Enhancement suggestions are welcome! When creating an enhancement suggestion:

- Use a clear and descriptive title
- Provide a detailed description of the proposed enhancement
- Explain why this enhancement would be useful
- Include examples of how the feature would be used
- Use the feature request template if available

### Pull Requests

- Fill in the required template
- Follow the coding style and standards
- Include tests for new features or bug fixes
- Update documentation as needed
- Ensure all tests pass
- Link to any related issues

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file from `.env.example`
4. Run the setup script: `./setup-and-test.sh`
5. Start the development server: `npm run dev`

## Coding Guidelines

### Code Style

- Follow the ESLint configuration
- Use TypeScript features appropriately
- Write clear, descriptive variable and function names
- Add comments for complex logic
- Keep functions small and focused

### Testing

- Write tests for new features and bug fixes
- Ensure all tests pass before submitting a pull request
- Aim for good test coverage

### Documentation

- Update documentation for any changed functionality
- Document new features thoroughly
- Keep API documentation up-to-date

## Commit Guidelines

- Use clear, descriptive commit messages
- Reference issue numbers in commit messages when applicable
- Make small, focused commits rather than large, sweeping changes

## Pull Request Process

1. Update the README.md or documentation with details of changes if appropriate
2. Update the CHANGELOG.md with details of changes
3. The PR will be merged once it receives approval from maintainers

## Release Process

1. Update version numbers in package.json following [Semantic Versioning](https://semver.org/)
2. Update CHANGELOG.md with the new version and release notes
3. Create a new GitHub release with the version number and release notes

## Questions?

If you have any questions, feel free to open an issue or reach out to the maintainers.

Thank you for contributing to the Kaltura-Discord Integration project!