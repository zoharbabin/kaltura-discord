# Pre-Deployment Testing Script

This file contains the script for running tests before deployment. Copy this content to a file named `test-before-deploy.sh` in the project root and make it executable with `chmod +x test-before-deploy.sh`.

```bash
#!/bin/bash
# test-before-deploy.sh - Pre-deployment testing script

# Run tests for main Discord bot
echo "Running tests for main Discord bot..."
npm run test

# Run ESLint
echo "Running ESLint..."
npm run lint

# Check TypeScript compilation
echo "Checking TypeScript compilation..."
npm run build -- --noEmit

# Run end-to-end tests
echo "Running end-to-end tests..."
npm run test:e2e

# If any command fails, exit with error
if [ $? -ne 0 ]; then
  echo "Tests failed! Aborting deployment."
  exit 1
fi

echo "All tests passed! Ready for deployment."
```

## Usage

1. Run the script before deployment: `./test-before-deploy.sh`
2. If all tests pass, proceed with deployment using either `deploy-dev.sh` or `deploy-prod.sh`

## Integration with Deployment Scripts

You can modify the deployment scripts to run the tests automatically before deployment:

```bash
#!/bin/bash
# Example integration with deploy-prod.sh

# Run tests first
./test-before-deploy.sh

# If tests failed, the script will exit here
# Otherwise, continue with deployment

# Load environment variables
source .env.production

# Rest of the deployment script...
```

## Continuous Integration

This script can also be integrated into a CI/CD pipeline, such as GitHub Actions:

```yaml
name: Test and Deploy

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: ./test-before-deploy.sh

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: success()
    steps:
      - uses: actions/checkout@v2
      - name: Set up Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Deploy to production
        run: ./deploy-prod.sh