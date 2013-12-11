TESTS = test/*.test.js
REPORTER = spec
TIMEOUT = 5000
MOCHA_OPTS =
NODE_MODULES = ./node_modules
BIN = $(NODE_MODULES)/.bin

build: clean install
	@mkdir -p public/assets/stylesheets
	@$(BIN)/stylus \
		-c \
		-o public/assets/stylesheets \
		-u $(NODE_MODULES)/nib \
		app/assets/stylesheets/*

install:
	@npm install

debug:
	@NODE_ENV=development supervisor server

start: install
	@NODE_ENV=production node server

test: install test-unit test-cov

test-unit: install
	@NODE_ENV=test $(BIN)/mocha \
		--bail \
		--reporter $(REPORTER) \
		--timeout $(TIMEOUT) \
		$(MOCHA_OPTS) \
		$(TESTS)

test-cov:
	@rm -f coverage.html
	@$(MAKE) test-unit MOCHA_OPTS='--require blanket' REPORTER=html-cov > coverage.html
	@$(MAKE) test-unit MOCHA_OPTS='--require blanket' REPORTER=travis-cov

clean:
	rm -f coverage.html
	rm -rf public/assets

.PHONY: build install debug start test test-unit test-cov clean
