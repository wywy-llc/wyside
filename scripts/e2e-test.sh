#!/usr/bin/env bash


set -e

# E2E Test Execution Script
# Runs integration tests in the test project

echo "🧪 Starting E2E Test Execution..."

# Check if test project exists
TEST_DIR="test-projects/todo-app"
if [ ! -d "$TEST_DIR" ]; then
  echo "❌ Test project not found!"
  echo "Please run 'npm run test:e2e:init' first to initialize the test project."
  exit 1
fi

# Navigate to test project
cd "$TEST_DIR"

# Check if secrets are configured
echo ""
echo "🔐 Checking configuration..."

if [ ! -f "secrets/service-account.json" ]; then
  echo "⚠️  Warning: secrets/service-account.json not found"
  echo "   Please configure your service account credentials"
fi

if [ ! -f ".env" ]; then
  echo "⚠️  Warning: .env file not found"
  echo "   Please create .env with the following variables:"
  echo "   - GCP_PROJECT_ID"
  echo "   - APP_SPREADSHEET_ID_1_DEV"
  echo "   - GOOGLE_APPLICATION_CREDENTIALS"
fi

# Deploy to GAS first to initialize the spreadsheet
echo ""
echo "📤 Step 1: Deploying to Google Apps Script..."
npm run deploy

# Check deploy results
if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Deployment failed!"
  exit 1
fi

echo ""
echo "✅ Deployment successful!"
echo ""
echo "📋 Manual Step Required:"
echo "  1. Open the Spreadsheet (URL from init output)"
echo "  2. Reload the page to trigger onOpen() and initialize sheets"
echo "  3. Check for 'Wyside Todo' menu"
echo ""

# Run tests
echo ""
echo "🧪 Step 2: Running integration tests..."
npm test

# Check test results
if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Tests failed!"
  exit 1
fi

echo ""
echo "✅ All tests passed!"
echo ""
echo "📋 Final Verification (Optional):"
echo "  1. In the Spreadsheet, click 'Wyside Todo' > 'Show Todos'"
echo "  2. Verify the sidebar shows todos"
echo "  3. Try adding/toggling/deleting todos via the UI"
