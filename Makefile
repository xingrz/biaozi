TESTS = test/*.test.js
REPORTER = spec
TIMEOUT = 5000
MOCHA_OPTS =
NODE_MODULES = ./node_modules
BIN = $(NODE_MODULES)/.bin

build: build-css build-js

build-css: install
	rm -rf public/assets/css
	mkdir -p public/assets/css
	$(BIN)/stylus \
		-c \
		-o public/assets/css \
		-u $(NODE_MODULES)/nib \
		app/assets/css/*

build-js: install
	rm -rf public/assets/js
	mkdir -p public/assets/js
	cd app/assets/js && for i in *.js; do (\
		../../../$(BIN)/uglifyjs $$i \
		--mangle \
		--compress \
		--output ../../../public/assets/js/$$i \
	); done

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
