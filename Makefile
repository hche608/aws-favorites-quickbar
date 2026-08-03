.PHONY: clean compile bundle bundle-prod build-chrome build-firefox build-all dev test test-watch test-coverage test-verbose watch type-check lint lint-fix format format-check audit check-unused check-circular check-all security-check update help

# Clean build artifacts
clean:
	rm -rf dist/
	rm -rf coverage/

# Compile TypeScript
compile:
	npx tsc

# Bundle with esbuild (development mode with source maps)
bundle:
	npx tsx scripts/bundle.ts

# Bundle with esbuild (production mode, no source maps)
bundle-prod:
	NODE_ENV=production npx tsx scripts/bundle.ts

# Build for Chrome (production)
build-chrome: clean
	./scripts/build-chrome.sh

# Build for Firefox (production)
build-firefox: clean
	./scripts/build-firefox.sh

# Build for all browsers (production)
build-all: clean build-chrome build-firefox

# Development build (with source maps)
dev: clean bundle

# Run tests
test: clean
	npx jest

# Run tests in watch mode
test-watch: clean
	npx jest --watch

# Run tests with coverage
test-coverage: clean
	npx jest --coverage

# Run tests with verbose output
test-verbose: clean
	npx jest --verbose

# Watch mode for TypeScript compilation
watch: clean
	npx tsc --watch

# Type check without emitting files
type-check: clean
	npx tsc --noEmit

# Run ESLint
lint: clean
	npx eslint src/**/*.ts

# Auto-fix ESLint issues
lint-fix: clean
	npx eslint src/**/*.ts --fix

# Format code with Prettier
format:
	npx prettier --write "src/**/*.ts" "tests/**/*.ts" "scripts/**/*.ts" "*.ts"

# Check code formatting
format-check:
	npx prettier --check "src/**/*.ts" "tests/**/*.ts" "scripts/**/*.ts" "*.ts"

# Check for security vulnerabilities
audit:
	npm audit

# Check for unused exports
check-unused:
	npx ts-prune

# Check for circular dependencies
check-circular:
	npx madge --circular --extensions ts src/

# Run all checks (type + lint + format + test)
check-all: type-check lint format-check test

# Run comprehensive security check
security-check:
	npx tsx scripts/security-check.ts

# Update all node dependencies to latest
update:
	npx npm-check-updates -u
	npm install --legacy-peer-deps
	npm audit fix --legacy-peer-deps

# Display help
help:
	@echo "AWS Favorites Quickbar - Makefile Commands"
	@echo ""
	@echo "Build Commands:"
	@echo "  make clean              - Remove build artifacts (dist/ and coverage/)"
	@echo "  make compile            - Compile TypeScript to JavaScript"
	@echo "  make bundle             - Bundle with esbuild (development mode with source maps)"
	@echo "  make bundle-prod        - Bundle with esbuild (production mode, no source maps)"
	@echo "  make build-chrome       - Build Chrome extension (production)"
	@echo "  make build-firefox      - Build Firefox extension (production)"
	@echo "  make build-all          - Build for both browsers (production)"
	@echo "  make dev                - Development build with source maps"
	@echo ""
	@echo "Development Commands:"
	@echo "  make watch              - Watch mode for TypeScript compilation"
	@echo "  make type-check         - Type check without emitting files"
	@echo ""
	@echo "Testing Commands:"
	@echo "  make test               - Run all tests"
	@echo "  make test-watch         - Run tests in watch mode"
	@echo "  make test-coverage      - Run tests with coverage report"
	@echo "  make test-verbose       - Run tests with verbose output"
	@echo ""
	@echo "Code Quality Commands:"
	@echo "  make lint               - Run ESLint on source files"
	@echo "  make lint-fix           - Auto-fix ESLint issues"
	@echo "  make format             - Format code with Prettier"
	@echo "  make format-check       - Check code formatting without modifying"
	@echo ""
	@echo "Security & Analysis Commands:"
	@echo "  make audit              - Check for npm security vulnerabilities"
	@echo "  make check-unused       - Check for unused exports"
	@echo "  make check-circular     - Check for circular dependencies"
	@echo "  make check-all          - Run all checks (type + lint + format + test)"
	@echo "  make security-check     - Run comprehensive security check"
	@echo ""
	@echo "Maintenance Commands:"
	@echo "  make update             - Update all node dependencies to latest"
	@echo ""
	@echo "Help:"
	@echo "  make help               - Display this help message"
