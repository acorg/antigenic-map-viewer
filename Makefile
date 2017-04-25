# -*- Makefile -*-
# Eugene Skepner 2015
# ----------------------------------------------------------------------

MAKEFLAGS = -w

# override in command line
ifneq ($(findstring install,$(MAKECMDGOALS)),)
ifeq ($(ANTIGENIC_MAP_VIEWER_INSTALL),)
  $(error ANTIGENIC_MAP_VIEWER_INSTALL not set)
endif
endif

# ----------------------------------------------------------------------

AMV_TEST = amv-config.js test-3d.ts test.less test-3d.json test-2d.ts test-3d.html test-2d.html
AMV_LIB = acmacs-plot-data.ts amv-level1.ts amv-level2.ts \
	  amv-manipulator.ts amv-manipulator-2d.ts amv-manipulator-3d.ts amv-2d.ts amv-3d.ts \
	  amv-utils.ts acmacs-toolkit.ts amv-state.ts
AMV_LESS = acmacs-toolkit.less amv.less
AMV_TYPINGS = antigenic-map-viewer.d.ts
AMV_FONTS = fonts/helvetiker_regular.typeface.js fonts/helvetiker_bold.typeface.js

EXTERNAL_JS = require.js jquery.js jquery.mousewheel.js jquery-ui.js three.js css.js json.js text.js
EXTERNAL_CSS = jquery-ui.css

AMV = $(AMV_LIB) $(AMV_TEST)

TSC_RUN = $(shell which tsc || echo "/usr/bin/env PATH=$$HOME/c2r/bin:$$PATH tsc")
LESSC = $(shell which lessc || echo "/usr/bin/env PATH=$$HOME/c2r/bin:$$PATH lessc")

# ----------------------------------------------------------------------

TARGET_JS = $(TS_TO_JS) $(patsubst %.js,$(DIST)/%.js,$(filter %.js,$(AMV))) $(patsubst %.json,$(DIST)/%.json,$(filter %.json,$(AMV))) $(patsubst fonts/%.js,$(DIST)/%.js,$(AMV_FONTS)) $(patsubst %.js,$(DIST)/%.js,$(EXTERNAL_JS))
TARGET_CSS = $(patsubst %.less,$(DIST)/%.css,$(filter %.less,$(AMV))) $(patsubst %.css,$(DIST)/%.css,$(EXTERNAL_CSS))
TARGET_HTML = $(patsubst %,$(DIST)/%,$(filter %.html,$(AMV)))

# ----------------------------------------------------------------------

TS_TO_JS = $(patsubst %.ts,$(DIST)/%.js,$(filter %.ts,$(AMV)))

INSTALL_FILES = $(patsubst %.ts,$(DIST)/%.js,$(filter %.ts,$(AMV_LIB))) \
		$(AMV_LESS) $(patsubst fonts/%.js,$(DIST)/%.js,$(AMV_FONTS))

VERSION = $(shell cat VERSION.txt)
PKG_CONFIG_PATH = $(firstword $(subst :, ,$(shell pkg-config --variable pc_path pkg-config)))

# ----------------------------------------------------------------------

DIST = dist

all: $(TARGET_JS) $(TARGET_CSS) $(TARGET_HTML) $(DIST)/images
	@#echo 'rebuilt  ' $?
	@#echo 'all      ' $^
	@#echo 'TARGET_JS' $(TARGET_JS)

# ----------------------------------------------------------------------

test: all
ifeq ($(shell uname -s),Darwin)
	open $(TARGET_HTML)
endif

install: all
	/usr/bin/install -d -m 0755 $(ANTIGENIC_MAP_VIEWER_INSTALL)
	/usr/bin/install -vC -m 0644 $(INSTALL_FILES) $(AMV_TYPINGS) $(ANTIGENIC_MAP_VIEWER_INSTALL)

clean:
	rm -rf $(DIST) $(BUILD)

# ----------------------------------------------------------------------

RELPATH = $(shell python -c "import os, sys; sys.stdout.write(os.path.relpath('${1}', '${2}'))")

# ----------------------------------------------------------------------

$(DIST)/%.js: %.ts | $(DIST) $(LIB_JS)
	$(TSC_RUN) -m amd --removeComments -t ES5 --lib DOM,ES5,ScriptHost,ES2015.Iterable --noEmitOnError --noImplicitAny --outDir $(DIST) $<

$(DIST)/%.js: %.js | $(DIST)
	ln -s $(call RELPATH,$(dir $^),$(dir $@))/$^ $@

$(DIST)/%.js: %.js.in | $(DIST)
	sed 's/{REQUIRE-JQUERY-PATH}/./' $^ >$@

$(DIST)/%.js: fonts/%.js | $(DIST)
	ln -s $(call RELPATH,$(dir $^),$(dir $@))/$(notdir $^) $@

$(DIST)/%.json: %.json | $(DIST)
	ln -s $(call RELPATH,$(dir $^),$(dir $@))/$^ $@

$(DIST)/%.css: %.less $(AMV_LESS) | $(DIST)
	$(LESSC) $< $@

# Have to copy html to dist, Firefox does not like symbolic links
$(DIST)/%.html: %.html | $(DIST)
	cp $^ $@

$(DIST)/%.js: external/%.js | $(DIST)
	ln -sf $(call RELPATH,$(dir $^),$(dir $@))/$(notdir $^) $@

$(DIST)/%.css: external/%.css | $(DIST)
	ln -sf $(call RELPATH,$(dir $^),$(dir $@))/$(notdir $^) $@

$(DIST)/images: external/images | $(DIST)
	ln -sf $(call RELPATH,$(dir $^),$(dir $@))/$(notdir $^) $@

# ----------------------------------------------------------------------

$(DIST):
	$(call make_target_dir,$(DIST),DIST)

define make_target_dir
  @if [ -z "$(1)" ]; then echo $(2) is not set >&2; exit 1; fi
  @if [ ! -d $(1) ]; then mkdir -p $(1); fi
endef
