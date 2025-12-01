.PHONY: clean compile bundle build-chrome build-firefox build-all test test-coverage watch type-check lint lint-fix format format-check audit check-circular check-all security-check help

# Clean build artifacts
clean:
	rm -rf dist/
	rm -rf coverage/

# Compile TypeScript
compile:
	npx tsc

# Bundle with esbuild
bundle:
	npx tsx scripts/bundle.ts

# Build for Chrome
build-chrome: clean
	./scripts/build-chrome.sh

# Build for Firefox  
build-firefox: clean
	./scripts/build-firefox.sh

# Build for all browsers
build-all: build-chrome build-firefox

# Run tests
test:
	npm test

# Run tests with coverage
test-coverage:
	npm run test:coverage

# Watch mode for development
watch:
	npx tsc --watch

# Type check without emitting files
type-check:
	npx tsc --noEmit

# Run ESLint
lint:
	npm run lint

# Auto-fix ESLint issues
lint-fix:
	npm run lint:fix

# Format code with Prettier
format:
	npm run format

# Check code formatting
format-check:
	npm run format:check

# Check for security vulnerabilities
audit:
	npm audit

# Check for circular dependencies
check-circular:
	npm run check:circular

# Run all checks (type + lint + format + test)
check-all:
	npm run check:all

# Run comprehensive security check
security-check:
	npm run security-check

# Display help
help:
	@echo "AWS Favorites Quickbar - Makefile Commands"
	@echo ""
	@echo "Build Commands:"
	@echo "  make clean              - Remove build artifacts"
	@echo "  make compile            - Compile TypeScript to JavaScript"
	@echo "  make bundle             - Bundle with esbuild"
	@echo "  make build-chrome       - Build Chrome extension"
	@echo "  make build-firefox      - Build Firefox extension"
	@echo "  make build-all          - Build for both browsers"
	@echo ""
	@echo "Development Commands:"
	@echo "  make watch              - Watch mode for TypeScript"
	@echo "  make type-check         - Type check without emitting"
	@echo ""
	@echo "Testing Commands:"
	@echo "  make test               - Run all tests"
	@echo "  make test-coverage      - Run tests with coverage"
	@echo ""
	@echo "Code Quality Commands:"
	@echo "  make lint               - Run ESLint"
	@echo "  make lint-fix           - Auto-fix ESLint issues"
	@echo "  make format             - Format code with Prettier"
	@echo "  make format-check       - Check code formatting"
	@echo ""
	@echo "Security Commands:"
	@echo "  make audit              - Check for vulnerabilities"
	@echo "  make check-circular     - Check for circular dependencies"
	@echo "  make check-all          - Run all checks"
	@echo "  make security-check     - Comprehensive security check"
	@echo ""
	@echo "Help:"
	@echo "  make help               - Display this help message"
